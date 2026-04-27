"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { RitualGate } from "../Ritual/RitualGate";

interface Habit {
  id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekdays" | "weekends" | "weekly" | "custom";
  attribute_id: string | null;
  xp_per_completion: number;
  completed: boolean;
  completion_notes: string | null;
}

interface JournalEntry {
  entry_date: string;
  raw_text: string;
  cleaned_text: string | null;
  sentiment_score: number | null;
  energy_level: number | null;
  tags: string[];
}

interface Snapshot {
  date: string;
  habits: Habit[];
  journal: JournalEntry | null;
  completedToday: number;
  totalToday: number;
  streak7DayPct: number;
}

interface Week {
  shipsThisWeek: number;
  habitsCompletedThisWeek: number;
  daysJournaled: number;
  avgMood: number | null;
}

type ApiData =
  | { connected: false; hint: string; status: { connected: false; url: string | null; hasKey: boolean } }
  | { connected: true; snapshot: Snapshot; week: Week | null };

const MIRROR_PROMPTS = [
  "Are you being who you said you wanted to be this week?",
  "The record, not the intention, is the truth.",
  "Light check: what's the one thing you avoided?",
  "What's stayed constant this week?",
  "Shipping is the only signal.",
  "You already know what the next move is.",
  "Plurality without a ship is just noise.",
];

// mood button: [emoji, label, hcEnergyLevel (1-10)]
const MOOD_OPTS: [string, string, number][] = [
  ["😞", "rough", 2],
  ["😕", "low", 4],
  ["😐", "neutral", 6],
  ["🙂", "good", 8],
  ["😄", "great", 10],
];

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function HabitsView() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/habits?date=${todayLocal()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="view view-habits">
      <div className="view-header">
        <h1 className="view-title">Habits</h1>
        <div className="view-sub">MORNING · EVENING · WEEKLY REVIEW</div>
      </div>

      <RitualGate />

      {loading && !data && <LoadingCard />}
      {fetchError && <div className="card"><div className="card-label">ERROR</div><p>{fetchError}</p><button className="fl-btn-primary" onClick={fetchData}>Retry</button></div>}
      {!loading && !fetchError && data && !data.connected && (
        <SetupCard hint={data.hint} onRetry={fetchData} />
      )}
      {!loading && !fetchError && data && data.connected && (
        <ConnectedView snapshot={data.snapshot} week={data.week} onRefetch={fetchData} />
      )}
    </div>
  );
}

function SetupCard({ hint, onRetry }: { hint: string; onRetry: () => void }) {
  return (
    <div className="card hc-setup">
      <div className="card-label">
        00 // HC NOT CONNECTED <span className="hb-tag">SETUP NEEDED</span>
      </div>
      <p className="hc-setup-body">
        {hint || "Habits + journal live in your Hero's Chronicle Supabase. To wire PG OS to HC, add HC_SUPABASE_SERVICE_ROLE_KEY to your .env.local."}
      </p>
      <pre className="hc-setup-code">HC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here</pre>
      <div className="hc-setup-actions">
        <a className="fl-btn-primary hc-setup-link" href="https://supabase.com/dashboard/project/ystqevehdgoonhpjmgis/settings/api" target="_blank" rel="noreferrer">open Supabase dashboard →</a>
        <button className="fl-btn-secondary" onClick={onRetry}>Retry connection</button>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="card">
      <div className="card-label">01 // TODAY · HABITS</div>
      <p className="hb-loading">Loading habits…</p>
    </div>
  );
}

function ConnectedView({
  snapshot,
  week,
  onRefetch,
}: {
  snapshot: Snapshot;
  week: Week | null;
  onRefetch: () => void;
}) {
  const mirrorPrompt = MIRROR_PROMPTS[new Date().getDay() % MIRROR_PROMPTS.length];

  return (
    <div className="hb-layout">
      <div className="hb-col-left">
        <HabitsCard snapshot={snapshot} onRefetch={onRefetch} />
      </div>
      <div className="hb-col-right">
        <JournalCard snapshot={snapshot} onRefetch={onRefetch} />
        <WeekCard week={week} mirrorPrompt={mirrorPrompt} />
      </div>
    </div>
  );
}

