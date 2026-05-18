"use client";
import { useCallback, useState } from "react";

// Shared throw / defer / archive mutation hook used by all variants.
// Wraps PATCH /api/brain/entry/[slug] and exposes a busy flag.

export interface MutationPatch {
  status?: "active" | "superseded" | "archived";
  route?: "second_brain" | "queue" | "kill";
}

export function useBrainMutations(onMutated?: () => void) {
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const mutate = useCallback(
    async (slug: string, patch: MutationPatch) => {
      setBusySlug(slug);
      try {
        const r = await fetch(`/api/brain/entry/${encodeURIComponent(slug)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await r.json();
        if (!data.ok && !data.local) {
          console.error("[brain-lab] mutation failed", data);
        }
        onMutated?.();
        return data;
      } finally {
        setBusySlug(null);
      }
    },
    [onMutated],
  );

  return {
    busySlug,
    throwIt: (slug: string) =>
      mutate(slug, { status: "active", route: "queue" }),
    defer: (slug: string) => mutate(slug, { status: "active" }),
    archive: (slug: string) => mutate(slug, { status: "archived" }),
  };
}
