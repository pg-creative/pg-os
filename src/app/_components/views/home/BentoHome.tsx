"use client";

import { useEffect, useState } from "react";
import { TabShell } from "../../bento/TabShell";
import { BentoBox } from "../../bento/BentoBox";
import { useEmaki } from "../../bento/emakiContext";

// ---- helpers ----

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning, Patrick.";
  if (h < 18) return "Good afternoon, Patrick.";
  return "Good evening, Patrick.";
}

function datestamp(): string {
  const d = new Date();
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function relTime(ms: number | null | undefined): string {
  if (!ms) return "";
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  return `${Math.floor(diffSec / 86400)}d`;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

// ---- types ----

interface VitalsData {
  authed: boolean;
  recovery?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  sleepHours?: number | null;
}

interface CalEvent {
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
}

interface CalData {
  authed: boolean;
  events?: CalEvent[];
}

interface SpotifyData {
  playing: boolean;
  track?: { name: string; artists: string; album: string };
}

interface ProjectItem {
  id?: string;
  name?: string;
  uncommittedCount?: number;
  lastCommitAt?: number | null;
}

interface ProjectsData {
  projects?: ProjectItem[];
}

interface AgentItem {
  name: string;
  lastRun: string | null;
  lastStatus: string;
}

interface AgentsData {
  agents?: AgentItem[];
}

// ---- mock fallbacks ----

const MOCK_VITALS: VitalsData = {
  authed: false,
  recovery: 84,
  hrv: 62,
  restingHr: 54,
  sleepHours: 7.4,
};
const MOCK_CAL: CalData = {
  authed: false,
  events: [
    {
      summary: "Metrasens sync",
      start: new Date().toISOString().replace(/T.*/, "T09:00:00"),
      end: "",
      allDay: false,
    },
    {
      summary: "HC design review",
      start: new Date().toISOString().replace(/T.*/, "T12:00:00"),
      end: "",
      allDay: false,
    },
    {
      summary: "Coffee",
      start: new Date().toISOString().replace(/T.*/, "T15:30:00"),
      end: "",
      allDay: false,
    },
  ],
};
const MOCK_SPOTIFY: SpotifyData = {
  playing: false,
  track: {
    name: "One Summer's Day",
    artists: "Joe Hisaishi",
    album: "Spirited Away OST",
  },
};
const MOCK_PROJECTS: ProjectsData = {
  projects: [
    {
      id: "personal-os",
      name: "personal-os",
      uncommittedCount: 2,
      lastCommitAt: Date.now() - 3 * 60 * 1000,
    },
    {
      id: "heros-chronicle",
      name: "heros-chronicle",
      uncommittedCount: 0,
      lastCommitAt: Date.now() - 18 * 60 * 1000,
    },
  ],
};
const MOCK_AGENTS: AgentsData = {
  agents: [
    { name: "session-review", lastRun: "1h ago", lastStatus: "ok" },
    { name: "morning-briefing", lastRun: "6h ago", lastStatus: "ok" },
    { name: "weekly-meta-audit", lastRun: "2d ago", lastStatus: "error" },
  ],
};

// ---- sub-components ----

function VitalsContent({ data }: { data: VitalsData }) {
  const { tk } = useEmaki();
  const stats = [
    {
      label: "Recovery",
      value: data.recovery != null ? `${data.recovery}%` : "--",
    },
    { label: "HRV", value: data.hrv != null ? `${data.hrv} ms` : "--" },
    {
      label: "Rest HR",
      value: data.restingHr != null ? `${data.restingHr} bpm` : "--",
    },
    {
      label: "Sleep",
      value: data.sleepHours != null ? `${data.sleepHours} h` : "--",
    },
  ];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px 16px",
      }}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div
            style={{
              fontSize: "var(--text-2xs)",
              color: tk.textMuted,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            {s.label}
          </div>
          <div
            style={{
              fontSize: "var(--text-lg)",
              fontFamily: "var(--mono), ui-monospace, monospace",
              color: tk.accent,
              fontWeight: 600,
            }}
          >
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarContent({ data }: { data: CalData }) {
  const { tk } = useEmaki();
  const events = (data.events ?? []).slice(0, 6);
  if (events.length === 0) {
    return (
      <div style={{ color: tk.textMuted, fontSize: "var(--text-xs)" }}>
        No events today.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {events.map((ev, i) => (
        <div
          key={i}
          style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
        >
          <span
            style={{
              fontFamily: "var(--mono), ui-monospace, monospace",
              fontSize: "var(--text-2xs)",
              color: tk.gold,
              minWidth: 38,
              paddingTop: 1,
            }}
          >
            {ev.allDay ? "ALL" : fmtTime(ev.start)}
          </span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: tk.textPrimary,
              lineHeight: 1.4,
            }}
          >
            {ev.summary}
          </span>
        </div>
      ))}
    </div>
  );
}

function SpotifyContent({ data }: { data: SpotifyData }) {
  const { tk } = useEmaki();
  if (!data.track) {
    return (
      <div style={{ color: tk.textMuted, fontSize: "var(--text-xs)" }}>
        Nothing playing.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: data.playing ? tk.foxfire : tk.textMuted,
            flexShrink: 0,
            boxShadow: data.playing ? `0 0 6px ${tk.foxfire}` : "none",
          }}
        />
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: data.playing ? tk.foxfire : tk.textMuted,
            fontFamily: "var(--mono), ui-monospace, monospace",
            letterSpacing: "0.1em",
          }}
        >
          {data.playing ? "NOW PLAYING" : "LAST PLAYED"}
        </span>
      </div>
      <div
        style={{
          fontSize: "var(--text-sm)",
          color: tk.textPrimary,
          fontWeight: 600,
          marginTop: 4,
          lineHeight: 1.3,
        }}
      >
        {data.track.name}
      </div>
      <div style={{ fontSize: "var(--text-xs)", color: tk.textSub }}>
        {data.track.artists}
      </div>
      <div
        style={{
          fontSize: "var(--text-2xs)",
          color: tk.textMuted,
          marginTop: 2,
        }}
      >
        {data.track.album}
      </div>
    </div>
  );
}

