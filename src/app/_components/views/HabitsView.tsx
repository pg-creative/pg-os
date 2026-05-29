"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useMode } from "../ModeProvider";
import { MODE_CONFIG, applyHabitTagFilter } from "../../../lib/modes";
import { Skeleton } from "../Skeleton";
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
import { TabShell } from "../bento/TabShell";
import { BentoBox } from "../bento/BentoBox";
import { useEmaki } from "../bento/emakiContext";

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
  | {
      connected: false;
      hint: string;
      status: { connected: false; url: string | null; hasKey: boolean };
    }
  | {
      connected: true;
      snapshot: Snapshot;
      week: Week | null;
      season: SeasonStatus | null;
    };

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
        if (
          lastTierRef.current &&
          tierIdx(json.season.tier) > tierIdx(lastTierRef.current)
        ) {
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

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let supabaseClient: import("@supabase/supabase-js").SupabaseClient | null =
      null;
    let destroyed = false;

    async function setupRealtime() {
      try {
        const res = await fetch("/api/realtime/config");
        if (!res.ok) return;
        const cfg: RealtimeConfig = await res.json();
        if (!cfg.hcUrl || !cfg.hcPublishableKey) return;

        const client = await createBrowserSupabaseClient(
          cfg.hcUrl,
          cfg.hcPublishableKey,
        );
        if (!client || destroyed) return;

        supabaseClient = client;
        channel = subscribeMultipleTables({
          client,
          channelName: "habits-realtime",
          tables: [{ table: "habits" }, { table: "habit_completions" }],
          onchange: () => {
            void fetchData();
          },
        });
      } catch {
        // Realtime is best-effort
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
              "tags" as keyof HabitWithTags,
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

  // Build eyebrow: streak/season status when data is available
  const eyebrow = (() => {
    if (!filteredData?.connected) return "HABITS // SEASON · ANCHORS · WEEKLY";
    const s = filteredData.season;
    if (!s) return "HABITS // SEASON · ANCHORS · WEEKLY";
    return `HABITS // ${s.tier} · ${s.xp_earned} / ${s.xp_target} XP · day ${s.days_elapsed}`;
  })();

  return (
    <TabShell
      title="Habits"
      eyebrow={eyebrow}
      actions={<NewHabitButton onClick={openNewHabit} />}
    >
      {brandCfg && (
        <BentoBox cols={12} eyebrow="// FILTER">
          <FilterHint brandCfg={brandCfg} />
        </BentoBox>
      )}

      {loading && !filteredData && <LoadingTiles />}

      {fetchError && <ErrorTile error={fetchError} onRetry={fetchData} />}

      {!loading && !fetchError && filteredData && !filteredData.connected && (
        <SetupTile hint={filteredData.hint} onRetry={fetchData} />
      )}

      {!loading && !fetchError && filteredData && filteredData.connected && (
        <ConnectedTiles
          snapshot={filteredData.snapshot}
          week={filteredData.week}
          season={filteredData.season}
          onRefetch={fetchData}
          onEditHabit={openEditHabit}
        />
      )}

      <RitualGate />

      {rankUp && (
        <RankUpModal
          from={rankUp.from}
          to={rankUp.to}
          onDone={() => setRankUp(null)}
        />
      )}

      {editorOpen && (
        <HabitEditorDrawer
          habit={editingHabit}
          onClose={closeEditor}
          onSaved={fetchData}
        />
      )}
    </TabShell>
  );
}

function FilterHint({
  brandCfg,
}: {
  brandCfg: { glyph: string; label: string };
}) {
  const { tk } = useEmaki();
  return (
    <span style={{ color: tk.textSub, fontSize: "var(--text-sm)" }}>
      <span style={{ marginRight: 6 }}>{brandCfg.glyph}</span>
      filtered by {brandCfg.label}
    </span>
  );
}

function ErrorTile({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { tk } = useEmaki();
  return (
    <BentoBox cols={12} eyebrow="// ERROR">
      <p style={{ color: tk.textSub, marginBottom: 12 }}>{error}</p>
      <button
        onClick={onRetry}
        style={{
          background: "transparent",
          border: `1px solid ${tk.accent}`,
          borderRadius: 6,
          color: tk.accent,
          fontFamily: "var(--mono), ui-monospace, monospace",
          fontSize: "var(--text-xs)",
          padding: "6px 14px",
          cursor: "pointer",
          letterSpacing: "0.08em",
        }}
      >
        Retry
      </button>
    </BentoBox>
  );
}

function SetupTile({ hint, onRetry }: { hint: string; onRetry: () => void }) {
  const { tk } = useEmaki();
  return (
    <BentoBox cols={12} eyebrow="00 // HC NOT CONNECTED">
      <p style={{ color: tk.textSub, marginBottom: 10 }}>
        {hint ||
          "Habits + journal live in your Hero's Chronicle Supabase. Add HC_SUPABASE_SERVICE_ROLE_KEY to .env.local to connect."}
      </p>
      <pre
        style={{
          fontFamily: "var(--mono), ui-monospace, monospace",
          fontSize: "var(--text-xs)",
          color: tk.textMuted,
          background: "rgba(0,0,0,0.18)",
          borderRadius: 6,
          padding: "8px 12px",
          marginBottom: 12,
          overflowX: "auto",
        }}
      >
        HC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
      </pre>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a
          href="https://supabase.com/dashboard/project/ystqevehdgoonhpjmgis/settings/api"
          target="_blank"
          rel="noreferrer"
          style={{
            background: "transparent",
            border: `1px solid ${tk.accent}`,
            borderRadius: 6,
            color: tk.accent,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            padding: "6px 14px",
            letterSpacing: "0.08em",
            textDecoration: "none",
          }}
        >
          open Supabase dashboard
        </a>
        <button
          onClick={onRetry}
          style={{
            background: "transparent",
            border: `1px solid ${tk.divider}`,
            borderRadius: 6,
            color: tk.textSub,
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            padding: "6px 14px",
            cursor: "pointer",
            letterSpacing: "0.08em",
          }}
        >
          Retry connection
        </button>
      </div>
    </BentoBox>
  );
}

function LoadingTiles() {
  const { tk } = useEmaki();
  return (
    <>
      <BentoBox cols={4} eyebrow="01 // SEASON">
        <Skeleton variant="text" width="55%" height={20} />
        <div style={{ height: 14 }} />
        <Skeleton variant="pill" width="100%" height={10} />
        <div style={{ height: 10 }} />
        <Skeleton variant="text" width="40%" height={11} />
      </BentoBox>
      <BentoBox cols={8} eyebrow="02 // ANCHORS">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 0",
              borderBottom: i < 2 ? `1px solid ${tk.divider}` : undefined,
            }}
          >
            <Skeleton variant="avatar" width={28} height={28} />
            <Skeleton variant="text" width="60%" height={14} />
          </div>
        ))}
      </BentoBox>
      <BentoBox cols={12} eyebrow="03 // WEEKLY">
        <Skeleton variant="text" lines={3} />
      </BentoBox>
    </>
  );
}

