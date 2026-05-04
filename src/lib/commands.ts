"use client";
import { useCallback } from "react";
import { useActiveTab, type Tab } from "../app/_components/useActiveTab";
import { useMode } from "../app/_components/ModeProvider";
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
  const { setBrand, setMode } = useMode();
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
  const paletteCommands: Command[] = (
    [
      { id: "howls",     label: "Howl's Golden Hour", keywords: ["day", "morning", "afternoon", "amber", "gold"] },
      { id: "totoro",    label: "Totoro Dusk",        keywords: ["twilight", "dusk", "evening", "firefly"] },
      { id: "mononoke",  label: "Mononoke Forest",    keywords: ["midnight", "night", "forest", "spirit"] },
    ] as Array<{ id: "howls" | "totoro" | "mononoke"; label: string; keywords: string[] }>
  ).map(({ id, label, keywords }) => ({
    id: `palette.${id}`,
    label,
    group: "Palette",
    keywords: ["palette", "theme", "color", id, ...keywords],
    run: () => {
      document.documentElement.dataset.variant = id;
      localStorage.setItem("pg-os-laputa-manual", id);
      localStorage.setItem("pg-os-laputa-auto", "0");
      setMode(id);
    },
  }));

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
      hint: "Ships in W3",
      keywords: ["evening", "ceremony", "ritual", "night", "show"],
      run: () => {
        console.log("evening ceremony ships in W3");
        alert("Evening ceremony ships in Week 03");
      },
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
      ...ceremonyCommands,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setActive, setBrand, setMode, router],
  )();
}
