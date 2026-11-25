"""Build public/data/<city>.json from Overture Maps Places + each venue's own og:image.

Runs in GitHub Actions (open internet). No key, no account, no bill:
- Overture Maps Places is open data read anonymously from its public S3 bucket.
- The photo is the share image the venue publishes on its OWN website (og:image /
  twitter:image) — the picture it chose to represent itself in link previews. Logos and
  favicons are refused. Hotlinked, never re-hosted; a venue that asks is removed.
"""
import concurrent.futures as cf, html, json, os, re, subprocess, sys, time, urllib.parse, urllib.request
import duckdb

CITIES = {  # name: (xmin, ymin, xmax, ymax)
    "cape-town": (18.30, -34.15, 18.75, -33.75),
    "johannesburg": (27.85, -26.35, 28.20, -26.00),
    "durban": (30.90, -29.95, 31.10, -29.75),
}
FOOD = ["restaurant", "cafe", "coffee", "bar", "pub", "bakery", "bistro", "brewery",
        "winery", "pizza", "sushi", "steakhouse", "diner", "gastropub", "tapas", "deli",
        "brasserie", "food_truck", "dessert", "ice_cream", "tea_room", "lounge", "night_club"]
NOT_FOOD = ["barber", "bar_and_grill_supply", "embassy", "bank", "barrister"]
# Mirrors FOODISH / NOT_FOODISH in src/cityData.ts — keep the two in step.
FOODISH = re.compile(r"restaurant|cafe|coffee|(^|_)bar(_|$)|pub|bakery|bistro|brewery|winery|diner|deli|gastropub|brasserie|food_truck|dessert|ice_cream|tea_room|lounge|night_club|juice|steakhouse|pizza|sushi|tavern|pancake|bagel|creperie|food_court|beer_garden|taproom")
NOT_FOODISH = re.compile(r"garbage|post_office|courier|shipping|delivery|catering|supply|utility|plaza|transit|barber")


def latest_release() -> str:
    out = subprocess.run(["aws", "s3", "ls", "--no-sign-request", "s3://overturemaps-us-west-2/release/"],
                         capture_output=True, text=True, check=True).stdout
    rels = sorted(re.findall(r"PRE (\S+)/", out))
    return rels[-1]


def _ld_blocks(page: str):
    """Every schema.org object the venue publishes in its own <script type=application/ld+json>."""
    out = []
    for raw in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', page, re.S | re.I):
        try:
            data = json.loads(html.unescape(raw.strip()))
        except Exception:
            continue
        stack = data if isinstance(data, list) else [data]
        while stack:
            d = stack.pop()
            if isinstance(d, dict):
                if "@graph" in d:
                    stack.extend(d["@graph"] if isinstance(d["@graph"], list) else [d["@graph"]])
                out.append(d)
            elif isinstance(d, list):
                stack.extend(d)
    return out


VENUE_TYPES = re.compile(r"Restaurant|FoodEstablishment|CafeOrCoffeeShop|BarOrPub|Bakery|Brewery|Winery|LocalBusiness|IceCreamShop|FastFoodRestaurant", re.I)
DAY = {"monday": "Mo", "tuesday": "Tu", "wednesday": "We", "thursday": "Th", "friday": "Fr", "saturday": "Sa", "sunday": "Su"}


def _hours_from_spec(specs) -> str | None:
    """openingHoursSpecification → OSM grammar (`Mo 08:00-17:00; Tu …`), which the app
    already parses for open-now. Anything it can't express cleanly is dropped, not guessed."""
    rules = []
    for sp in specs if isinstance(specs, list) else [specs]:
        if not isinstance(sp, dict):
            continue
        days = sp.get("dayOfWeek")
        days = days if isinstance(days, list) else [days]
        o, c = str(sp.get("opens") or "")[:5], str(sp.get("closes") or "")[:5]
        if not re.fullmatch(r"\d{2}:\d{2}", o) or not re.fullmatch(r"\d{2}:\d{2}", c):
            continue
        for d in days:
            k = DAY.get(str(d or "").rsplit("/", 1)[-1].lower())
            if k:
                rules.append(f"{k} {o}-{c}")
    return "; ".join(rules) or None


