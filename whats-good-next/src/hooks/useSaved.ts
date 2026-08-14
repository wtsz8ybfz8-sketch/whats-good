import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { listSaved, removeSaved, saveItem, type SavedItem } from "@/lib/saved.functions";

const STORAGE_KEY = "whats-good:saved";

type SavedInput = Omit<SavedItem, "id">;

function readLocal(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(items: SavedItem[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    // Private mode / quota: keep the session working instead of throwing out of a handler.
    console.warn("Could not persist saved items locally", error);
  }
}

export function useSaved() {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<SavedItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const fetchSaved = useServerFn(listSaved);
  const persist = useServerFn(saveItem);
  const drop = useServerFn(removeSaved);

  useEffect(() => {
    setLocal(readLocal());
    setReady(true);
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const remote = useQuery({
    queryKey: ["saved", userId],
    queryFn: () => fetchSaved(),
    enabled: Boolean(userId),
  });

  const signedIn = Boolean(userId);
  const items = signedIn ? (remote.data ?? []) : local;

  const mutation = useMutation({
    mutationFn: async ({ action, item }: { action: "add" | "remove"; item: SavedInput }) => {
      if (!signedIn) return;
      if (action === "add") await persist({ data: item });
      else await drop({ data: { kind: item.kind, refId: item.refId } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved", userId] }),
  });

  const isSaved = useCallback(
    (kind: SavedItem["kind"], refId: string) =>
      items.some((i) => i.kind === kind && i.refId === refId),
    [items],
  );

  const toggle = useCallback(
    (item: SavedInput) => {
      const already = isSaved(item.kind, item.refId);
      if (signedIn) {
        mutation.mutate({ action: already ? "remove" : "add", item });
        return !already;
      }
      const next = already
        ? local.filter((i) => !(i.kind === item.kind && i.refId === item.refId))
        : [{ ...item, id: `${item.kind}:${item.refId}` }, ...local];
      setLocal(next);
      writeLocal(next);
      return !already;
    },
    [isSaved, local, mutation, signedIn],
  );

  return { items, isSaved, toggle, signedIn, ready };
}
