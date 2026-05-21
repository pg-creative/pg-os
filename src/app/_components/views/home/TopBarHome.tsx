"use client";

/**
 * V2TopBar — Broadsheet layout with horizontal top nav bar.
 * Emaki x Laputa aesthetic (LOCKED direction 2026-05-20).
 * Layout: top nav bar + full-width horizontal bands stacked down the page.
 * No left rail, no centered column. Each band owns the full canvas width.
 */

import React, { useState, useEffect } from "react";
import { PHASES, Phase, phaseForHour } from "../../emaki/theme";
import {
  EMAKI_CSS,
  useEmakiVars,
  KintsugiSeam,
  WashiPanel,
  GlyphSun,
  GlyphDusk,
  GlyphMoon,
} from "../../emaki/materials";

/* ── Mock data ── */

const DOW = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];
const MON = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];

function liveDatestamp() {
  const d = new Date();
  const dayOfYear = Math.floor(
    (d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return `${DOW[d.getDay()]} · ${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · DAY ${dayOfYear} OF 365`;
}

function liveGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

/* ── Live-data helpers + light response shapes (client-side mapping) ── */
type WhoopResp = {
  authed: boolean;
  recovery?: number | null;
  hrv?: number | null;
  restingHr?: number | null;
  sleepHours?: number | null;
};
type CalResp = {
  authed: boolean;
  events?: { summary: string; start: string; end: string; allDay: boolean }[];
};
type ProjResp = {
  projects?: {
    id?: string;
    name?: string;
    uncommittedCount?: number;
    lastCommitAt?: number | null;
  }[];
};
type AgentResp = {
  agents?: { name: string; lastRun: string | null; lastStatus: string }[];
};

function relTime(ms: number | null | undefined): string {
  if (!ms) return "--";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function eventTime(iso: string, allDay: boolean): string {
  if (allDay) return "all day";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function eventDuration(start: string, end: string): string {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return "";
  const min = Math.round((e - s) / 60000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const mm = min % 60;
  return mm ? `${h}h${mm}m` : `${h}h`;
}

function eventTag(title: string): "work" | "project" | "personal" {
  const s = title.toLowerCase();
  if (/metrasens|gtm|standup|sync|1:1|interview|meeting|call/.test(s))
    return "work";
  if (/hc|design|review|build|ship|os|project|spec|launch/.test(s))
    return "project";
  return "personal";
}

// Fallback shapes used as initial state until the live /api fetches resolve.
const MOCK_VITALS = [
  { val: "84", lbl: "Recovery", unit: "%" },
  { val: "62", lbl: "HRV", unit: "ms" },
  { val: "8.4", lbl: "Strain", unit: "/21" },
  { val: "6,240", lbl: "Steps", unit: "" },
];

const MOCK_CALENDAR_EVENTS = [
  {
    time: "09:00",
    title: "Metrasens — GTM sync",
    duration: "30m",
    tag: "work",
  },
  { time: "12:00", title: "HC design review", duration: "1h", tag: "project" },
  {
    time: "15:30",
    title: "Coffee · Maya Lin",
    duration: "45m",
    tag: "personal",
  },
];

// TODO: no real roadmap-checklist source yet (ProjectState carries blockers +
// topActions but not a done/not-done roadmap). Kept as a static stub for now.
const PROJECT_CHECKS = [
  { done: true, label: "Design system + 5-tab architecture" },
  { done: true, label: "Supabase + Whoop API wiring" },
  { done: true, label: "Vercel deploy · PWA" },
  { done: false, label: "iMessage integration · chat.db polling" },
  { done: false, label: "Login + onboarding variant selection" },
  { done: false, label: "Rive avatar wiring to UI" },
];

const MOCK_SESSIONS = [
  {
    project: "personal-os",
    status: "running" as const,
    lastActivity: "3m",
    tool: "Edit",
  },
  {
    project: "heros-chronicle",
    status: "idle" as const,
    lastActivity: "18m",
    tool: null,
  },
];

const MOCK_AGENTS = [
  { name: "session-review", lastRun: "1h", status: "ok" as const },
  { name: "morning-briefing", lastRun: "6h", status: "ok" as const },
  { name: "weekly-meta-audit", lastRun: "2d", status: "error" as const },
];

// TODO: wire Gmail route. No /api Gmail endpoint exists yet, so the inbox band
// stays on this stub rather than faking live mail.
const INBOX = [
  {
    initials: "ML",
    name: "Maya Lin",
    preview: "Re: HC v2.7 scope — need your sign-off today",
    time: "12M",
    urgent: true,
  },
  {
    initials: "TH",
    name: "Theo Harris",
    preview: "Moved our sync · new calendar invite attached",
    time: "48M",
    urgent: false,
  },
  {
    initials: "EN",
    name: "Eliza N.",
    preview: "Dinner Saturday still on? Booked a table",
    time: "2H",
    urgent: false,
  },
  {
    initials: "AC",
    name: "Anthropic Labs",
    preview: "Claude Design research preview · welcome packet",
    time: "5H",
    urgent: false,
  },
];

/* ── V2 local CSS — broadsheet band layout ── */
const LOCAL_CSS = `
  /* ── Topbar nav ── */
  .v2-topbar {
    position: relative;
    z-index: 30;
    width: 100%;
    display: flex;
    align-items: stretch;
    height: 52px;
    flex-shrink: 0;
    transition: background 0.5s ease, border-color 0.5s ease;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .v2-topbar-wordmark {
    display: flex;
    align-items: center;
    padding: 0 22px 0 20px;
    font-family: 'Noto Serif JP', serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    user-select: none;
    flex-shrink: 0;
    border-right: 1px solid;
    transition: color 0.5s ease, border-color 0.5s ease;
  }
  .v2-topbar-tabs {
    display: flex;
    align-items: stretch;
    flex: 1;
    gap: 0;
  }
  .v2-topbar-tab {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 0 20px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    cursor: pointer;
    position: relative;
    transition: background 0.18s, color 0.18s;
    white-space: nowrap;
    border: none;
    background: transparent;
  }
  .v2-topbar-tab:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: -2px;
  }
  /* Kintsugi gold underline on active tab */
  .v2-topbar-tab[aria-pressed="true"]::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 12px;
    right: 12px;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, var(--v2-kintsugi-start, #8c5c08) 20%, var(--v2-kintsugi-peak, #b87818) 50%, var(--v2-kintsugi-start, #8c5c08) 80%, transparent 100%);
    clip-path: polygon(0% 50%, 5% 0%, 18% 100%, 34% 0%, 50% 80%, 66% 0%, 82% 100%, 95% 0%, 100% 50%);
  }
  .v2-topbar-tab-glyph {
    font-size: 15px;
    line-height: 1;
  }
  .v2-topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 16px 0 8px;
    flex-shrink: 0;
    border-left: 1px solid;
    transition: border-color 0.5s ease;
  }

  /* ── Broadsheet layout shell ── */
  .v2-page {
    flex: 1;
    overflow-y: auto;
    position: relative;
    z-index: 10;
  }

  /* ── Band containers ── */
  .v2-band {
    width: 100%;
    position: relative;
    padding: 0;
  }
  .v2-band-inner {
    padding: 20px 32px;
  }
  @media (max-width: 640px) {
    .v2-band-inner { padding: 16px 16px; }
    .v2-topbar-tab-label { display: none; }
  }

  /* ── Band 1: Hero — clock + greeting + datestamp inline ── */
  .v2-hero-band {
    min-height: 96px;
    display: flex;
    align-items: center;
    gap: 0;
  }
  .v2-hero-clock {
    flex-shrink: 0;
    padding-right: 28px;
    border-right: 1px solid;
    margin-right: 28px;
    transition: border-color 0.5s ease;
  }
  .v2-clock-digits {
    font-family: 'DM Sans', monospace;
    font-size: clamp(36px, 5vw, 56px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum";
    letter-spacing: 0.04em;
    line-height: 1;
  }
  .v2-clock-tz {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-top: 5px;
  }
  .v2-hero-greeting {
    flex: 1;
  }
  .v2-greeting-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-family: 'Noto Serif JP', serif;
    margin-bottom: 5px;
  }
  .v2-greeting-main {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(20px, 3vw, 28px);
    font-weight: 700;
    line-height: 1.2;
  }
  .v2-greeting-date {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.05em;
    margin-top: 5px;
  }
  .v2-hero-kanji {
    flex-shrink: 0;
    padding-left: 28px;
    border-left: 1px solid;
    margin-left: 28px;
    text-align: right;
    transition: border-color 0.5s ease;
  }
  .v2-hero-kanji-text {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(16px, 2vw, 22px);
    font-weight: 700;
    line-height: 1.2;
  }
  .v2-hero-kanji-sub {
    font-family: 'Noto Serif JP', serif;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.06em;
    margin-top: 4px;
    text-align: right;
  }
  @media (max-width: 760px) {
    .v2-hero-kanji { display: none; }
  }

  /* ── Band 2: Operator + Vitals inline ── */
  .v2-op-vitals-band {
    display: flex;
    align-items: stretch;
    gap: 0;
    flex-wrap: wrap;
  }
  .v2-op-section {
    flex: 0 0 auto;
    min-width: 240px;
    padding-right: 28px;
    border-right: 1px solid;
    margin-right: 28px;
    transition: border-color 0.5s ease;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .v2-vitals-section {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  @media (max-width: 760px) {
    .v2-op-section { border-right: none; margin-right: 0; padding-right: 0; border-bottom: 1px solid; padding-bottom: 16px; margin-bottom: 16px; width: 100%; min-width: unset; }
    .v2-vitals-section { grid-template-columns: repeat(2, 1fr); }
  }
  .v2-op-name-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .v2-op-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .v2-op-name {
    font-family: 'Noto Serif JP', serif;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.15;
  }
  .v2-op-meta {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-top: 1px;
  }
  .v2-op-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .v2-op-tag {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: 20px;
    text-transform: uppercase;
  }
  .v2-vital-cell {
    padding: 10px 12px;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    transition: background 0.4s, border-color 0.4s;
  }
  .v2-vital-val {
    font-family: 'DM Sans', monospace;
    font-size: 22px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .v2-vital-lbl {
    font-family: 'Noto Serif JP', serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .v2-vital-unit {
    font-size: 11px;
    font-weight: 500;
    margin-left: 2px;
  }

  /* ── Band 3: Calendar + Now Playing ── */
  .v2-cal-np-band {
    display: flex;
    align-items: stretch;
    gap: 0;
    flex-wrap: wrap;
  }
  .v2-cal-section {
    flex: 1 1 0;
    min-width: 280px;
    padding-right: 28px;
    border-right: 1px solid;
    margin-right: 28px;
    transition: border-color 0.5s ease;
  }
  .v2-np-section {
    flex: 0 0 260px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
  }
  @media (max-width: 760px) {
    .v2-cal-section { border-right: none; margin-right: 0; padding-right: 0; border-bottom: 1px solid; padding-bottom: 16px; margin-bottom: 16px; width: 100%; }
    .v2-np-section { flex: none; width: 100%; }
  }
  .v2-cal-row {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 8px 0;
  }
  .v2-cal-row + .v2-cal-row {
    border-top: 1px solid;
  }
  .v2-cal-time {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    font-family: 'DM Sans', monospace;
    min-width: 40px;
    flex-shrink: 0;
  }
  .v2-cal-title {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
  }
  .v2-cal-dur {
    font-size: 12px;
    flex-shrink: 0;
  }
  .v2-np-art {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
  }
  .v2-np-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .v2-np-info { flex: 1; min-width: 0; }
  .v2-np-track {
    font-size: 15px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .v2-np-artist {
    font-size: 13px;
    font-weight: 400;
    margin-top: 2px;
  }
  .v2-np-eq {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 16px;
    flex-shrink: 0;
  }
  .v2-np-bar {
    width: 3px;
    border-radius: 1.5px;
    animation: v2-np-pulse var(--bar-dur, 0.9s) ease-in-out infinite alternate;
  }
  @keyframes v2-np-pulse {
    from { transform: scaleY(0.3); }
    to   { transform: scaleY(1); }
  }
  @media (prefers-reduced-motion: reduce) { .v2-np-bar { animation: none; } }

  /* ── Band 4: Active Project — full width hero-style ── */
  .v2-project-band {
    display: flex;
    align-items: flex-start;
    gap: 32px;
    flex-wrap: wrap;
  }
  .v2-project-left {
    flex: 0 0 auto;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .v2-project-title {
    font-family: 'Noto Serif JP', serif;
    font-size: clamp(18px, 2.5vw, 24px);
    font-weight: 700;
    line-height: 1.2;
  }
  .v2-project-sub {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .v2-progress-track {
    height: 6px;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 4px;
    min-width: 180px;
  }
  .v2-progress-fill {
    height: 100%;
    border-radius: 3px;
    width: 62%;
  }
  .v2-project-checks {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 24px;
  }
  @media (max-width: 640px) {
    .v2-project-checks { grid-template-columns: 1fr; }
    .v2-project-left { min-width: unset; width: 100%; }
  }
  .v2-check-row {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 0;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.4;
  }
  .v2-check-box {
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1.5px solid;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
  }

  /* ── Band 5: Crew (sessions + agents) — horizontal list ── */
  .v2-crew-band {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: stretch;
  }
  .v2-crew-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 8px;
    flex: 1 1 180px;
    min-width: 160px;
    transition: background 0.4s, border-color 0.4s;
  }
  .v2-crew-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .v2-crew-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .v2-crew-meta {
    font-size: 12px;
    flex-shrink: 0;
  }
  .v2-crew-tool-chip {
    display: inline-block;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-family: 'DM Sans', monospace;
    font-weight: 500;
    flex-shrink: 0;
  }

  /* ── Band 6: Inbox + Capture ── */
  .v2-inbox-capture-band {
    display: flex;
    align-items: stretch;
    gap: 0;
    flex-wrap: wrap;
  }
  .v2-inbox-section {
    flex: 1 1 0;
    min-width: 300px;
    padding-right: 28px;
    border-right: 1px solid;
    margin-right: 28px;
    transition: border-color 0.5s ease;
  }
  .v2-capture-section {
    flex: 0 0 240px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 12px;
  }
  @media (max-width: 760px) {
    .v2-inbox-section { border-right: none; margin-right: 0; padding-right: 0; border-bottom: 1px solid; padding-bottom: 16px; margin-bottom: 16px; width: 100%; }
    .v2-capture-section { flex: none; width: 100%; }
  }
  .v2-inbox-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 0;
  }
  .v2-inbox-row + .v2-inbox-row { border-top: 1px solid; }
  .v2-inbox-av {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .v2-inbox-body { flex: 1; min-width: 0; }
  .v2-inbox-name {
    font-size: 15px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 1px;
  }
  .v2-inbox-preview {
    font-size: 13px;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .v2-inbox-time { font-size: 12px; flex-shrink: 0; margin-top: 2px; }
  .v2-urgent-badge {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(248,113,113,0.18);
    border: 1px solid rgba(248,113,113,0.40);
    color: #F87171;
  }
  .v2-capture-cta {
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 6px;
    padding: 13px 20px;
    font-size: 15px;
    font-weight: 700;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.05em;
    cursor: pointer;
    border: 1px solid;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
    text-align: center;
    justify-content: center;
  }
  .v2-capture-cta:hover { filter: brightness(1.08); }
  .v2-capture-cta:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }

  /* ── Band label row ── */
  .v2-band-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-family: 'Noto Serif JP', serif;
    margin-bottom: 14px;
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .v2-band-label-right {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    font-family: 'DM Sans', sans-serif;
  }

  /* ── Online pip ── */
  .v2-online-pip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.10em;
    padding: 2px 8px;
    border-radius: 20px;
  }
  .v2-online-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #34D399;
    flex-shrink: 0;
  }
`;

/* ── Page ── */

export default function TopBarHome() {
  const [phase, setPhase] = useState<Phase>("night");
  const [clockStr, setClockStr] = useState("");
  const [datestamp, setDatestamp] = useState("");
  const [greeting, setGreeting] = useState("");
  const tk = PHASES[phase];

  // Live data: start from the mock shapes (so the layout never breaks on empty
  // or unauthenticated sources), then replace from the real /api routes.
  const [VITALS, setVitals] = useState(MOCK_VITALS);
  const [CALENDAR_EVENTS, setCalendar] = useState(MOCK_CALENDAR_EVENTS);
  const [SESSIONS, setSessions] = useState<
    {
      project: string;
      status: "running" | "idle";
      lastActivity: string;
      tool: string | null;
    }[]
  >(MOCK_SESSIONS);
  const [AGENTS, setAgents] = useState(MOCK_AGENTS);

  useEmakiVars(phase);

  useEffect(() => {
    setPhase(phaseForHour(new Date().getHours()));
  }, []);

  // ── Fetch real data, map to the band shapes, keep mock as fallback ──
  useEffect(() => {
    let cancelled = false;

    // Whoop vitals
    fetch("/api/vitals/whoop")
      .then((r) => r.json())
      .then((d: WhoopResp) => {
        if (cancelled || !d?.authed) return;
        const fmt = (n: number | null | undefined, dp = 0) =>
          n == null ? "--" : n.toFixed(dp);
        setVitals([
          { val: fmt(d.recovery), lbl: "Recovery", unit: "%" },
          { val: fmt(d.hrv), lbl: "HRV", unit: "ms" },
          { val: fmt(d.restingHr), lbl: "Rest HR", unit: "bpm" },
          { val: fmt(d.sleepHours, 1), lbl: "Sleep", unit: "h" },
        ]);
      })
      .catch(() => {});

    // Google Calendar
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((d: CalResp) => {
        if (cancelled || !d?.authed || !d.events?.length) return;
        setCalendar(
          d.events.slice(0, 6).map((e) => ({
            time: eventTime(e.start, e.allDay),
            title: e.summary,
            duration: eventDuration(e.start, e.end),
            tag: eventTag(e.summary),
          })),
        );
      })
      .catch(() => {});

    // Project fleet (proxy for live sessions: activity by git state)
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d: ProjResp) => {
        if (cancelled || !d?.projects?.length) return;
        const rows = d.projects
          .filter((p) => p.lastCommitAt)
          .sort((a, b) => (b.lastCommitAt ?? 0) - (a.lastCommitAt ?? 0))
          .slice(0, 4)
          .map((p) => ({
            project: p.name ?? p.id ?? "project",
            status: ((p.uncommittedCount ?? 0) > 0 ? "running" : "idle") as
              | "running"
              | "idle",
            lastActivity: relTime(p.lastCommitAt),
            tool: null as string | null,
          }));
        if (rows.length) setSessions(rows);
      })
      .catch(() => {});

    // Self-improvement agent health
    fetch("/api/claude/agents")
      .then((r) => r.json())
      .then((d: AgentResp) => {
        if (cancelled || !d?.agents?.length) return;
        setAgents(
          d.agents.slice(0, 4).map((a) => ({
            name: a.name,
            lastRun: a.lastRun ?? "never",
            status: (a.lastStatus === "ok" ? "ok" : "error") as "ok" | "error",
          })),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setClockStr(`${h}:${m}:${s}`);
      setDatestamp(liveDatestamp());
      setGreeting(liveGreeting());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Kintsugi underline color vars for the active tab pseudo-element */
  const kintsugiVars = {
    "--v2-kintsugi-start": tk.gold,
    "--v2-kintsugi-peak": tk.goldBright,
  } as React.CSSProperties;

  return (
    <>
      <style>{EMAKI_CSS}</style>
      <style>{LOCAL_CSS}</style>

      <div
        className="el-root"
        style={{
          flexDirection: "column",
          background: "transparent",
          transition: "background 0.6s ease",
          ["--hero-halo" as string]: tk.heroHalo,
          ["--panel-blur" as string]: phase === "day" ? "none" : "blur(10px)",
          ...kintsugiVars,
        }}
      >
        {/* Painted world comes from the GLOBAL EmakiBackdrop (page.tsx), full-bleed
            and immersive like the other tabs. Nav lives in the global EmakiShellBar. */}

        {/* ── PAGE SCROLL CANVAS ── */}
        <main className="v2-page">
          {/* ────────────────────────────────────────────────────────────────
              BAND 1 — HERO: clock + greeting + kanji title (tall, cinematic)
          ──────────────────────────────────────────────────────────────────── */}
          <WashiPanel
            tk={tk}
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: `1px solid ${tk.divider}`,
            }}
          >
            <div className="v2-band-inner v2-hero-band">
              {/* Clock block */}
              <div
                className="v2-hero-clock"
                style={{ borderColor: tk.divider }}
              >
                <div
                  className="v2-clock-digits"
                  style={{
                    color: tk.foxfire,
                    textShadow:
                      tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                  }}
                >
                  {clockStr || "00:00:00"}
                </div>
                <div className="v2-clock-tz" style={{ color: tk.textMuted }}>
                  UTC -05:00 · CDT
                </div>
              </div>

              {/* Greeting block */}
              <div className="v2-hero-greeting">
                <div
                  className="v2-greeting-eyebrow"
                  style={{ color: tk.eyebrowText }}
                >
                  {tk.eyebrowLabel}
                </div>
                <div
                  className="v2-greeting-main"
                  style={{
                    color: tk.textPrimary,
                    textShadow:
                      tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                  }}
                >
                  Good {greeting}, Patrick.
                </div>
                <div
                  className="v2-greeting-date"
                  style={{ color: tk.textMuted }}
                >
                  {datestamp}
                </div>
              </div>

              {/* Kanji title — right side */}
              <div
                className="v2-hero-kanji"
                style={{ borderColor: tk.divider }}
              >
                <div
                  className="v2-hero-kanji-text"
                  style={{
                    color: tk.textPrimary,
                    textShadow:
                      tk.heroHalo !== "none" ? tk.heroHalo : undefined,
                  }}
                >
                  {tk.kanji}
                </div>
                <div className="v2-hero-kanji-sub" style={{ color: tk.accent }}>
                  {tk.subtitle}
                </div>
              </div>
            </div>
          </WashiPanel>

          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          {/* ────────────────────────────────────────────────────────────────
              BAND 2 — OPERATOR + VITALS: identity left, stat grid right
          ──────────────────────────────────────────────────────────────────── */}
          <WashiPanel
            tk={tk}
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: `1px solid ${tk.divider}`,
            }}
          >
            <div className="v2-band-inner">
              <div className="v2-band-label" style={{ color: tk.gold }}>
                <span>01 // OPERATOR &amp; VITALS</span>
                <span
                  className="v2-band-label-right"
                  style={{ color: tk.textMuted }}
                >
                  WHOOP · LIVE · 18MS
                </span>
              </div>

              <div className="v2-op-vitals-band">
                {/* Operator */}
                <div
                  className="v2-op-section"
                  style={{ borderColor: tk.divider }}
                >
                  <div className="v2-op-name-row">
                    <div
                      className="v2-op-avatar"
                      style={{
                        background: `linear-gradient(135deg, ${tk.accent}30, ${tk.gold}20)`,
                        border: `1.5px solid ${tk.panelInkBorder}`,
                        color: tk.foxfire,
                      }}
                    >
                      PG
                    </div>
                    <div>
                      <div
                        className="v2-op-name"
                        style={{ color: tk.textPrimary }}
                      >
                        Patrick <em>Smith</em>
                      </div>
                      <div
                        className="v2-op-meta"
                        style={{ color: tk.textMuted }}
                      >
                        GTM ENGINEER · CHICAGO
                      </div>
                    </div>
                  </div>
                  <div className="v2-op-tags">
                    {[
                      { label: "DEEP WORK" },
                      { label: "DND" },
                      { label: "A · TIER III" },
                      { label: "STREAK 29D" },
                    ].map((tag) => (
                      <span
                        key={tag.label}
                        className="v2-op-tag"
                        style={{
                          background: `${tk.accent}14`,
                          border: `1px solid ${tk.accent}28`,
                          color: tk.textSub,
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Vitals grid */}
                <div className="v2-vitals-section">
                  {VITALS.map((v) => (
                    <div
                      key={v.lbl}
                      className="v2-vital-cell"
                      style={{
                        background: `${tk.accent}0a`,
                        border: `1px solid ${tk.panelBorder}`,
                      }}
                    >
                      <div
                        className="v2-vital-val"
                        style={{ color: tk.foxfire }}
                      >
                        {v.val}
                        <span
                          className="v2-vital-unit"
                          style={{ color: tk.textMuted }}
                        >
                          {v.unit}
                        </span>
                      </div>
                      <div
                        className="v2-vital-lbl"
                        style={{ color: tk.textMuted }}
                      >
                        {v.lbl}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </WashiPanel>

          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          {/* ────────────────────────────────────────────────────────────────
              BAND 3 — CALENDAR + NOW PLAYING: today's schedule left, music right
          ──────────────────────────────────────────────────────────────────── */}
          <WashiPanel
            tk={tk}
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: `1px solid ${tk.divider}`,
            }}
          >
            <div className="v2-band-inner">
              <div className="v2-band-label" style={{ color: tk.gold }}>
                <span>04 // CALENDAR &amp; NOW PLAYING</span>
                <span
                  className="v2-band-label-right"
                  style={{ color: tk.textMuted }}
                >
                  {new Date()
                    .toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                    .toUpperCase()}
                </span>
              </div>

              <div className="v2-cal-np-band">
                {/* Calendar */}
                <div
                  className="v2-cal-section"
                  style={{ borderColor: tk.divider }}
                >
                  {CALENDAR_EVENTS.map((ev, i) => (
                    <div
                      key={i}
                      className="v2-cal-row"
                      style={{ borderColor: tk.divider }}
                    >
                      <span
                        className="v2-cal-time"
                        style={{ color: tk.textMuted }}
                      >
                        {ev.time}
                      </span>
                      <span
                        className="v2-cal-title"
                        style={{ color: tk.textSub }}
                      >
                        {ev.title}
                      </span>
                      <span
                        className="v2-cal-dur"
                        style={{ color: tk.textMuted }}
                      >
                        {ev.duration}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Now playing */}
                <div className="v2-np-section">
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      fontFamily: "'Noto Serif JP', serif",
                      color: tk.gold,
                      marginBottom: 6,
                    }}
                  >
                    06 // NOW PLAYING
                  </div>
                  <div className="v2-np-row">
                    <div
                      className="v2-np-art"
                      style={{
                        background: `linear-gradient(135deg, ${tk.accent}30, ${tk.foxfire}20)`,
                        border: `1.5px solid ${tk.panelBorder}`,
                      }}
                    >
                      ♪
                    </div>
                    <div className="v2-np-info">
                      <div
                        className="v2-np-track"
                        style={{ color: tk.textPrimary }}
                      >
                        One Summer&apos;s Day
                      </div>
                      <div
                        className="v2-np-artist"
                        style={{ color: tk.textMuted }}
                      >
                        Joe Hisaishi
                      </div>
                    </div>
                    <div className="v2-np-eq" aria-label="Now playing">
                      {[0.6, 1, 0.75, 0.9, 0.5].map((h, i) => (
                        <div
                          key={i}
                          className="v2-np-bar"
                          style={{
                            height: 16 * h,
                            background: `linear-gradient(180deg, ${tk.foxfireGlow}, ${tk.accent})`,
                            ["--bar-dur" as string]: `${0.6 + i * 0.12}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </WashiPanel>

          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          {/* ────────────────────────────────────────────────────────────────
              BAND 4 — ACTIVE PROJECT: hero-width title + progress + checklist
          ──────────────────────────────────────────────────────────────────── */}
          <WashiPanel
            tk={tk}
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: `1px solid ${tk.divider}`,
            }}
          >
            <div className="v2-band-inner">
              <div className="v2-band-label" style={{ color: tk.gold }}>
                <span>07 // ACTIVE PROJECT</span>
                <span
                  className="v2-band-label-right"
                  style={{ color: tk.accent, fontWeight: 700 }}
                >
                  DUE OCT 2 · 62%
                </span>
              </div>

              <div className="v2-project-band">
                {/* Left: title + progress bar */}
                <div className="v2-project-left">
                  <div
                    className="v2-project-title"
                    style={{ color: tk.textPrimary }}
                  >
                    {"Hero's Chronicle · "}
                    <em style={{ color: tk.foxfire }}>v1.0</em>
                  </div>
                  <div
                    className="v2-project-sub"
                    style={{ color: tk.textMuted }}
                  >
                    {"PG'S 30TH · LIFE GAMIFICATION APP"}
                  </div>
                  <div
                    className="v2-progress-track"
                    style={{ background: `${tk.accent}14` }}
                  >
                    <div
                      className="v2-progress-fill"
                      style={{
                        background: `linear-gradient(90deg, ${tk.foxfireGlow}, ${tk.accent})`,
                        boxShadow: `0 0 6px ${tk.orbGlow}`,
                      }}
                    />
                  </div>
                </div>

                {/* Checklist grid */}
                <div className="v2-project-checks">
                  {PROJECT_CHECKS.map((c, i) => (
                    <div
                      key={i}
                      className="v2-check-row"
                      style={{ color: c.done ? tk.textMuted : tk.textSub }}
                    >
                      <div
                        className="v2-check-box"
                        style={{
                          borderColor: c.done ? tk.accentDim : tk.panelBorder,
                          background: c.done ? `${tk.accent}20` : "transparent",
                          color: tk.foxfire,
                        }}
                      >
                        {c.done && "✓"}
                      </div>
                      <span
                        style={{
                          textDecoration: c.done ? "line-through" : "none",
                          opacity: c.done ? 0.6 : 1,
                          fontWeight: c.done ? 400 : 500,
                        }}
                      >
                        {c.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </WashiPanel>

          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          {/* ────────────────────────────────────────────────────────────────
              BAND 5 — CREW: sessions + agents as a horizontal chip gallery
          ──────────────────────────────────────────────────────────────────── */}
          <WashiPanel
            tk={tk}
            style={{
              borderRadius: 0,
              border: "none",
              borderBottom: `1px solid ${tk.divider}`,
            }}
          >
            <div className="v2-band-inner">
              <div className="v2-band-label" style={{ color: tk.gold }}>
                <span>CREW // SESSIONS &amp; AGENTS</span>
                <span
                  className="v2-band-label-right"
                  style={{ color: "#34D399", fontWeight: 700 }}
                >
                  {SESSIONS.filter((s) => s.status === "running").length}
                  &#x25CF; LIVE
                </span>
              </div>

              <div className="v2-crew-band">
                {/* Live sessions */}
                {SESSIONS.map((s, i) => (
                  <div
                    key={`sess-${i}`}
                    className="v2-crew-item"
                    style={{
                      background: `${tk.panelBg}`,
                      border: `1px solid ${tk.panelBorder}`,
                    }}
                  >
                    <div
                      className="v2-crew-dot"
                      style={{
                        background:
                          s.status === "running" ? "#34D399" : tk.textMuted,
                        boxShadow:
                          s.status === "running" ? "0 0 6px #34D39966" : "none",
                      }}
                    />
                    <span
                      className="v2-crew-name"
                      style={{ color: tk.textPrimary }}
                    >
                      ⏵ {s.project}
                    </span>
                    {s.tool && (
                      <span
                        className="v2-crew-tool-chip"
                        style={{
                          background: `${tk.accent}14`,
                          border: `1px solid ${tk.accent}24`,
                          color: tk.textMuted,
                        }}
                      >
                        {s.tool}
                      </span>
                    )}
                    <span
                      className="v2-crew-meta"
                      style={{ color: tk.textMuted }}
                    >
                      {s.lastActivity}
                    </span>
                  </div>
                ))}

                {/* Scheduled agents */}
                {AGENTS.map((a, i) => (
                  <div
                    key={`agent-${i}`}
                    className="v2-crew-item"
                    style={{
                      background: `${tk.panelBg}`,
                      border: `1px solid ${a.status === "error" ? "rgba(248,113,113,0.32)" : tk.panelBorder}`,
                    }}
                  >
                    <div
                      className="v2-crew-dot"
                      style={{
                        background: a.status === "ok" ? tk.foxfire : "#F87171",
                        boxShadow:
                          a.status === "ok"
                            ? `0 0 5px ${tk.orbGlow}`
                            : "0 0 5px rgba(248,113,113,0.4)",
                      }}
                    />
                    <span
                      className="v2-crew-name"
                      style={{
                        color: a.status === "ok" ? tk.textSub : "#F87171",
                        fontFamily: "'DM Sans', monospace",
                      }}
                    >
                      {a.name}
                    </span>
                    <span
                      className="v2-crew-meta"
                      style={{ color: tk.textMuted }}
                    >
                      {a.lastRun}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </WashiPanel>

          <KintsugiSeam gold={tk.gold} goldBright={tk.goldBright} />

          {/* ────────────────────────────────────────────────────────────────
              BAND 6 — INBOX + CAPTURE: mail list left, action CTAs right
          ──────────────────────────────────────────────────────────────────── */}
          <WashiPanel tk={tk} style={{ borderRadius: 0, border: "none" }}>
            <div className="v2-band-inner">
              <div className="v2-band-label" style={{ color: tk.gold }}>
                <span>05 // INBOX · CRITICAL</span>
                <span
                  className="v2-band-label-right"
                  style={{ color: tk.foxfire }}
                >
                  4 UNREAD
                </span>
              </div>

              <div className="v2-inbox-capture-band">
                {/* Inbox */}
                <div
                  className="v2-inbox-section"
                  style={{ borderColor: tk.divider }}
                >
                  {INBOX.map((msg, i) => (
                    <div
                      key={i}
                      className="v2-inbox-row"
                      style={{ borderColor: tk.divider }}
                    >
                      <div
                        className="v2-inbox-av"
                        style={{
                          background: `${tk.accent}20`,
                          border: `1.5px solid ${tk.panelBorder}`,
                          color: tk.foxfire,
                        }}
                      >
                        {msg.initials}
                      </div>
                      <div className="v2-inbox-body">
                        <div
                          className="v2-inbox-name"
                          style={{ color: tk.textPrimary }}
                        >
                          {msg.name}
                          {msg.urgent && (
                            <span className="v2-urgent-badge">URGENT</span>
                          )}
                        </div>
                        <div
                          className="v2-inbox-preview"
                          style={{ color: tk.textMuted }}
                        >
                          {msg.preview}
                        </div>
                      </div>
                      <span
                        className="v2-inbox-time"
                        style={{ color: tk.textMuted }}
                      >
                        {msg.time}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Capture + new-session CTAs */}
                <div className="v2-capture-section">
                  <button
                    className="v2-capture-cta"
                    type="button"
                    style={{
                      background: tk.ctaBg,
                      borderColor: tk.ctaBorder,
                      color: tk.ctaText,
                    }}
                  >
                    + Capture
                  </button>
                  <button
                    className="v2-capture-cta"
                    type="button"
                    style={{
                      background: "transparent",
                      borderColor: tk.divider,
                      color: tk.textMuted,
                      fontSize: 14,
                    }}
                  >
                    New session →
                  </button>
                </div>
              </div>
            </div>
          </WashiPanel>

          {/* Footer padding */}
          <div style={{ height: 80 }} />
        </main>

        {/* Phase toggle — top-right */}
        <div
          className="el-toggle"
          style={{
            background: tk.toggleBg,
            borderColor: tk.divider,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {(["day", "twilight", "night"] as Phase[]).map((p) => (
            <button
              key={p}
              className="el-toggle-btn"
              type="button"
              onClick={() => setPhase(p)}
              aria-pressed={phase === p}
              style={{
                background: phase === p ? PHASES[p].pillActive : "transparent",
                color:
                  phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive,
              }}
            >
              {p === "day" ? (
                <GlyphSun
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              ) : p === "twilight" ? (
                <GlyphDusk
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              ) : (
                <GlyphMoon
                  color={
                    phase === p ? PHASES[p].pillTextActive : tk.pillTextInactive
                  }
                />
              )}
              {PHASES[p].phaseName}
            </button>
          ))}
        </div>

        {/* Kitsu now mounts globally in page.tsx (persistent on every tab). */}
      </div>
    </>
  );
}