def page_facts(url: str) -> dict:
    """What the venue says about itself on its own website: share photo, one-line description,
    and — when it publishes schema.org markup — hours, price range, cuisine, menu link and
    whether it takes bookings. Self-published ratings are ignored: a venue grading itself is
    not evidence."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; whats-good/1.0)"})
        with urllib.request.urlopen(req, timeout=7) as r:
            if "html" not in (r.headers.get("Content-Type") or ""):
                return {}
            page = r.read(600_000).decode("utf-8", "ignore")
            final = r.geturl()
    except Exception:
        return {}
    facts: dict = {}

    def meta(*props):
        for prop in props:
            m = (re.search(r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]*content=["\']([^"\']+)' % re.escape(prop), page, re.I)
                 or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']%s["\']' % re.escape(prop), page, re.I))
            if m:
                return html.unescape(m.group(1).strip())
        return None

    img = meta("og:image:secure_url", "og:image", "twitter:image")
    if img:
        img = urllib.parse.urljoin(final, img)
        # Site-wide share cards and banners are usually text on a background, not a photograph
        # of the place; on a food app they read as a screenshot of a website.
        if img.startswith("http") and not re.search(
                r"logo|favicon|icon|placeholder|default|banner|header|slider|slide[-_]|screenshot|og[-_]?image|social|share|fb[-_]|twitter|seo|thumbnail[-_]default", img, re.I):
            facts["photo"] = img.replace("http://", "https://", 1)
    desc = meta("og:description", "description", "twitter:description")
    # Boilerplate ("Just another WordPress site", cookie notices) is not a description.
    if desc and 30 <= len(desc) <= 400 and not re.search(r"wordpress|wix|squarespace|cookie|lorem", desc, re.I):
        facts["about"] = re.sub(r"\s+", " ", desc)

    for d in _ld_blocks(page):
        t = d.get("@type")
        t = " ".join(t) if isinstance(t, list) else str(t or "")
        if not VENUE_TYPES.search(t):
            continue
        hrs = _hours_from_spec(d.get("openingHoursSpecification")) if d.get("openingHoursSpecification") else None
        if not hrs and isinstance(d.get("openingHours"), (str, list)):
            oh = d["openingHours"]
            hrs = "; ".join(oh) if isinstance(oh, list) else oh
            if not re.fullmatch(r"[A-Za-z ,:\-;0-9]+", hrs or ""):
                hrs = None
        if hrs:
            facts.setdefault("hours", hrs)
        pr = d.get("priceRange")
        if isinstance(pr, str) and 0 < len(pr) <= 24:
            facts.setdefault("price", pr.strip())
        sc = d.get("servesCuisine")
        if sc:
            facts.setdefault("cuisines", [c for c in (sc if isinstance(sc, list) else [sc]) if isinstance(c, str)][:4])
        menu = d.get("hasMenu") or d.get("menu")
        if isinstance(menu, dict):
            menu = menu.get("url")
        if isinstance(menu, str) and menu.startswith("http"):
            facts.setdefault("menu", menu)
        ar = d.get("acceptsReservations")
        if ar in (True, "True", "true", "Yes", "yes"):
            facts.setdefault("bookings", True)
    return facts


OSM_KEEP = ("opening_hours", "cuisine", "outdoor_seating", "diet:vegan", "diet:vegetarian", "diet:halal",
            "wheelchair", "reservation", "takeaway", "delivery", "internet_access", "smoking")
# Public Overpass servers are often busy (502s, timeouts). Try each, twice, with a pause:
# a city without OSM tags still builds, it just has fewer hours and details.
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
            "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]


def osm_tags(box) -> list[dict]:
    """Every named food or drink place in the box from OpenStreetMap, with the tags locals
    maintain — hours, cuisine, outdoor seating, vegan options. One request per city."""
    xmin, ymin, xmax, ymax = box
    q = f"""[out:json][timeout:90];
      nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten)$"]["name"]({ymin},{xmin},{ymax},{xmax});
      out center tags qt;"""
    deadline = time.time() + 360  # at most ~6 minutes per city, so the weekly job stays inside its limit
    for attempt, url in enumerate(OVERPASS * 2):
        if time.time() > deadline:
            break
        if attempt:
            time.sleep(15)
        try:
            data = urllib.parse.urlencode({"data": q}).encode()
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "whats-good/1.0"})
            with urllib.request.urlopen(req, timeout=100) as r:
                els = json.load(r).get("elements", [])
            out = []
            for e in els:
                lat = e.get("lat") or (e.get("center") or {}).get("lat")
                lon = e.get("lon") or (e.get("center") or {}).get("lon")
                if lat is None:
                    continue
                out.append({"name": e["tags"]["name"], "lat": lat, "lon": lon,
                            **{k: v for k, v in e["tags"].items() if k in OSM_KEEP}})
            print("osm", len(out), "places from", url)
            return out
        except Exception as ex:
            print("overpass failed", url, ex)
    return []


def _norm(n: str) -> str:
    return re.sub(r"[^a-z0-9]", "", re.sub(r"\b(the|restaurant|cafe|café|bar|grill|and|&)\b", "", n.lower()))


def match_osm(venues: list[dict], osm: list[dict]) -> int:
    """Same place = same normalised name within ~150 m. Name alone would merge every branch of
    a chain; distance alone would merge neighbours. Both, or no match."""
    import math
    grid: dict = {}
    for o in osm:
        grid.setdefault(_norm(o["name"]), []).append(o)
    hit = 0
    for v in venues:
        best = None
        for o in grid.get(_norm(v["name"]), []):
            dy = (o["lat"] - v["lat"]) * 111_000
            dx = (o["lon"] - v["lon"]) * 111_000 * math.cos(math.radians(v["lat"]))
            d = math.hypot(dx, dy)
            if d < 150 and (best is None or d < best[0]):
                best = (d, o)
        if best:
            o = best[1]
            osm_facts = {k: o[k] for k in OSM_KEEP if k in o}
            if osm_facts:
                v["osm"] = osm_facts
                hit += 1
    return hit


def build(release: str, slug: str, box) -> None:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    src = f"read_parquet('s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*', hive_partitioning=1)"
    cols = {r[0]: r[1] for r in con.execute(f"DESCRIBE SELECT * FROM {src}").fetchall()}
    print("columns:", {k: v[:60] for k, v in cols.items()})
    # Overture renamed its category field across releases; use the FINEST one this release
    # carries. `basic_category` is a coarse bucket ("restaurant") and preferring it collapsed
    # every pizza, sushi and steak house into one word, so no occasion tile could match them.
    if "taxonomy" in cols:
        cat = "taxonomy.primary"
    elif "categories" in cols:
        cat = "categories.primary"
    else:
        cat = "basic_category"
    pick = lambda name, expr: expr if name in cols else "NULL"
    like = " OR ".join(f"lower({cat}) LIKE '%{w}%'" for w in FOOD)
    notlike = " AND ".join(f"lower({cat}) NOT LIKE '%{w}%'" for w in NOT_FOOD)
    xmin, ymin, xmax, ymax = box
    rows = con.execute(f"""
      SELECT id, names.primary, {cat}, {pick('confidence', 'confidence')},
             {pick('websites', 'websites[1]')}, {pick('phones', 'phones[1]')},
             {pick('addresses', 'addresses[1].freeform')}, {pick('addresses', 'addresses[1].locality')},
             (bbox.xmin + bbox.xmax) / 2, (bbox.ymin + bbox.ymax) / 2,
             {pick('socials', 'socials[1]')}
      FROM {src}
      WHERE bbox.xmin > {xmin} AND bbox.xmax < {xmax} AND bbox.ymin > {ymin} AND bbox.ymax < {ymax}
        AND names.primary IS NOT NULL AND {cat} IS NOT NULL
        AND ({like}) AND ({notlike}) AND coalesce({pick('confidence', 'confidence')}, 1) >= 0.7
        AND coalesce({pick('operating_status', 'operating_status')}, 'open') = 'open'
      ORDER BY coalesce({pick('confidence', 'confidence')}, 1) DESC LIMIT 2500
    """).fetchall()
    # LIKE '%bar%' also matches "garbage_collection_service"; the regex is the real gate.
    rows = [r for r in rows if FOODISH.search(r[2]) and not NOT_FOODISH.search(r[2])][:1500]
    venues = [dict(id=r[0], name=r[1], category=r[2], confidence=round(r[3], 2) if r[3] is not None else None, website=r[4], phone=r[5],
                   address=", ".join(x for x in (r[6], r[7]) if x), lon=round(r[8], 6), lat=round(r[9], 6),
                   social=r[10]) for r in rows]
    with cf.ThreadPoolExecutor(32) as ex:
        futs = {ex.submit(page_facts, v["website"]): v for v in venues if v["website"]}
        for f in cf.as_completed(futs):
            futs[f].update(f.result())
    print(slug, "osm matches:", match_osm(venues, osm_tags(box)))
    for k in ("about", "hours", "price", "menu", "cuisines", "bookings"):
        print(" ", k, sum(1 for v in venues if k in v))
    venues = [{k: v for k, v in x.items() if v not in (None, "")} for x in venues]
    os.makedirs("public/data", exist_ok=True)
    with open(f"public/data/{slug}.json", "w") as fh:
        json.dump({"source": f"Overture Maps Places {release}", "count": len(venues), "venues": venues},
                  fh, ensure_ascii=False, separators=(",", ":"))
    print(slug, len(venues), "venues,", sum(1 for v in venues if "photo" in v), "with photos")


if __name__ == "__main__":
    rel = latest_release()
    print("release", rel)
    for slug, box in CITIES.items():
        build(rel, slug, box)
