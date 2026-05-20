# Cockpit / Kitsu — Skills + Bake-off Redo Handoff (2026-05-20)

> Fresh-window handoff. Branch **`worktree-cockpit`**, worktree
> `~/CEREBRUM/personal-os/.claude/worktrees/cockpit`. Run: `pnpm exec next dev -p 3031`
> + `node scripts/cockpit-daemon.mjs`. The fox is named **Kitsu**.

## Done this session (committed on worktree-cockpit)
- **P0** party choreography (Kitsu speaks intro → song → ducked hype lines); real local-audio song (`public/audio/party.mp3`, gitignored); synth fallback. Fox-head crop fixed.
- **P1** legibility foundation — `--text-*` token ladder (12px floor) + `--type-scale`; ~740 px+rem sizes swept to tokens; contrast strengthened; base 15px. (Gotcha: clearing `.next` was required to beat a stale CSS cache.)
- **P2** renamed Marvis → **Kitsu** (persona, UI, wake-word, party copy).
- **Design canon pivot** — retired prescriptive `DESIGN-SYSTEM.md` (archived), adopted "compass not cage": `design-system/CANON.md` (descriptive truth) + `~/.claude/rules/design-anti-generic.md` (portable process/taste) + per-direction locks. Fixed `visual-style.md` (image-gen scope; killed the "avoid indigo" rule).
- **Aesthetic bake-off baseline** — `/dev/aesthetic-lab`: 5 directions (Nioh/Ukiyo-e/Zen-min/Ghibli/Onmyoji) × day/dusk/night, with 5 painted MJ hero backdrops (`public/art/aesthetic-2026-05-20/`, gitignored; regen via `scripts/run-mj-aesthetic.py`). This is my hand-rolled CSS+MJ version — the BASELINE for the skills to beat.

## THE TASK (this window)
PG installed 5 front-end design skills (verify loaded: `impeccable`, `ui-ux-pro-max`, `huashu-design`, `taste`, `taste-5dim`). Two phases:

### Phase A — Align the 5 skills to PG (process, not a look)
Each defers to PG's PROCESS canon (`design-anti-generic.md`) + voice profile + stack — NOT a fixed aesthetic (so they stay portable across Alchmy/Voyager/etc.). Per-skill overrides from the gut-check:
- **impeccable** (~80% aligned): OVERRIDE its em-dash ban → PG allows ×2; push warm/committed jewel palettes over its conservative default.
- **ui-ux-pro-max**: leans generic-SaaS/cool — force warm-palette + display-face-does-real-work; FIX its `search.py` path (it calls `skills/ui-ux-pro-max/scripts/search.py`, which breaks installed at `~/.claude/skills`).
- **huashu-design**: closest method-match (HTML-first, falsifier, Playwright) — lightest touch; point its philosophy-picker at PG's aesthetic, swap Chinese/Baidu defaults to English/ElevenLabs.
- **taste** (Leonxlnx): set its dials warm/restrained (it defaults cool-minimalist + high-motion).
- **taste-5dim** (VOIDXAI): inject PG's aesthetic into its "design" dimension (flag cold-palette / missing-display-face / unsupported-motion as harms; cross-ref motion-prototyping 200ms).
- Roles: **direction-setters** = ui-ux-pro-max / frontend-design · **builder** = huashu · **critics** = impeccable / taste / taste-5dim.

### Phase B — REDO the bake-off with the skills (the actual test)
Rebuild the 5-direction aesthetic bake-off using the skills instead of hand-rolled CSS, testing them **singularly and combined**:
- **Singular:** run ONE skill per role on the same Home slice (e.g. ui-ux-pro-max alone generates a direction; huashu alone builds one; impeccable alone polishes the baseline) → screenshot each.
- **Combined:** the natural pipeline — direction-setter → huashu build → impeccable/taste polish → taste-5dim judge → on the same slice.
- Compare singular vs combined vs the current CSS+MJ baseline at `/dev/aesthetic-lab`. Use real painted MJ imagery (PG wants images IN the UI, not CSS gestures — regen via `scripts/run-mj-aesthetic.py`, LegNext key in shell env, ~29k credits).
- PG judges which skill(s) move the needle, picks a DIRECTION, then: write `~/.claude/research/pgos-aesthetic-lock-2026-05.md`, update `design-system/CANON.md`, go section-by-section across all 9 tabs.

## Carry-forward (P4, after aesthetic locks)
Pixel-lab agent sprites into cockpit office · interactive kitsune backgrounds · lip-sync fox to real ElevenLabs amplitude (AnalyserNode, pattern proven in PartyMode) · Picovoice wake-word when approved.

## Key files
`design-system/CANON.md` · `~/.claude/rules/design-anti-generic.md` · `src/app/dev/aesthetic-lab/page.tsx` · `scripts/run-mj-aesthetic.py` + `scripts/mj-prompts-aesthetic-2026-05-20.md` · `src/app/globals.css` (~11k lines, chunk-read; `--text-*` tokens at ~line 117) · `src/lib/cockpit/marvis.ts` (Kitsu persona) · memory `cockpit_marvis_build.md`.
