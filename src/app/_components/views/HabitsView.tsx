"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useMode } from "../ModeProvider";
import { MODE_CONFIG, applyHabitTagFilter } from "../../../lib/modes";
import { createBrowserSupabaseClient } from "../../../lib/realtimeBrowser";
import { subscribeMultipleTables } from "../../../lib/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { RealtimeConfig } from "../../api/realtime/config/route";
import { RitualGate } from "../Ritual/RitualGate";
import { SeasonTierCard } from "../Habits/SeasonTierCard";
import { AnchorRow } from "../Habits/AnchorRow";
import { WeeklyGrid } from "../Habits/WeeklyGrid";
import { RankUpModal } from "../Habits/RankUpModal";
import { HabitEditorDrawer } from "../Habits/HabitEditorDrawer";
import { NewHabitButton } from "../Habits/HabitEditorButton";
import type { HabitCardResult } from "../Habits/HabitCard";
import type { Habit, SeasonStatus, Tier } from "../Habits/types";

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
  | { connected: true; snapshot: Snapshot; week: Week | null; season: SeasonStatus | null };

const MIRROR_PROMPTS = [
  "Are you being who you said you wanted to be this week?",
  "The record, not the intention, is the truth.",
  "Light check: what's the one thing you avoided?",
  "What's stayed constant this week?",
  "Shipping is the only signal.",
  "You already know what the next move is.",
  "Plurality without a ship is just noise.",
];

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

const TIER_ORDER: Tier[] = ["F", "D", "C", "B", "A", "S", "SSS"];
const tierIdx = (t: Tier) => TIER_ORDER.indexOf(t);

export function HabitsView() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rankUp, setRankUp] = useState<{ from: Tier; to: Tier } | null>(null);
  const lastTierRef = useRef<Tier | null>(null);
  const { brand } = useMode();

  // Habit editor drawer state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/habits?date=${todayLocal()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      if (json.connected && json.season) {
        if (lastTierRef.current && tierIdx(json.season.tier) > tierIdx(lastTierRef.current)) {
          setRankUp({ from: lastTierRef.current, to: json.season.tier });
        }
        lastTierRef.current = json.season.tier;
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Realtime: subscribe to HC habits + habit_completions ─────────────────
  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null = null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.hcUrl || !cfg.hcPublishableKey) return; // graceful no-op

        const client = await createBrowserSupabaseClient(cfg.hcUrl, cfg.hcPublishableKey);
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeMultipleTables({
          client,
          channelName: "habits-realtime",
          tables: [
            { table: "habits" },
            { table: "habit_completions" },
          ],
          onchange: () => { void fetchData(); },
        });
      } catch {
        // Realtime is best-effort — never surface errors to the user.
      }
    }

    void setupRealtime();

    return () => {
      destroyed = true;
      if (supabaseClient && channel) {
        supabaseClient.removeChannel(channel);
      }
    };
  }, [fetchData]);

  const brandCfg = brand ? MODE_CONFIG[brand] : null;

  type HabitWithTags = Habit & { tags?: string[] };
  const filteredData: ApiData | null =
    data && data.connected && brand
      ? {
          ...data,
          snapshot: {
            ...data.snapshot,
            habits: applyHabitTagFilter(
              data.snapshot.habits as HabitWithTags[],
              brand,
              "tags" as keyof HabitWithTags
            ) as Habit[],
          },
        }
      : data;

  function openNewHabit() {
    setEditingHabit(null);
    setEditorOpen(true);
  }

  function openEditHabit(habit: Habit) {
    setEditingHabit(habit);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingHabit(null);
  }

  return (
    <div className="view view-habits">
      <div className="view-header">
        <h1 className="view-title">Habits</h1>
        <div className="view-sub">SEASON · ANCHORS · WEEKLY</div>
        <NewHabitButton onClick={openNewHabit} />
      </div>

      {brandCfg && (
        <div className="cm-filter-hint">
          <span className="cm-filter-glyph">{brandCfg.glyph}</span>
          {" "}filtered by {brandCfg.label}
        </div>
      )}

      {loading && !filteredData && <LoadingCard />}
      {fetchError && <div className="card"><div className="card-label">ERROR</div><p>{fetchError}</p><button className="fl-btn-primary" onClick={fetchData}>Retry</button></div>}
      {!loading && !fetchError && filteredData && !filteredData.connected && (
        <SetupCard hint={filteredData.hint} onRetry={fetchData} />
      )}
      {!loading && !fetchError && filteredData && filteredData.connected && (
        <ConnectedView
          snapshot={filteredData.snapshot}
          week={filteredData.week}
          season={filteredData.season}
          onRefetch={fetchData}
          onEditHabit={openEditHabit}
        />
      )}

      <RitualGate />

      {rankUp && (
        <RankUpModal from={rankUp.from} to={rankUp.to} onDone={() => setRankUp(null)} />
      )}

      {editorOpen && (
        <HabitEditorDrawer
          habit={editingHabit}
          onClose={closeEditor}
          onSaved={fetchData}
        />
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
  season,
  onRefetch,
  onEditHabit,
}: {
  snapshot: Snapshot;
  week: Week | null;
  season: SeasonStatus | null;
  onRefetch: () => void;
  onEditHabit: (habit: Habit) => void;
}) {
  void onEditHabit; // available for future per-card edit buttons; wired through here
  const mirrorPrompt = MIRROR_PROMPTS[new Date().getDay() % MIRROR_PROMPTS.length];

  // Bucket: anchors = no weekly_target (treated as daily). Weekly = has weekly_target.
  const anchors = snapshot.habits.filter((h) => !h.weekly_target);
  const weekly = snapshot.habits.filter((h) => !!h.weekly_target);

  const onComplete = useCallback(
    async (habit: Habit, actualValue: number | null): Promise<HabitCardResult | void> => {
      try {
        const res = await fetch("/api/habits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            habitId: habit.id,
            actualValue,
            date: snapshot.date,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!json.ok) throw new Error("complete failed");
        // Fire refetch but compute the burst from the local data we know.
        const baseXP = habit.xp_per_completion;
        let mult = 1.0;
        if (habit.target_value && habit.target_value > 0 && actualValue != null) {
          mult = Math.min(1.5, Math.max(1.0, actualValue / habit.target_value));
        }
        const earned = Math.round(baseXP * mult);
        const bonus = mult > 1.0;
        // Trigger refresh after a tick so the +XP burst gets to render.
        setTimeout(onRefetch, 100);
        return { ok: true, earnedXP: earned, bonus };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("habit complete failed:", e);
        return { ok: false, earnedXP: 0, bonus: false };
      }
    },
    [snapshot.date, onRefetch],
  );

  return (
    <div className="ht-layout">
      {season && <SeasonTierCard season={season} />}

      {anchors.length === 0 && weekly.length === 0 && (
        <div className="card"><div className="card-label">01 // TODAY · HABITS</div><p className="hb-empty">No habits configured in HC yet.</p></div>
      )}

      {anchors.length > 0 && <AnchorRow habits={anchors} onComplete={onComplete} />}

      {weekly.length > 0 && <WeeklyGrid habits={weekly} onComplete={onComplete} />}

      <JournalCard snapshot={snapshot} onRefetch={onRefetch} />
      <WeekCard week={week} mirrorPrompt={mirrorPrompt} />
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

  function handleTextChange(val: string) {
    setText(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveJournal(val, moodIdx);
    }, 800);
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveJournal(text, moodIdx);
  }

  function handleMoodClick(idx: number) {
    const next = moodIdx === idx ? null : idx;
    setMoodIdx(next);
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
