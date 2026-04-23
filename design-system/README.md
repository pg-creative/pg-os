# PG OS Design System — Claude Design Onboarding Packet

This folder is the input for Claude Design's "Set up design system" flow.

## What to feed into Claude Design

**Primary spec:** `DESIGN-SYSTEM.md` — all tokens, typography, components, multi-mode rules.

**Reference implementation:** `reference.html` — a single HTML file implementing all 3 modes with a live switcher. This shows Claude Design exactly how the tokens compose into real UI.

**Hero imagery:** `assets/hero-howls.png`, `assets/hero-totoro.png`, `assets/hero-mononoke.png` — Ghibli anime cel-shaded landscapes, one per mode.

## One-liner brand brief (paste into Claude Design if it asks for a description)

> PG OS is a personal operating system dashboard in a Studio Ghibli anime cel-shaded aesthetic. Three swappable palette/typography modes — **Howl's Golden Hour** (warm amber, Cormorant), **Totoro Dusk** (firefly green, EB Garamond), **Mononoke Forest** (spirit gold, Playfair Display) — share one layout system, component library, and motion language. Warm dark glass panels, serif displays, mono telemetry, luminous amber accents. Feels like a JRPG command center painted by Ghibli.

## Non-negotiables
- Three modes must remain swappable — never collapse to one.
- Serif for display type. Mono for telemetry/labels. Sans-serif for body.
- Dark warm backgrounds — never pure black, never cool gray.
- Amber/gold as primary accent in every mode, just at different warmth.
- Never introduce purple, cyan, neon, or cyberpunk accents.

## Inspiration anchors (for Claude Design to understand the vibe)
- Jerrod OS (@jerrodchen on X) — structural reference for layout/telemetry chrome
- Studio Ghibli background art: *Howl's Moving Castle*, *My Neighbor Totoro*, *Princess Mononoke*, *Laputa: Castle in the Sky*
- Octopath Traveler / Final Fantasy Tactics — JRPG UI energy for badges, rings, stat readouts
- Caspar David Friedrich romantic realism — for lighting mood
