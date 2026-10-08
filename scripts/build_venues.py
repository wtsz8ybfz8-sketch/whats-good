"""Build public/data/<city>.json from Overture Maps Places + each venue's own og:image.

Runs in GitHub Actions (open internet). No key, no account, no bill:
- Overture Maps Places is open data read anonymously from its public S3 bucket.
- The photo is the share image the venue publishes on its OWN website (og:image /
  twitter:image) — the picture it chose to represent itself in link previews. Logos and
  favicons are refused. Hotlinked, never re-hosted; a venue that asks is removed.
"""
import concurrent.futures as cf, html, json, re, subprocess, sys, urllib.parse, urllib.request
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


def latest_release() -> str:
    out = subprocess.run(["aws", "s3", "ls", "--no-sign-request", "s3://overturemaps-us-west-2/release/"],
                         capture_output=True, text=True, check=True).stdout
    rels = sorted(re.findall(r"PRE (\S+)/", out))
    return rels[-1]


def og_image(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; whats-good/1.0)"})
        with urllib.request.urlopen(req, timeout=7) as r:
            if "html" not in (r.headers.get("Content-Type") or ""):
                return None
            page = r.read(400_000).decode("utf-8", "ignore")
            final = r.geturl()
    except Exception:
        return None
    for prop in ("og:image:secure_url", "og:image", "twitter:image"):
        m = (re.search(r'<meta[^>]+(?:property|name)=["\']%s["\'][^>]*content=["\']([^"\']+)' % re.escape(prop), page, re.I)
             or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name)=["\']%s["\']' % re.escape(prop), page, re.I))
        if m:
            img = urllib.parse.urljoin(final, html.unescape(m.group(1).strip()))
            if img.startswith("http") and not re.search(r"logo|favicon|icon|placeholder|default", img, re.I):
                return img.replace("http://", "https://", 1)
    return None


def build(release: str, slug: str, box) -> None:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    like = " OR ".join(f"lower(categories.primary) LIKE '%{w}%'" for w in FOOD)
    notlike = " AND ".join(f"lower(categories.primary) NOT LIKE '%{w}%'" for w in NOT_FOOD)
    xmin, ymin, xmax, ymax = box
    rows = con.execute(f"""
      SELECT id, names.primary, categories.primary, confidence,
             websites[1], phones[1], addresses[1].freeform, addresses[1].locality,
             (bbox.xmin + bbox.xmax) / 2, (bbox.ymin + bbox.ymax) / 2,
             socials[1]
      FROM read_parquet('s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*', hive_partitioning=1)
      WHERE bbox.xmin > {xmin} AND bbox.xmax < {xmax} AND bbox.ymin > {ymin} AND bbox.ymax < {ymax}
        AND names.primary IS NOT NULL AND categories.primary IS NOT NULL
        AND ({like}) AND ({notlike}) AND confidence >= 0.7
      ORDER BY confidence DESC LIMIT 1500
    """).fetchall()
    venues = [dict(id=r[0], name=r[1], category=r[2], confidence=round(r[3], 2), website=r[4], phone=r[5],
                   address=", ".join(x for x in (r[6], r[7]) if x), lon=round(r[8], 6), lat=round(r[9], 6),
                   social=r[10]) for r in rows]
    with cf.ThreadPoolExecutor(32) as ex:
        futs = {ex.submit(og_image, v["website"]): v for v in venues if v["website"]}
        for f in cf.as_completed(futs):
            img = f.result()
            if img:
                futs[f]["photo"] = img
    venues = [{k: v for k, v in x.items() if v not in (None, "")} for x in venues]
    with open(f"public/data/{slug}.json", "w") as fh:
        json.dump({"source": f"Overture Maps Places {release}", "count": len(venues), "venues": venues},
                  fh, ensure_ascii=False, separators=(",", ":"))
    print(slug, len(venues), "venues,", sum(1 for v in venues if "photo" in v), "with photos")


if __name__ == "__main__":
    rel = latest_release()
    print("release", rel)
    for slug, box in CITIES.items():
        build(rel, slug, box)
