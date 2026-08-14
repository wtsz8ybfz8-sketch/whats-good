import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type SavedItem = {
  id: string;
  kind: "venue" | "recipe";
  refId: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
};

const itemSchema = z.object({
  kind: z.enum(["venue", "recipe"]),
  refId: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).nullable().default(null),
  imageUrl: z.string().url().max(2000).nullable().default(null),
});

export const listSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedItem[]> => {
    const { data, error } = await context.supabase
      .from("saved_items")
      .select("id, kind, ref_id, title, subtitle, image_url")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id as string,
      kind: row.kind as "venue" | "recipe",
      refId: row.ref_id as string,
      title: row.title as string,
      subtitle: (row.subtitle as string | null) ?? null,
      imageUrl: (row.image_url as string | null) ?? null,
    }));
  });

export const saveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itemSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("saved_items").upsert(
      {
        user_id: context.userId,
        kind: data.kind,
        ref_id: data.refId,
        title: data.title,
        subtitle: data.subtitle,
        image_url: data.imageUrl,
      },
      { onConflict: "user_id,kind,ref_id" },
    );
    if (error) throw error;
    return { ok: true };
  });

export const removeSaved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ kind: z.enum(["venue", "recipe"]), refId: z.string().min(1).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_items")
      .delete()
      .eq("kind", data.kind)
      .eq("ref_id", data.refId);
    if (error) throw error;
    return { ok: true };
  });
