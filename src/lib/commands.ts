"use client";
import { useCallback } from "react";
import { useActiveTab, type Tab } from "../app/_components/useActiveTab";
import { useMode } from "../app/_components/ModeProvider";
import { useBridgeMode } from "../app/_components/BridgeModeProvider";
import { ACTIVE_PROJECTS } from "./projects";
import { useRouter } from "next/navigation";
import type { BrandMode } from "./modes";

export type Command = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string[];
  run: () => void | Promise<void>;
};

type Destination =
  | "ship"
  | "queue"
  | "todo"
  | "hc-journal"
  | "essay"
  | "linkedin"
  | "yuriko";

function dispatchCapture(destination: Destination) {
  window.dispatchEvent(
    new CustomEvent("pgos:open-capture", { detail: { destination } }),
  );
}

export function useCommands(): Command[] {
  const { setActive } = useActiveTab();
  const { setBrand, setMode, setAutoMode } = useMode();
  const { toggle: toggleBridge, setMode: setHomeMode } = useBridgeMode();
  const router = useRouter();

  // ── Navigate ─────────────────────────────────────────────────────────────
  const navCommands: Command[] = (
    [
      { id: "home",     label: "Home",     tab: "home"     as Tab },
      { id: "habits",   label: "Habits",   tab: "habits"   as Tab },
      { id: "projects", label: "Projects", tab: "projects" as Tab },
      { id: "flow",     label: "Flow",     tab: "flow"     as Tab },
      { id: "claude",   label: "Claude",   tab: "claude"   as Tab },
    ] as Array<{ id: string; label: string; tab: Tab }>
  ).map(({ id, label, tab }) => ({
    id: `nav.${id}`,
    label: `Go to ${label}`,
    group: "Navigate",
    keywords: ["tab", "switch", label.toLowerCase()],
    run: () => setActive(tab),
  }));

  // ── Capture ───────────────────────────────────────────────────────────────
  const captureCommands: Command[] = (
    [
      { dest: "ship",       label: "Capture → Ship",       hint: "Add to ship log" },
      { dest: "queue",      label: "Capture → Queue",      hint: "Drop into queue" },
      { dest: "todo",       label: "Capture → Todo",       hint: "Create a task" },
      { dest: "hc-journal", label: "Capture → HC Journal", hint: "Write to journal" },
      { dest: "essay",      label: "Capture → Essay",      hint: "Start essay draft" },
      { dest: "linkedin",   label: "Capture → LinkedIn",   hint: "Draft LinkedIn post" },
      { dest: "yuriko",     label: "Capture → Yuriko",     hint: "Send to Yuriko" },
    ] as Array<{ dest: Destination; label: string; hint: string }>
  ).map(({ dest, label, hint }) => ({
    id: `capture.${dest}`,
    label,
    group: "Capture",
    hint,
    keywords: ["capture", dest, "write", "log"],
    run: () => dispatchCapture(dest),
  }));

  // ── Launch Project ────────────────────────────────────────────────────────
  const launchCommands: Command[] = ACTIVE_PROJECTS.map((p) => ({
    id: `project.launch.${p.id}`,
    label: `Launch ${p.name}`,
    group: "Projects",
    hint: p.sub,
    keywords: ["launch", "open", "terminal", p.id, p.name.toLowerCase()],
    run: () => void fetch("/api/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: p.id }),
    }),
  }));

  // ── Open Project ──────────────────────────────────────────────────────────
  const openProjectCommands: Command[] = ACTIVE_PROJECTS.map((p) => ({
    id: `project.open.${p.id}`,
    label: `Open ${p.name}`,
    group: "Projects",
    hint: p.sub,
    keywords: ["open", "view", "detail", p.id, p.name.toLowerCase()],
    run: () => router.push(`/projects/${p.id}`),
  }));

  // ── Run Agent ─────────────────────────────────────────────────────────────
  const agentCommands: Command[] = (
    [
      { id: "morning-briefing", label: "Morning Briefing" },
      { id: "session-review",   label: "Session Review"   },
      { id: "enrich-review",    label: "Enrich Review"    },
    ] as Array<{ id: string; label: string }>
  ).map(({ id, label }) => ({
    id: `agent.run.${id}`,
    label: `Run ${label}`,
    group: "Agents",
    keywords: ["agent", "run", "trigger", id, label.toLowerCase()],
    run: () => void fetch("/api/claude/run-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: id }),
    }),
  }));

  // ── Brand Mode ────────────────────────────────────────────────────────────
  const brandCommands: Command[] = (
    [
      { id: "alchmy",    label: "Alchmy"    },
      { id: "voyager",   label: "Voyager"   },
      { id: "writer",    label: "Writer"    },
      { id: "metrasens", label: "Metrasens" },
      { id: "recovery",  label: "Recovery"  },
    ] as Array<{ id: BrandMode; label: string }>
  ).map(({ id, label }) => ({
    id: `mode.toggle.${id}`,
    label: `Switch to ${label}`,
    group: "Brand",
    keywords: ["brand", "mode", "switch", id, label.toLowerCase()],
    run: () => setBrand(id),
  }));

  // ── Palette ───────────────────────────────────────────────────────────────
  type PaletteId = "laputa-day" | "laputa-twilight" | "laputa-midnight" | "howls" | "totoro" | "mononoke";
  const paletteCommands: Command[] = (
    [
      { id: "laputa-day",      label: "Laputa Day",         keywords: ["day", "morning", "afternoon", "powder", "blue", "sky", "light"] },
      { id: "laputa-twilight", label: "Laputa Twilight",    keywords: ["twilight", "dusk", "evening", "deep blue", "amber"] },
      { id: "laputa-midnight", label: "Laputa Midnight",    keywords: ["midnight", "night", "starlight", "ink"] },
      { id: "howls",           label: "Howl's Golden Hour", keywords: ["howls", "amber", "gold", "warm", "alt"] },
      { id: "totoro",          label: "Totoro Dusk",        keywords: ["totoro", "firefly", "moss", "alt"] },
      { id: "mononoke",        label: "Mononoke Forest",    keywords: ["mononoke", "forest", "spirit", "alt"] },
    ] as Array<{ id: PaletteId; label: string; keywords: string[] }>
  ).map(({ id, label, keywords }) => ({
    id: `palette.${id}`,
    label,
    group: "Palette",
    keywords: ["palette", "theme", "color", id, ...keywords],
    run: () => setMode(id),
  }));

  // Restore time-based auto-cycling after a manual ⌘K palette pick.
  paletteCommands.push({
    id: "palette.auto",
    label: "Resume Auto Palette",
    group: "Palette",
    hint: "Track time of day",
    keywords: ["palette", "auto", "resume", "time", "day", "natural", "default"],
    run: () => setAutoMode(true),
  });

  // ── Home mode (Bridge ↔ Personal) ─────────────────────────────────────────
  const homeModeCommands: Command[] = [
    {
      id: "home.toggle",
      label: "Toggle Bridge / Personal",
      group: "Home",
      hint: "⌘/",
      keywords: ["bridge", "personal", "home", "toggle", "command center", "mode"],
      run: () => toggleBridge(),
    },
    {
      id: "home.bridge",
      label: "Home → Bridge",
      group: "Home",
      hint: "Command center",
      keywords: ["bridge", "command", "center", "comms", "crew", "home"],
      run: () => setHomeMode("bridge"),
    },
    {
      id: "home.personal",
      label: "Home → Personal",
      group: "Home",
      hint: "Ghibli widgets",
      keywords: ["personal", "widgets", "ghibli", "home", "ambient"],
      run: () => setHomeMode("personal"),
    },
  ];

  // ── Briefing / Evening ────────────────────────────────────────────────────
  const ceremonyCommands: Command[] = [
    {
      id: "briefing.show",
      label: "Morning Briefing",
      group: "Rituals",
      keywords: ["morning", "briefing", "ritual", "day", "show"],
      run: () => router.push("/briefing"),
    },
    {
      id: "evening.show",
      label: "Evening Ceremony",
      group: "Rituals",
      keywords: ["evening", "ceremony", "ritual", "night", "show", "close"],
      run: () => router.push("/evening"),
    },
  ];

  return useCallback(
    () => [
      ...navCommands,
      ...captureCommands,
      ...launchCommands,
      ...openProjectCommands,
      ...agentCommands,
      ...brandCommands,
      ...paletteCommands,
      ...homeModeCommands,
      ...ceremonyCommands,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setActive, setBrand, setMode, setAutoMode, toggleBridge, setHomeMode, router],
  )();
}