function EditHabitButton({
  habit,
  onEditHabit,
}: {
  habit: Habit;
  onEditHabit: (habit: Habit) => void;
}) {
  const { tk } = useEmaki();
  return (
    <button
      onClick={() => onEditHabit(habit)}
      aria-label={`Edit habit: ${habit.name}`}
      title="Edit habit"
      style={{
        flexShrink: 0,
        background: "transparent",
        border: `1px solid ${tk.divider}`,
        borderRadius: 6,
        color: tk.textMuted,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        transition: "border-color 140ms ease, color 140ms ease",
        fontSize: 13,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = tk.accent;
        (e.currentTarget as HTMLButtonElement).style.color = tk.accent;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = tk.divider;
        (e.currentTarget as HTMLButtonElement).style.color = tk.textMuted;
      }}
    >
      ✎
    </button>
  );
}

function ConnectedTiles({
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
  const mirrorPrompt =
    MIRROR_PROMPTS[new Date().getDay() % MIRROR_PROMPTS.length];

  const anchors = snapshot.habits.filter((h) => !h.weekly_target);
  const weekly = snapshot.habits.filter((h) => !!h.weekly_target);

  const onComplete = useCallback(
    async (
      habit: Habit,
      actualValue: number | null,
    ): Promise<HabitCardResult | void> => {
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
        const baseXP = habit.xp_per_completion;
        let mult = 1.0;
        if (
          habit.target_value &&
          habit.target_value > 0 &&
          actualValue != null
        ) {
          mult = Math.min(1.5, Math.max(1.0, actualValue / habit.target_value));
        }
        const earned = Math.round(baseXP * mult);
        const bonus = mult > 1.0;
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
    <>
      {season && (
        <BentoBox cols={4} eyebrow="01 // SEASON">
          <SeasonTierCard season={season} />
        </BentoBox>
      )}

      {anchors.length === 0 && weekly.length === 0 && (
        <BentoBox cols={season ? 8 : 12} eyebrow="01 // TODAY · HABITS">
          <EmptyHints />
        </BentoBox>
      )}

      {anchors.length > 0 && (
        <BentoBox
          cols={season ? 8 : 12}
          eyebrow="02 // ANCHORS"
          scroll={anchors.length > 6}
        >
          {anchors.map((habit, i) => (
            <div
              key={habit.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom:
                  i < anchors.length - 1
                    ? `1px solid rgba(255,255,255,0.06)`
                    : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <AnchorRow habits={[habit]} onComplete={onComplete} />
              </div>
              <EditHabitButton habit={habit} onEditHabit={onEditHabit} />
            </div>
          ))}
        </BentoBox>
      )}

      {weekly.length > 0 && (
        <BentoBox cols={12} eyebrow="03 // WEEKLY" scroll={weekly.length > 5}>
          {weekly.map((habit, i) => (
            <div
              key={habit.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderBottom:
                  i < weekly.length - 1
                    ? `1px solid rgba(255,255,255,0.06)`
                    : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <WeeklyGrid habits={[habit]} onComplete={onComplete} />
              </div>
              <EditHabitButton habit={habit} onEditHabit={onEditHabit} />
            </div>
          ))}
        </BentoBox>
      )}

      <JournalTile snapshot={snapshot} onRefetch={onRefetch} />
      <WeekTile week={week} mirrorPrompt={mirrorPrompt} />
    </>
  );
}

function EmptyHints() {
  const { tk } = useEmaki();
  return (
    <p style={{ color: tk.textMuted, fontStyle: "italic" }}>
      No habits configured in HC yet.
    </p>
  );
}

function JournalTile({
  snapshot,
}: {
  snapshot: Snapshot;
  onRefetch: () => void;
}) {
  const { tk } = useEmaki();
  const existing = snapshot.journal;
  const initMoodIdx =
    existing?.energy_level != null
      ? MOOD_OPTS.findIndex((o) => o[2] === existing.energy_level)
      : -1;
  const [moodIdx, setMoodIdx] = useState<number | null>(
    initMoodIdx >= 0 ? initMoodIdx : null,
  );
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
    [snapshot.date],
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
    <BentoBox cols={6} eyebrow="04 // TODAY · JOURNAL">
      <div
        style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}
      >
        {MOOD_OPTS.map(([emoji, label], i) => (
          <button
            key={i}
            onClick={() => handleMoodClick(i)}
            title={label}
            aria-label={label}
            style={{
              fontSize: 22,
              background: moodIdx === i ? `rgba(0,0,0,0.22)` : "transparent",
              border: `1px solid ${moodIdx === i ? tk.accent : tk.divider}`,
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              transition: "border-color 140ms ease, background 140ms ease",
              lineHeight: 1,
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {moodIdx != null && (
        <div
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-xs)",
            color: tk.gold,
            marginBottom: 10,
            letterSpacing: "0.06em",
          }}
        >
          Energy: {MOOD_OPTS[moodIdx][1]} ({MOOD_OPTS[moodIdx][2]} / 10)
        </div>
      )}

      <textarea
        placeholder="One line reflection (optional)"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        rows={3}
        style={{
          width: "100%",
          background: "rgba(0,0,0,0.14)",
          border: `1px solid ${tk.divider}`,
          borderRadius: 8,
          color: tk.textPrimary,
          fontFamily: "var(--serif), Georgia, serif",
          fontSize: "var(--text-base)",
          padding: "10px 12px",
          resize: "none",
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.6,
        }}
      />

      {saving && (
        <span
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            color: tk.textMuted,
            letterSpacing: "0.1em",
          }}
        >
          saving...
        </span>
      )}
      {saveError && (
        <span
          style={{
            fontFamily: "var(--mono), ui-monospace, monospace",
            fontSize: "var(--text-2xs)",
            color: tk.foxfire,
          }}
        >
          {saveError}
        </span>
      )}
    </BentoBox>
  );
}

function WeekTile({
  week,
  mirrorPrompt,
}: {
  week: Week | null;
  mirrorPrompt: string;
}) {
  const { tk } = useEmaki();

  return (
    <BentoBox cols={6} eyebrow="05 // THIS WEEK">
      {week ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 20px",
            marginBottom: 16,
          }}
        >
          {[
            ["Ships", week.shipsThisWeek],
            ["Habits done", week.habitsCompletedThisWeek],
            ["Days journaled", `${week.daysJournaled} / 7`],
            [
              "Avg mood",
              week.avgMood != null ? `${week.avgMood.toFixed(1)} / 10` : "—",
            ],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <div
                style={{
                  fontFamily: "var(--serif), Georgia, serif",
                  fontSize: "var(--text-xl)",
                  fontWeight: 600,
                  color: tk.gold,
                  lineHeight: 1.1,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontFamily: "var(--mono), ui-monospace, monospace",
                  fontSize: "var(--text-2xs)",
                  color: tk.textMuted,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginTop: 2,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{ color: tk.textMuted, fontStyle: "italic", marginBottom: 16 }}
        >
          No week data yet.
        </p>
      )}

      <p
        style={{
          fontFamily: "var(--serif), Georgia, serif",
          fontSize: "var(--text-sm)",
          color: tk.textSub,
          fontStyle: "italic",
          borderTop: `1px solid ${tk.divider}`,
          paddingTop: 12,
          margin: 0,
        }}
      >
        {mirrorPrompt}
      </p>
    </BentoBox>
  );
}
