"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { recordRitual, type EveningPayload } from "@/lib/rituals";

interface EveningRitualProps {
  onClose: () => void;
}

interface ShipData {
  text: string;
  context: string | null;
}

interface QueueData {
  count: number;
}

const MOOD_OPTIONS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "rough" },
  { value: 2, emoji: "😕", label: "low" },
  { value: 3, emoji: "😐", label: "neutral" },
  { value: 4, emoji: "🙂", label: "good" },
  { value: 5, emoji: "😄", label: "great" },
];

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EveningRitual({ onClose }: EveningRitualProps) {
  const [ships, setShips] = useState<ShipData[]>([]);
  const [shipLogged, setShipLogged] = useState(false);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [tomorrowsOne, setTomorrowsOne] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [reflection, setReflection] = useState("");

  const sheetRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Fetch today's ships
  useEffect(() => {
    let cancelled = false;
    async function fetchShips() {
      try {
        const res = await fetch("/api/ships");
        if (cancelled || !res.ok) return;
        const json = await res.json();
        const today = todayLocal();
        // Filter ships from today (created_at is epoch ms)
        const todayMs = new Date(today).getTime();
        const tomorrowMs = todayMs + 86_400_000;
        const todayShips: ShipData[] = (json.ships ?? [])
          .filter((s: { created_at: number; text: string; context: string | null }) =>
            s.created_at >= todayMs && s.created_at < tomorrowMs
          )
          .map((s: { text: string; context: string | null }) => ({ text: s.text, context: s.context }));
        if (!cancelled) {
          setShips(todayShips);
          setShipLogged(todayShips.length > 0);
        }
      } catch {
        // non-fatal
      }
    }
    fetchShips();
    return () => { cancelled = true; };
  }, []);

  // Fetch queue count
  useEffect(() => {
    let cancelled = false;
    async function fetchQueue() {
      try {
        const res = await fetch("/api/queue");
        if (cancelled || !res.ok) return;
        const json = await res.json();
        const items = json.items ?? json.queue ?? [];
        if (!cancelled) setQueueCount(items.length);
      } catch {
        // non-fatal
      }
    }
    fetchQueue();
    return () => { cancelled = true; };
  }, []);

  // Focus management
  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement;
    const firstFocusable = sheetRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, []);

  // Focus trap + ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleComplete = useCallback(() => {
    const payload: EveningPayload = {
      shipLogged,
      tomorrowsOne: tomorrowsOne.trim(),
      mood,
      reflection: reflection.trim(),
      // TODO (Track A): persist reflection to HC journal or Supabase rituals table
    };
    recordRitual("evening", payload);
    onClose();
  }, [shipLogged, tomorrowsOne, mood, reflection, onClose]);

  return (
    <div className="rt-backdrop" onClick={onClose} role="dialog" aria-modal aria-label="Evening ritual">
      <div
        className="rt-sheet"
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evening-ritual-title"
      >
        <div className="rt-header">
          <span className="rt-eyebrow">EVENING RITUAL</span>
          <button className="rt-close" onClick={onClose} aria-label="Close ritual">✕</button>
        </div>

        <h2 className="rt-title" id="evening-ritual-title">
          Close the day.
        </h2>

        {/* Ship logged */}
        <div className="rt-section">
          <p className="rt-section-label">SHIPPED TODAY</p>
          {ships.length === 0 ? (
            <div className="rt-check-item">
              <button
                className={`rt-checkbox${shipLogged ? " checked" : ""}`}
                onClick={() => setShipLogged((v) => !v)}
                role="checkbox"
                aria-checked={shipLogged}
                aria-label="Today's ship logged"
              />
              <span className="rt-check-label rt-muted">No ships logged yet today</span>
            </div>
          ) : (
            <ul className="rt-ship-list" role="list">
              {ships.map((s, i) => (
                <li key={i} className="rt-ship-item">
                  <span className="rt-ship-bullet">✦</span>
                  <span className="rt-ship-text">{s.text}</span>
                  {s.context && <span className="rt-ship-ctx">{s.context}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Open loops */}
        {queueCount !== null && (
          <div className="rt-section rt-loops">
            <span className="rt-section-label">OPEN LOOPS</span>
            <span className={`rt-loop-count${queueCount > 5 ? " high" : ""}`}>{queueCount}</span>
            <span className="rt-loop-note">{queueCount === 0 ? "clear" : queueCount === 1 ? "decision pending" : "decisions pending"}</span>
          </div>
        )}

        {/* Tomorrow's one thing */}
        <div className="rt-section">
          <p className="rt-section-label">TOMORROW&apos;S ONE THING</p>
          <input
            className="rt-one-thing"
            type="text"
            placeholder="The one thing that must happen…"
            value={tomorrowsOne}
            onChange={(e) => setTomorrowsOne(e.target.value)}
            aria-label="Tomorrow's one thing"
          />
        </div>

        {/* Mood */}
        <div className="rt-section">
          <p className="rt-section-label">MOOD</p>
          <div className="rt-mood-row" role="group" aria-label="Mood check-in">
            {MOOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`rt-mood-btn${mood === opt.value ? " selected" : ""}`}
                onClick={() => setMood((prev) => prev === opt.value ? null : opt.value)}
                aria-label={opt.label}
                aria-pressed={mood === opt.value}
                title={opt.label}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
          {mood !== null && (
            <p className="rt-mood-label">
              {MOOD_OPTIONS.find((o) => o.value === mood)?.label}
            </p>
          )}
        </div>

        {/* Reflection — always optional, never prompted with leading language */}
        <div className="rt-section">
          <p className="rt-section-label">REFLECTION <span className="rt-optional">(optional)</span></p>
          <textarea
            className="rt-reflection"
            placeholder=""
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            rows={3}
            aria-label="Evening reflection"
          />
          {/* TODO (Track A): persist reflection to HC journal/Supabase alongside mood */}
        </div>

        <button className="rt-cta" onClick={handleComplete}>
          Close the day →
        </button>
      </div>
    </div>
  );
}
