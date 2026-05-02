"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "./SoundProvider";

export type BriefingAction = { label: string; target: string | null };
export type BriefingPayload = {
  greeting: string;
  subline: string;
  narration: string;
  actions: BriefingAction[];
  generated?: "anthropic" | "fallback";
};

function shownCookieName(): string {
  const d = new Date();
  return `pg-os-briefing-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function markShown() {
  const name = shownCookieName();
  document.cookie = `${name}=1; path=/; max-age=${60 * 60 * 24}; samesite=strict`;
  try { window.localStorage.setItem(name, "1"); } catch { /* ignore */ }
}

interface Props {
  briefing: BriefingPayload;
  onRegenerate: () => Promise<void> | void;
  variant?: "morning" | "evening";
}

export function BriefingShell({ briefing, onRegenerate, variant = "morning" }: Props) {
  const router = useRouter();
  const { play, enabled } = useSound();
  const [busy, setBusy] = useState(false);

  // Soft chime when the briefing reveals (only when sound is enabled).
  useEffect(() => {
    if (enabled) play("capture");
  }, [enabled, play]);

  const onBegin = useCallback(() => {
    markShown();
    router.push("/");
  }, [router]);

  const onDismiss = useCallback(() => {
    markShown();
    router.push("/");
  }, [router]);

  const onRegen = useCallback(async () => {
    setBusy(true);
    try { await onRegenerate(); } finally { setBusy(false); }
  }, [onRegenerate]);

  // ⌘↵ / Ctrl+↵ → Begin
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onBegin();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBegin]);

  return (
    <main className={`briefing-shell briefing-${variant}`} role="main">
      <div className="briefing-glow" aria-hidden />
      <div className="briefing-content">
        <h1 className="briefing-greeting">{briefing.greeting}</h1>
        <p className="briefing-subline">{briefing.subline}</p>
        <div
          className="briefing-narration"
          dangerouslySetInnerHTML={{ __html: briefing.narration }}
        />
        {briefing.actions.length > 0 && (
          <ul className="briefing-actions" aria-label="Top actions for today">
            {briefing.actions.map((a, i) => (
              <li key={i} className="briefing-action">
                {a.target ? (
                  <a href={a.target} className="briefing-action-link">{a.label}</a>
                ) : (
                  <span className="briefing-action-label">{a.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="briefing-cta-row">
          <button
            type="button"
            className="briefing-btn primary"
            onClick={onBegin}
            aria-keyshortcuts="Meta+Enter"
          >
            <span>Begin</span>
            <kbd className="briefing-kbd">⌘↵</kbd>
          </button>
          <button
            type="button"
            className="briefing-btn ghost"
            onClick={onRegen}
            disabled={busy}
          >
            {busy ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            type="button"
            className="briefing-btn ghost"
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
        {briefing.generated === "fallback" && (
          <p className="briefing-fallback-note">
            Narration <em>cached</em>. Full briefing returns next attempt.
          </p>
        )}
      </div>
    </main>
  );
}
