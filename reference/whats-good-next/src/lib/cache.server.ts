/**
 * Server-only cache + spend guard shared by every paid or rate-limited lookup.
 * Nothing in here may be imported from client code.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

async function admin(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const db = await admin();
    const { data } = await db
      .from("api_cache")
      .select("payload, expires_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    if (new Date(data.expires_at as string).getTime() < Date.now()) return null;
    return data.payload as T;
  } catch (error) {
    console.error("cache read failed", error);
    return null;
  }
}

export async function writeCache(
  key: string,
  provider: string,
  payload: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    const db = await admin();
    await db.from("api_cache").upsert({
      cache_key: key,
      provider,
      payload: payload as never,
      expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    });
  } catch (error) {
    console.error("cache write failed", error);
  }
}

/**
 * Returns false when today's budget for a provider is used up, so callers can
 * degrade to cached or sample data instead of billing another request.
 */
export async function withinBudget(provider: string, dailyLimit: number): Promise<boolean> {
  try {
    const db = await admin();
    const { data, error } = await db.rpc("consume_api_budget", {
      _provider: provider,
      _limit: dailyLimit,
    });
    if (error) {
      console.error("budget check failed", error);
      return true;
    }
    return data === true;
  } catch (error) {
    console.error("budget check failed", error);
    return true;
  }
}
