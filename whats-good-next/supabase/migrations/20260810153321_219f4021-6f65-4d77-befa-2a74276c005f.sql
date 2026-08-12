CREATE TABLE public.api_cache (
  cache_key TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX api_cache_expires_at_idx ON public.api_cache (expires_at);
GRANT ALL ON public.api_cache TO service_role;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.api_budget (
  day DATE NOT NULL,
  provider TEXT NOT NULL,
  calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, provider)
);
GRANT ALL ON public.api_budget TO service_role;
ALTER TABLE public.api_budget ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_api_budget(_provider TEXT, _limit INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  used INTEGER;
BEGIN
  INSERT INTO public.api_budget (day, provider, calls)
  VALUES (CURRENT_DATE, _provider, 1)
  ON CONFLICT (day, provider) DO UPDATE SET calls = public.api_budget.calls + 1
  RETURNING calls INTO used;
  RETURN used <= _limit;
END;
$$;

CREATE TABLE public.saved_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('venue', 'recipe')),
  ref_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_items TO authenticated;
GRANT ALL ON public.saved_items TO service_role;
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own saved items"
  ON public.saved_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);