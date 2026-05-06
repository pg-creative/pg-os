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

  // Day number from start of year — for the mission-report header
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const stepNames = ["DAY IN REVIEW", "TIER CHECK", "CHEST", "JOURNAL", "TOMORROW", "CLOSE"];
  const tierColor = season
    ? TIER_LADDER.indexOf(season.tier_floor) >= 4
      ? "#e5b374"
      : TIER_LADDER.indexOf(season.tier_floor) >= 2
        ? "#5cb37a"
        : "#9b6fc2"
    : "#7a8aa8";

  return (
    <main className={`evening-rpg ${reduced ? "reduced-motion" : ""}`} role="main" data-step={step}>
      {/* Hex pattern background */}
      <div className="evening-rpg-hex" aria-hidden />

      <div className="evening-rpg-frame">
        {/* Mission-report header bar */}
        <div className="evening-rpg-header">
          <span className="evening-rpg-header-tag">▰ MISSION REPORT</span>
          <span className="evening-rpg-header-day">DAY {dayOfYear}</span>
        </div>

        {/* Stage progress dots */}
        <ol className="evening-rpg-progress" aria-label="Ceremony progress">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <li
              key={i}
              className={`evening-rpg-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
              aria-current={i === step ? "step" : undefined}
            />
          ))}
        </ol>

        <p className="evening-rpg-stage">
          ▸ STAGE {step + 1} OF {TOTAL_STEPS} · {stepNames[step]}
        </p>

        {/* Step 0 — Day in review */}
        {step === 0 && (
          <section className="evening-rpg-step" key="review">
            <h1 className="evening-rpg-heading">The day&rsquo;s <em>ledger</em>.</h1>

            {/* Stats grid */}
            <div className="evening-rpg-stats">
              <div className="evening-rpg-stat" style={{ "--ev-stat-color": "#5cb37a" } as React.CSSProperties}>
                <div className="evening-rpg-stat-label">SHIPS</div>
                <div className="evening-rpg-stat-value">{ships.length}</div>
                <div className="evening-rpg-stat-bar"><span style={{ width: `${Math.min(100, ships.length * 25)}%` }} /></div>
              </div>
              <div className="evening-rpg-stat" style={{ "--ev-stat-color": "#e5b374" } as React.CSSProperties}>
                <div className="evening-rpg-stat-label">XP</div>
                <div className="evening-rpg-stat-value">{season?.xp_earned ?? 0}</div>
                <div className="evening-rpg-stat-bar"><span style={{ width: `${Math.min(100, season?.xp_percent ?? 0)}%` }} /></div>
              </div>
              <div className="evening-rpg-stat" style={{ "--ev-stat-color": "#9b6fc2" } as React.CSSProperties}>
                <div className="evening-rpg-stat-label">COIN</div>
                <div className="evening-rpg-stat-value">{season?.coins ?? 0}</div>
                <div className="evening-rpg-stat-bar"><span style={{ width: `${Math.min(100, (season?.coins ?? 0) * 5)}%` }} /></div>
              </div>
            </div>

            {/* Quest log */}
            <p className="evening-rpg-section-label">QUEST LOG · TODAY</p>
            {ships.length === 0 ? (
              <p className="evening-rpg-empty">A <em>quiet</em> day. No ships logged.</p>
            ) : (
              <ul className="evening-rpg-log">
                {ships.map((s, i) => {
                  const tags = ["FEAT", "FIX", "SHIP"];
                  const colors = ["#5cb37a", "#9b6fc2", "#e5b374"];
                  return (
                    <li key={s.id} className="evening-rpg-log-row" style={{ borderLeftColor: colors[i % 3] }}>
                      <span className="evening-rpg-log-tag" style={{ color: colors[i % 3] }}>{tags[i % 3]}</span>
                      <span className="evening-rpg-log-text">{s.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="evening-rpg-cta-row">
              <button type="button" className="evening-rpg-btn primary" onClick={next}>
                ▸ NEXT STAGE — TIER CHECK
              </button>
            </div>
          </section>
        )}

        {/* Step 1 — Tier check */}
        {step === 1 && (
          <section className="evening-rpg-step" key="tier">
            <h1 className="evening-rpg-heading">The <em>tier</em> holds.</h1>

            {season ? (
              <>
                <div className="evening-rpg-tier-block">
                  <div
                    className="evening-rpg-hex-badge"
                    data-advanced={tierAdvanced || tierBeatF ? "1" : "0"}
                    style={{ color: tierColor }}
                  >
                    <svg viewBox="0 0 60 64" width="100%" height="100%">
                      <polygon points="30,3 56,18 56,46 30,61 4,46 4,18" fill="rgba(229,179,116,0.10)" stroke="currentColor" strokeWidth="2" />
                      <text x="30" y="44" textAnchor="middle" fontFamily="Cormorant Garamond" fontStyle="italic" fontSize="30" fontWeight="500" fill="currentColor">
                        {season.tier_floor}
                      </text>
                    </svg>
                  </div>
                  <div className="evening-rpg-tier-info">
                    <div className="evening-rpg-section-label">TIER FLOOR</div>
                    <div className="evening-rpg-tier-line">
                      <em style={{ color: tierColor }}>{season.tier_floor}</em>
                      <span className="evening-rpg-tier-xp">· {season.xp_earned} XP earned</span>
                    </div>
                    {tierAdvanced && <div className="evening-rpg-ratchet">⤤ ratcheted today</div>}
                  </div>
                </div>
                <p className="evening-rpg-section-label">PROGRESS TO {season.tier}</p>
                <div className="evening-rpg-progress-bar">
                  <span style={{ width: `${Math.min(100, season.tier_progress)}%` }} />
                </div>
              </>
            ) : (
              <p className="evening-rpg-empty">Season data is <em>quiet</em> tonight.</p>
            )}

            <div className="evening-rpg-cta-row">
              <button type="button" className="evening-rpg-btn ghost" onClick={prev}>◂ Back</button>
              <button type="button" className="evening-rpg-btn primary" onClick={next}>▸ Next stage</button>
            </div>
          </section>
        )}

        {/* Step 2 — Chest */}
        {step === 2 && (
          <section className="evening-rpg-step" key="chest">
            <h1 className="evening-rpg-heading">The <em>chest</em>.</h1>
            {chestId ? (
              <div className="evening-rpg-chest">
                <span className="evening-rpg-chest-glyph">⬚</span>
                <p className="evening-rpg-chest-text">
                  Chest <em>closed</em>. <span className="evening-rpg-mono">{chestId}</span> rests.
                </p>
              </div>
            ) : (
              <p className="evening-rpg-empty">No chest was pinned today.</p>
            )}
            <div className="evening-rpg-cta-row">
              <button type="button" className="evening-rpg-btn ghost" onClick={prev}>◂ Back</button>
              <button type="button" className="evening-rpg-btn primary" onClick={next}>▸ Next stage</button>
            </div>
          </section>
        )}

        {/* Step 3 — Journal */}
        {step === 3 && (
          <section className="evening-rpg-step" key="journal">
            <h1 className="evening-rpg-heading">A line to <em>remember</em>.</h1>
            <label htmlFor="evening-journal" className="evening-rpg-section-label">
              ▸ ONE THING WORTH REMEMBERING FROM TODAY
            </label>
            <textarea
              id="evening-journal"
              className="evening-rpg-textarea"
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="Optional — one sentence is enough."
              rows={4}
              maxLength={1000}
              autoFocus
            />
            <div className="evening-rpg-cta-row">
              <button type="button" className="evening-rpg-btn ghost" onClick={prev}>◂ Back</button>
              <button type="button" className="evening-rpg-btn primary" onClick={next}>▸ Next stage</button>
            </div>
          </section>
        )}

        {/* Step 4 — Tomorrow's intention */}
        {step === 4 && (
          <section className="evening-rpg-step" key="tomorrow">
            <h1 className="evening-rpg-heading">Tomorrow&rsquo;s <em>intention</em>.</h1>
            <label htmlFor="evening-tomorrow" className="evening-rpg-section-label">
              ▸ ONE LINE FOR TOMORROW&rsquo;S FIRST MOVE
            </label>
            <textarea
              id="evening-tomorrow"
              className="evening-rpg-textarea"
              value={tomorrowText}
              onChange={(e) => setTomorrowText(e.target.value)}
              placeholder="The morning briefing will read this back."
              rows={3}
              maxLength={500}
              autoFocus
            />
            <div className="evening-rpg-cta-row">
              <button type="button" className="evening-rpg-btn ghost" onClick={prev}>◂ Back</button>
              <button type="button" className="evening-rpg-btn primary" onClick={next}>▸ Next stage</button>
            </div>
          </section>
        )}

        {/* Step 5 — Close (mission complete) */}
        {step === 5 && (
          <section className="evening-rpg-step evening-rpg-close" key="close">
            <div className="evening-rpg-victory">
              <p className="evening-rpg-victory-tag">▰ MISSION COMPLETE</p>
              <h1 className="evening-rpg-heading evening-rpg-victory-heading">
                Until <em>tomorrow</em>.
              </h1>
              <p className="evening-rpg-mono evening-rpg-date">{todayLocal()}</p>
            </div>
            <div className="evening-rpg-cta-row">
              <button type="button" className="evening-rpg-btn ghost" onClick={prev} disabled={submitting}>
                ◂ Back
              </button>
              <button
                type="button"
                className="evening-rpg-btn primary"
                onClick={() => void handleClose()}
                disabled={submitting}
                aria-keyshortcuts="Meta+Enter"
              >
                {submitting ? "▸ Closing…" : "▸ Close the day  ⌘↵"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
