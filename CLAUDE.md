# Personal OS

> Sub-project of [CEREBRUM](../CLAUDE.md). Personal operating system dashboard — PG's daily command center.

## What This Is
A full-stack personal OS dashboard. Widgets for calendar, inbox, vitals, active projects, now playing, location, and session context. Built in a distinctive Studio Ghibli anime cel-shaded aesthetic with three swappable palette/typography modes (Howl's Golden Hour, Totoro Dusk, Mononoke Forest).

Kickoff: 2026-04-21. Building alongside Anthropic Labs' new **Claude Design** tool (research preview) — Claude Design handles visual/interaction design, this repo will hold the real Next.js app with live data wiring.

## Current Status
**Phase 0 — Design System.** Three palette variants built and verified (see `design-system/reference.html`). Heroes generated via Midjourney (Legnext proxy). Next: feed `design-system/DESIGN-SYSTEM.md` into Claude Design's "Set up design system" onboarding, then iterate on component design in Claude Design, then export code into this repo for data wiring.

## Tech Direction (planned)
- Next.js 15 + TypeScript + Tailwind + shadcn
- Deploy: Vercel
- Data: Google Calendar, Gmail (via Google APIs), Apple Health (Whoop API as proxy), Notion API for active projects, OpenWeather for location/weather
- Auth: Supabase (same as Hero's Chronicle)
- Design source of truth: `design-system/DESIGN-SYSTEM.md`
- Visual mode switcher: `data-variant` attribute on `<html>`, swapped via CSS custom properties

## Folder Structure
```
personal-os/
├── CLAUDE.md                  ← this file
├── docs/
│   └── specs/                 ← feature specs as we go
└── design-system/
    ├── DESIGN-SYSTEM.md       ← primary spec (source of truth for Claude Design)
    ├── README.md              ← brief for Claude Design onboarding
    ├── reference.html         ← working 3-mode reference implementation
    └── assets/
        ├── hero-howls.png     ← 1680x720 MJ hero (Howl's Golden Hour mode)
        ├── hero-totoro.png    ← 1680x720 MJ hero (Totoro Dusk mode)
        └── hero-mononoke.png  ← 1680x720 MJ hero (Mononoke Forest mode)
```

## Three Modes
| Mode | Palette anchor | Serif | Vibe |
|------|----------------|-------|------|
| **Howl's Golden Hour** | warm amber `#D6A367` + soft coral | Cormorant Garamond | Rolling landscape at golden hour — direct translation of PG's canonical Ghibli style |
| **Totoro Dusk** | firefly amber `#E0B552` + forest green | EB Garamond | Lantern-lit forest at dusk — cozier, more storybook |
| **Mononoke Forest** | spirit gold `#C9A560` + muted ruby | Playfair Display | Ancient mystical woodland cathedral — mythic, composed |

All three share the same: layout grid, component topology, type hierarchy, motion language, interaction patterns. Only palette + serif font + hero image change.

## Quick Reference
- **Reference implementation:** `design-system/reference.html` (open via `http://localhost:8765/` while the sandbox Python server runs)
- **Sandbox origin:** `~/CEREBRUM/sandbox/personal-os-variants/` (original exploration space — 12 panel variants of each MJ hero)
- **MJ images via:** Legnext API (`api.legnext.ai/api/v1/diffusion`), `$LEGNEXT_API_KEY` in env
- **Design tool:** Claude Design (Anthropic Labs, research preview) at claude.ai

## Agent Scope
Tiny project today. No scoping warnings yet.
