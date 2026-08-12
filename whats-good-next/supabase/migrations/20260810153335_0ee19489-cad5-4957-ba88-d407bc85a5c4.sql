REVOKE ALL ON FUNCTION public.consume_api_budget(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_budget(TEXT, INTEGER) TO service_role;