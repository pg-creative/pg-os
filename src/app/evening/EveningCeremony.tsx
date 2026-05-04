"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSound } from "../_components/SoundProvider";

/**
 * T-11 — Evening Ceremony
 *
 * 6 step ritual at 21:00 local. Mirrors morning briefing pattern.
 * Steps: day-in-review → tier-check → chest → journal → tomorrow → close.
 * Submitting writes a journal entry to HC Supabase via /api/evening/complete
 * and sets the per-day cookie so middleware stops re-redirecting.
 */

type Ship = { id: number; text: string; context: string | null; created_at: number };
type SeasonStatus = {
  tier: string;
  tier_floor: string;
  xp_earned: number;
  xp_target: number;
  xp_percent: number;
  tier_progress: number;
  coins: number;
} | null;

const TIER_LADDER = ["F", "D", "C", "B", "A", "S", "SSS"];
const TOTAL_STEPS = 6;

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

export function EveningCeremony() {
  const router = useRouter();
  const { play, enabled } = useSound();

  const [step, setStep] = useState(0);
  const [ships, setShips] = useState<Ship[]>([]);
  const [season, setSeason] = useState<SeasonStatus>(null);
  const [chestId, setChestId] = useState<string | null>(null);
  const [journalText, setJournalText] = useState("");
  const [tomorrowText, setTomorrowText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reduced, setReduced] = useState(false);

  // Reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Soft reveal chime
  useEffect(() => {
    if (enabled) play("capture");
  }, [enabled, play]);

  // Load ships + season + chest
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [shipsRes, habitsRes] = await Promise.all([
          fetch("/api/ships?limit=20", { cache: "no-store" }).catch(() => null),
          fetch("/api/habits", { cache: "no-store" }).catch(() => null),
        ]);

        if (!cancelled && shipsRes?.ok) {
          const data = await shipsRes.json().catch(() => ({}));
          const all: Ship[] = Array.isArray(data?.ships) ? data.ships : [];
          setShips(all.filter((s) => isToday(s.created_at)).slice(0, 3));
        }

        if (!cancelled && habitsRes?.ok) {
          const data = await habitsRes.json().catch(() => ({}));
          if (data?.season) setSeason(data.season as SeasonStatus);
        }

        // Chest pinned today?
        try {
          const raw = window.localStorage.getItem("pg-os-active-chest");
          if (raw) {
            const parsed = JSON.parse(raw) as { id?: string; date?: string } | string;
            const id = typeof parsed === "string" ? parsed : parsed?.id ?? null;
            const date = typeof parsed === "object" ? parsed?.date : null;
            // Treat as "active today" if date stamp is today, OR if no date stamp at all
            if (id && (!date || date === todayLocal())) {
              setChestId(id);
            }
          }
        } catch { /* ignore */ }

        // Pre-fill journal from prior auto-save
        try {
          const draft = window.localStorage.getItem(`pg-os-evening-draft-${todayLocal()}`);
          if (draft && !cancelled) setJournalText(draft);
          const intent = window.localStorage.getItem("pg-os-tomorrow-intent");
          if (intent && !cancelled) setTomorrowText(intent);
        } catch { /* ignore */ }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist journal draft as user types
  useEffect(() => {
    try {
      if (journalText) {
        window.localStorage.setItem(`pg-os-evening-draft-${todayLocal()}`, journalText);
      }
    } catch { /* ignore */ }
  }, [journalText]);

  const tierAdvanced = useMemo(() => {
    if (!season) return false;
    return TIER_LADDER.indexOf(season.tier_floor) > TIER_LADDER.indexOf(season.tier);
    // tier_floor advanced ABOVE current tier means a ratchet happened previously this season
    // For UI flourish, also celebrate when floor === tier and tier > F (mid-season high)
  }, [season]);

  const tierBeatF = useMemo(() => {
    return season ? TIER_LADDER.indexOf(season.tier_floor) > 0 : false;
  }, [season]);

  const next = useCallback(() => {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }, []);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleClose = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Stash tomorrow's intent for morning briefing to read
      try {
        if (tomorrowText.trim()) {
          window.localStorage.setItem("pg-os-tomorrow-intent", tomorrowText.trim());
        }
      } catch { /* ignore */ }

      // Clear chest if it was active today
      if (chestId) {
        try { window.localStorage.removeItem("pg-os-active-chest"); } catch { /* ignore */ }
      }

      // Submit journal + cookie via API
      await fetch("/api/evening/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journal: journalText.trim() || null,
          tomorrowIntent: tomorrowText.trim() || null,
        }),
      }).catch(() => null);

      // Clear local draft
      try { window.localStorage.removeItem(`pg-os-evening-draft-${todayLocal()}`); } catch { /* ignore */ }

      if (enabled) play("ship");
    } finally {
      router.push("/");
    }
  }, [submitting, journalText, tomorrowText, chestId, enabled, play, router]);

  // Keyboard: Enter advances (except inside textareas), ⌘↵ closes from final step
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT");
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (step === TOTAL_STEPS - 1) {
          void handleClose();
        } else {
          next();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        router.push("/");
        return;
      }
      if (e.key === "Enter" && !inField && step < TOTAL_STEPS - 1) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step, next, handleClose, router]);

  return (
    <main className={`evening-ceremony ${reduced ? "reduced-motion" : ""}`} role="main" data-step={step}>
      <div className="evening-glow" aria-hidden />

      {/* Step dots */}
      <ol className="evening-progress" aria-label="Ceremony progress">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <li
            key={i}
            className={`evening-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
            aria-current={i === step ? "step" : undefined}
          />
        ))}
      </ol>

      <div className="evening-content">
        {/* Step 0 — Day in review */}
        {step === 0 && (
          <section className="evening-step" key="review">
            <h1 className="evening-heading">The day in <em>review</em>.</h1>
            {ships.length === 0 ? (
              <p className="evening-body evening-quiet">A <em>quiet</em> day. No ships logged.</p>
            ) : (
              <ul className="evening-ships">
                {ships.map((s) => (
                  <li key={s.id} className="evening-ship">
                    <span className="evening-glyph" aria-hidden>◆</span>
                    <span className="evening-ship-text">{s.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="evening-cta-row">
              <button type="button" className="evening-btn primary" onClick={next}>
                <span>Continue</span>
                <kbd className="evening-kbd">↵</kbd>
              </button>
            </div>
          </section>
        )}

        {/* Step 1 — Tier check */}
        {step === 1 && (
          <section className="evening-step" key="tier">
            <h1 className="evening-heading">The <em>tier</em> holds.</h1>
            {season ? (
              <div className="evening-tier-block">
                <div className="evening-tier-badge" data-advanced={tierAdvanced || tierBeatF ? "1" : "0"}>
                  <span className="evening-tier-letter">{season.tier_floor}</span>
                </div>
                <p className="evening-body">
                  <span className="evening-mono">{season.xp_earned}</span> XP earned.
                  Floor at <em>{season.tier_floor}</em>{tierAdvanced && " — ratcheted today"}.
                </p>
                <div className="evening-bar" aria-hidden>
                  <span style={{ width: `${Math.min(100, season.tier_progress)}%` }} />
                </div>
              </div>
            ) : (
              <p className="evening-body evening-quiet">Season data is <em>quiet</em> tonight.</p>
            )}
            <div className="evening-cta-row">
              <button type="button" className="evening-btn ghost" onClick={prev}>Back</button>
              <button type="button" className="evening-btn primary" onClick={next}>
                <span>Continue</span>
                <kbd className="evening-kbd">↵</kbd>
              </button>
            </div>
          </section>
        )}

        {/* Step 2 — Chest */}
        {step === 2 && (
          <section className="evening-step" key="chest">
            <h1 className="evening-heading">The <em>chest</em>.</h1>
            {chestId ? (
              <p className="evening-body evening-flourish">
                Chest <em>closed</em>. <span className="evening-mono">{chestId}</span> rests.
              </p>
            ) : (
              <p className="evening-body evening-quiet">No chest was pinned today.</p>
            )}
            <div className="evening-cta-row">
              <button type="button" className="evening-btn ghost" onClick={prev}>Back</button>
              <button type="button" className="evening-btn primary" onClick={next}>
                <span>Continue</span>
                <kbd className="evening-kbd">↵</kbd>
              </button>
            </div>
          </section>
        )}

        {/* Step 3 — Journal */}
        {step === 3 && (
          <section className="evening-step" key="journal">
            <h1 className="evening-heading">A line to <em>remember</em>.</h1>
            <label htmlFor="evening-journal" className="evening-label">
              What's one thing worth remembering from today?
            </label>
            <textarea
              id="evening-journal"
              className="evening-textarea"
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="Optional — one sentence is enough."
              rows={4}
              maxLength={1000}
              autoFocus
            />
            <div className="evening-cta-row">
              <button type="button" className="evening-btn ghost" onClick={prev}>Back</button>
              <button type="button" className="evening-btn primary" onClick={next}>
                <span>Continue</span>
                <kbd className="evening-kbd">↵</kbd>
              </button>
            </div>
          </section>
        )}

        {/* Step 4 — Tomorrow's intention */}
        {step === 4 && (
          <section className="evening-step" key="tomorrow">
            <h1 className="evening-heading">Tomorrow's <em>intention</em>.</h1>
            <label htmlFor="evening-tomorrow" className="evening-label">
              One line for tomorrow's first move.
            </label>
            <textarea
              id="evening-tomorrow"
              className="evening-textarea"
              value={tomorrowText}
              onChange={(e) => setTomorrowText(e.target.value)}
              placeholder="The morning briefing will read this back."
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className="evening-cta-row">
              <button type="button" className="evening-btn ghost" onClick={prev}>Back</button>
              <button type="button" className="evening-btn primary" onClick={next}>
                <span>Continue</span>
                <kbd className="evening-kbd">↵</kbd>
              </button>
            </div>
          </section>
        )}

        {/* Step 5 — Close */}
        {step === 5 && (
          <section className="evening-step evening-close" key="close">
            <h1 className="evening-heading evening-close-heading">
              Until <em>tomorrow</em>.
            </h1>
            <p className="evening-body evening-flourish">
              <span className="evening-mono">{todayLocal()}</span>
            </p>
            <div className="evening-cta-row">
              <button type="button" className="evening-btn ghost" onClick={prev} disabled={submitting}>
                Back
              </button>
              <button
                type="button"
                className="evening-btn primary"
                onClick={() => void handleClose()}
                disabled={submitting}
                aria-keyshortcuts="Meta+Enter"
              >
                <span>{submitting ? "Closing…" : "Close the day"}</span>
                <kbd className="evening-kbd">⌘↵</kbd>
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
