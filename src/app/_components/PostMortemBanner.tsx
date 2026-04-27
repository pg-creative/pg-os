"use client";
import { useCallback, useEffect, useState } from "react";
import type { PostMortem } from "@/lib/postMortem";
import { PostMortemCard } from "./PostMortemCard";

const POLL_MS = 5 * 60 * 1000; // 5 minutes

export function PostMortemBanner() {
  const [items, setItems] = useState<PostMortem[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchDue = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/post-mortem", { signal });
      if (!res.ok) return;
      const body = (await res.json()) as { due?: PostMortem[] };
      if (Array.isArray(body.due)) setItems(body.due);
    } catch {
      // Ignore — banner just stays empty if the call fails.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDue(controller.signal);
    const handle = setInterval(() => fetchDue(), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(handle);
    };
  }, [fetchDue]);

  const handleResolved = useCallback((id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // Pre-load: render nothing until first fetch resolves so the banner
  // doesn't flash for users with zero due items.
  if (!loaded) return null;
  if (items.length === 0) return null;

  return (
    <section className="pm-banner" aria-label="Post-mortems due for review">
      <div className="pm-banner-head">
        <span className="pm-banner-label">POST-MORTEMS · {items.length} DUE</span>
        <span className="pm-banner-sub">Past decisions ready for outcome tagging</span>
      </div>
      <div className="pm-banner-list">
        {items.map((item) => (
          <PostMortemCard key={item.id} item={item} onResolved={handleResolved} />
        ))}
      </div>
    </section>
  );
}