function HabitsCard({
  snapshot,
  onRefetch,
}: {
  snapshot: Snapshot;
  onRefetch: () => void;
}) {
  const { habits, completedToday, totalToday, streak7DayPct } = snapshot;
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const effectiveCompleted = (h: Habit) =>
    h.id in overrides ? overrides[h.id] : h.completed;

  const effectiveCount =
    habits.reduce((sum, h) => sum + (effectiveCompleted(h) ? 1 : 0), 0);

  const pct = totalToday > 0 ? (effectiveCount / totalToday) * 100 : 0;
  const allDone = totalToday > 0 && effectiveCount === totalToday;

  async function toggle(h: Habit) {
    const newVal = !effectiveCompleted(h);
    setOverrides((prev) => ({ ...prev, [h.id]: newVal }));
    setToggleErrors((prev) => { const n = { ...prev }; delete n[h.id]; return n; });

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", habitId: h.id, date: snapshot.date }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error("toggle failed");
      setOverrides((prev) => ({ ...prev, [h.id]: json.completed }));
    } catch (e) {
      setOverrides((prev) => ({ ...prev, [h.id]: h.completed }));
      setToggleErrors((prev) => ({
        ...prev,
        [h.id]: e instanceof Error ? e.message : "Failed",
      }));
    }
  }

  return (
    <div className="card">
      <div className="card-label hb-card-header">
        <span>01 // TODAY · HABITS</span>
        <span className={`hb-count-chip ${allDone ? "done" : ""}`}>
          {effectiveCount} / {totalToday}
        </span>
      </div>

      {totalToday === 0 ? (
        <p className="hb-empty">No habits configured in HC yet.</p>
      ) : (
        <>
          <div className="hb-progress">
            <div className="hb-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <ul className="hb-list">
            {habits.map((h) => {
              const done = effectiveCompleted(h);
              return (
                <li key={h.id} className={`hb-item${done ? " done" : ""}`}>
                  <button
                    className={`hb-check${done ? " done" : ""}`}
                    onClick={() => toggle(h)}
                    aria-label={`${done ? "Uncheck" : "Check"} ${h.name}`}
                  />
                  <span className="hb-name">{h.name}</span>
                  <span className="hb-xp">+{h.xp_per_completion} XP</span>
                  {toggleErrors[h.id] && (
                    <span className="hb-toggle-error">{toggleErrors[h.id]}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="hb-streak">
            7-day consistency · <strong>{Math.round(streak7DayPct)}%</strong>
          </div>
        </>
      )}
    </div>
  );
}

function JournalCard({ snapshot }: { snapshot: Snapshot; onRefetch: () => void }) {
  const existing = snapshot.journal;
  const initMoodIdx = existing?.energy_level != null
    ? MOOD_OPTS.findIndex((o) => o[2] === existing.energy_level)
    : -1;
  const [moodIdx, setMoodIdx] = useState<number | null>(initMoodIdx >= 0 ? initMoodIdx : null);
  const [text, setText] = useState(existing?.raw_text ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveJournal = useCallback(
    async (newText: string, newMoodIdx: number | null) => {
      setSaving(true);
      setSaveError(null);
      try {
        const energyLevel =
          newMoodIdx != null ? MOOD_OPTS[newMoodIdx][2] : null;
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "journal",
            date: snapshot.date,
            text: newText,
            energyLevel,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error("journal save failed");
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [snapshot.date]
  );

  // Debounced text save
  function handleTextChange(val: string) {
    setText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveJournal(val, moodIdx);
    }, 800);
  }

  // Immediate save on blur
  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveJournal(text, moodIdx);
  }

  function handleMoodClick(idx: number) {
    const next = moodIdx === idx ? null : idx;
    setMoodIdx(next);
    // Immediate save on mood change
    saveJournal(text, next);
  }

  return (
    <div className="card">
      <div className="card-label">02 // TODAY · JOURNAL</div>

      <div className="hb-mood">
        {MOOD_OPTS.map(([emoji, label], i) => (
          <button
            key={i}
            className={`hb-mood-btn${moodIdx === i ? " selected" : ""}`}
            onClick={() => handleMoodClick(i)}
            title={label}
            aria-label={label}
          >
            {emoji}
          </button>
        ))}
      </div>

      {moodIdx != null && <div className="hb-mood-current">Energy: {MOOD_OPTS[moodIdx][1]} ({MOOD_OPTS[moodIdx][2]} / 10)</div>}

      <textarea
        className="hb-journal-input"
        placeholder="One line reflection (optional)"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        rows={3}
      />

      {saving && <span className="hb-save-status">saving…</span>}
      {saveError && <span className="hb-save-error">{saveError}</span>}
    </div>
  );
}

function WeekCard({ week, mirrorPrompt }: { week: Week | null; mirrorPrompt: string }) {
  return (
    <div className="card hb-mirror">
      <div className="card-label">03 // THIS WEEK</div>

      {week ? (
        <div className="hb-stats">
          <div className="hb-stat">
            <span className="hb-stat-num">{week.shipsThisWeek}</span>
            <span className="hb-stat-label">Ships</span>
          </div>
          <div className="hb-stat">
            <span className="hb-stat-num">{week.habitsCompletedThisWeek}</span>
            <span className="hb-stat-label">Habits done</span>
          </div>
          <div className="hb-stat">
            <span className="hb-stat-num">{week.daysJournaled} / 7</span>
            <span className="hb-stat-label">Days journaled</span>
          </div>
          <div className="hb-stat">
            <span className="hb-stat-num">
              {week.avgMood != null ? week.avgMood.toFixed(1) + " / 10" : "—"}
            </span>
            <span className="hb-stat-label">Avg mood</span>
          </div>
        </div>
      ) : (
        <p className="hb-empty">No week data yet.</p>
      )}

      <p className="hb-prompt">
        <em>{mirrorPrompt}</em>
      </p>
    </div>
  );
}