function FleetContent({ data }: { data: ProjectsData }) {
  const { tk } = useEmaki();
  const projects = [...(data.projects ?? [])]
    .sort((a, b) => (b.lastCommitAt ?? 0) - (a.lastCommitAt ?? 0))
    .slice(0, 5);
  if (projects.length === 0) {
    return (
      <div style={{ color: tk.textMuted, fontSize: "var(--text-xs)" }}>
        No projects found.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {projects.map((p, i) => {
        const running = (p.uncommittedCount ?? 0) > 0;
        return (
          <div
            key={p.id ?? i}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                background: running ? tk.foxfire : tk.divider,
                boxShadow: running ? `0 0 6px ${tk.foxfire}` : "none",
              }}
            />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: tk.textPrimary,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.name ?? p.id ?? "unknown"}
            </span>
            <span
              style={{
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                color: tk.textMuted,
                flexShrink: 0,
              }}
            >
              {relTime(p.lastCommitAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AgentsContent({ data }: { data: AgentsData }) {
  const { tk } = useEmaki();
  const agents = (data.agents ?? []).slice(0, 5);
  if (agents.length === 0) {
    return (
      <div style={{ color: tk.textMuted, fontSize: "var(--text-xs)" }}>
        No agents found.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {agents.map((a, i) => {
        const ok = a.lastStatus === "ok";
        return (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                flexShrink: 0,
                background: ok ? "#4ade80" : "#f87171",
                boxShadow: ok ? "0 0 5px #4ade8077" : "0 0 5px #f8717177",
              }}
            />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: tk.textPrimary,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.name}
            </span>
            <span
              style={{
                fontFamily: "var(--mono), ui-monospace, monospace",
                fontSize: "var(--text-2xs)",
                color: tk.textMuted,
                flexShrink: 0,
              }}
            >
              {a.lastRun ?? "never"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- main component ----

export function BentoHome() {
  const [vitals, setVitals] = useState<VitalsData>(MOCK_VITALS);
  const [cal, setCal] = useState<CalData>(MOCK_CAL);
  const [spotify, setSpotify] = useState<SpotifyData>(MOCK_SPOTIFY);
  const [projects, setProjects] = useState<ProjectsData>(MOCK_PROJECTS);
  const [agents, setAgents] = useState<AgentsData>(MOCK_AGENTS);

  // running project count for Fleet header
  const runningCount = (projects.projects ?? []).filter(
    (p) => (p.uncommittedCount ?? 0) > 0,
  ).length;
  // ok/total for agents header
  const okCount = (agents.agents ?? []).filter(
    (a) => a.lastStatus === "ok",
  ).length;

  useEffect(() => {
    // fire all five fetches in parallel; failures silently keep the mock
    fetch("/api/vitals/whoop")
      .then((r) => r.json())
      .then((d: VitalsData) => {
        if (d.authed || d.recovery != null) setVitals(d);
      })
      .catch(() => {});

    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((d: CalData) => {
        if (d.events) setCal(d);
      })
      .catch(() => {});

    fetch("/api/spotify/now-playing")
      .then((r) => r.json())
      .then((d: SpotifyData) => setSpotify(d))
      .catch(() => {});

    fetch("/api/projects")
      .then((r) => r.json())
      .then((d: ProjectsData) => {
        if (d.projects) setProjects(d);
      })
      .catch(() => {});

    fetch("/api/claude/agents")
      .then((r) => r.json())
      .then((d: AgentsData) => {
        if (d.agents) setAgents(d);
      })
      .catch(() => {});
  }, []);

  return (
    <TabShell title={greeting()} eyebrow={datestamp()}>
      {/* Row 1: Vitals 4 + Calendar 5 + Now Playing 3 = 12 */}
      <BentoBox cols={4} eyebrow="01 // VITALS" kanji="体">
        <VitalsContent data={vitals} />
      </BentoBox>

      <BentoBox cols={5} eyebrow="02 // TODAY" kanji="日" scroll>
        <CalendarContent data={cal} />
      </BentoBox>

      <BentoBox cols={3} eyebrow="03 // NOW PLAYING" kanji="楽">
        <SpotifyContent data={spotify} />
      </BentoBox>

      {/* Row 2: Fleet 6 + Agents 6 = 12 */}
      <BentoBox
        cols={6}
        eyebrow="04 // FLEET"
        kanji="艦"
        count={runningCount > 0 ? `${runningCount} running` : "all idle"}
        scroll
      >
        <FleetContent data={projects} />
      </BentoBox>

      <BentoBox
        cols={6}
        eyebrow="05 // AGENTS"
        kanji="神"
        count={`${okCount}/${(agents.agents ?? []).length} ok`}
        scroll
      >
        <AgentsContent data={agents} />
      </BentoBox>
    </TabShell>
  );
}
