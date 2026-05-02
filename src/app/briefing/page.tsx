"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefingShell, type BriefingPayload } from "../_components/BriefingShell";
import { EmptyState } from "../_components/EmptyState";

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setError(null);
    try {
      const url = force ? "/api/briefing?force=1" : "/api/briefing";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`status_${res.status}`);
      const data = await res.json();
      if (!data?.briefing) throw new Error("malformed");
      setBriefing(data.briefing as BriefingPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (briefing) {
    return <BriefingShell briefing={briefing} onRegenerate={() => load(true)} />;
  }

  if (error) {
    return (
      <main className="briefing-shell briefing-morning" role="main">
        <div className="briefing-glow" aria-hidden />
        <div className="briefing-content">
          <EmptyState
            verb="Reach"
            explanation="The narration service is <em>quiet</em> right now — proceed without it."
            glyph="○"
            cta={{ label: "Continue", onClick: () => { window.location.href = "/"; } }}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="briefing-shell briefing-morning" role="main">
      <div className="briefing-glow" aria-hidden />
      <div className="briefing-content">
        <p className="briefing-greeting briefing-loading">…</p>
      </div>
    </main>
  );
}
