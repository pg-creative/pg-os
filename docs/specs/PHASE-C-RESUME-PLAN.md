# PG OS Q2 Redesign — Phase C Resume Plan

> **Saved:** 2026-05-04
> **Last commit:** `3fa8161` — `feat(polish): haptic motion + skeletons + finalize Phase C wireup (T-12)`
> **Status:** ✓ **PHASE C COMPLETE (2026-05-04)** — all 6 tickets shipped in parallel rip. See `REDESIGN-2026-Q2.md` § Week 03 for SHAs. This file is now historical.

## ✓ Phase C Shipped (2026-05-04)
- `f681f07` — T-11 Evening Ceremony (4-step ritual + 21:00 redirect gate)
- `29feb52` — T-09 Now Mode (⌘. focus overlay + cross-tab state sync)
- `83efe0f` — T-07 Season meter + drilldown (Q2 progress strip on Home)
- `3ee8824` — T-08 Ambient idle (90s → palette-tagged quote rotation)
- `26e93a5` — T-06 Unified timeline (ships ⨯ queue ⨯ runs ⨯ decisions ⨯ telegram ⨯ captures)
- `3fa8161` — T-12 Polish (spring hover, drag-to-dismiss, skeletons, page wireup, +834 lines globals.css)
- 12 Playwright screenshots in `docs/screenshots/redesign-2026-q2/w03/` covering all 3 palettes

---

## (Historical — original resume notes below)
> **Source of truth for tickets:** `docs/specs/REDESIGN-2026-Q2.md`
> **Visual handoff bundle:** `docs/specs/redesign-2026-q2/`
> **Operator directive (verbatim):** *"i want to do all of this at once not just week 03 all of it -- and what about te stylytistci / visual redesign per claude designs recommendatiosn when does that happen?"*

---

## What Already Shipped (do NOT redo)

### Phase A — Bookends (Week 01)
- `6949c47` — T-01 EmptyState component + sweep
- `e4f3260` — T-02 Web Audio chimes v0
- `f3c51d5` — T-10 `/briefing` route + narration
- `304ff85` — docs(specs): Phase A complete

### Phase B — Command (Week 02)
- `d978f01` — T-03 Pin the active chest
- `80d6d90` — T-05 Narrated Claude overview
- `4af8680` — T-04 ⌘K command palette
- `3438769` — docs(specs): Phase B complete

### T-13 — Visual rebrand foundation (NEW, just shipped pre-compaction)
- `7576e45` — palette rename `laputa-day/twilight/midnight` → `howls/totoro/mononoke`
- 3 hero PNGs in `public/` (hero-howls.png, hero-totoro.png, hero-mononoke.png)
- New tokens from `docs/specs/redesign-2026-q2/assets/colors_and_type.css` merged into `globals.css`
- `ModeProvider.tsx` — Mode type renamed + LEGACY_MAP migration for old localStorage values
- `ModeSwitcher.tsx` — chips renamed
- `layout.tsx` — `data-variant="howls"` default + new themeColor
- `commands.ts` — palette commands repointed
- localStorage key names retained (`pg-os-laputa-manual`, `pg-os-laputa-auto`) for backward compat; values auto-migrate on first read
- `pnpm tsc --noEmit` clean

### T-13 follow-up still owed (do this FIRST in next window)
1. Take Playwright screenshots in all 3 palettes:
   - `docs/screenshots/redesign-2026-q2/w03/00-rebrand-howls.png`
   - `docs/screenshots/redesign-2026-q2/w03/00-rebrand-totoro.png`
   - `docs/screenshots/redesign-2026-q2/w03/00-rebrand-mononoke.png`
2. Confirm `/hero-howls.png`, `/hero-totoro.png`, `/hero-mononoke.png` return HTTP 200
3. Confirm Cormorant/EB/Playfair serif rotation per palette
4. If anything looks off, course-correct before dispatching Phase C agents

---

## Phase C Execution Plan — RIP IT ALL IN PARALLEL

**Why parallel works now:** every Phase C ticket has a non-overlapping primary file scope. The only shared file is `globals.css` (each ticket appends one CSS block) — same pattern as Phase B's three-agent rip. Same conflict resolution: agents return their CSS-needed snippets, main agent appends sequentially in three contiguous blocks at end of file.

**Six parallel agents in one tool block:**

### T-11 · Evening Ceremony (~2 sessions)
- **Owns:** `src/app/evening/page.tsx`, `src/app/api/evening/route.ts`, `src/lib/ceremony.ts`, `src/lib/habits.ts` (extend with `ceremony` journal-entry kind)
- **Wires:** Reuses `BriefingShell` from Phase A. Assembles Ships / Commits / Captures / Focus hrs from `shipLog.ts` + `projectState.ts` (commits) + capture log + Whoop session count.
- **21:00 auto-fire:** middleware redirect mirrors T-10's morning logic. ⌘K `evening.show` always opens manually. localStorage `pg-os-evening-YYYYMMDD` blocks repeat auto-fire.
- **Replaces stub:** `commands.ts` `evening.show` currently `alert("Evening ceremony ships in Week 03")` — rewire to `router.push('/evening')`.

### T-09 · Now Mode (~3 sessions, the largest swing)
- **Owns:** `src/app/_components/NowModeProvider.tsx`, `src/app/_components/NowStage.tsx`. Edits `src/app/page.tsx` (mount provider above tab routing, between AmbientParticles and `.shell`). Edits `src/lib/realtimeBrowser.ts` (add `pause()` / `resume()` exports).
- **Hotkey:** ⌘. global, toggles `data-now-mode="on"` on body. CSS `display:none` collapses `.shell > :not(.now-stage)`.
- **Timer:** `Date.now()` driven, persisted in `localStorage('pg-os-now-block')` so refresh survives mid-block.
- **HR overlay:** read live from `whoop.ts` if connected.
- **Block completion:** fire `ship` chime (T-02) + write `ships` row with `kind: 'focus_block'` via `shipLog.ts`.
- **Flow tab:** add "Start focus block" button bound to `enable(45)`.

### T-07 · Season meter (~1 session)
- **Owns:** `src/app/_components/SeasonMeter.tsx`, `src/app/api/season/route.ts`, `src/lib/season.ts`
- **Mount:** `src/app/page.tsx` between topbar (line 43) and TabBar (line 46). 28px tall strip.
- **Anim:** ratchet 600ms; `prefers-reduced-motion` snaps. Tier-up crosses → fire `tierUp` chime (T-02).
- **Constraint:** Season meter doesn't shift layout when XP=0.

### T-08 · Ambient Idle (~1 session, parallel with T-07)
- **Owns:** `src/app/_components/AmbientIdle.tsx`, `src/lib/quips.ts`
- **Mount:** `src/app/page.tsx` root level.
- **Trigger:** 5-min idle (no keystroke, mousemove, focus event).
- **Quips:** array in `src/lib/quips.ts` keyed by mode (howls/totoro/mononoke) + time band.
- **Disable when:** `data-now-mode="on"` is set OR viewport <1024px.

### T-12 · Haptic motion polish (~1.5 sessions, runs LAST)
- **Owns:** Append polish CSS to `globals.css`. Sweep: `CaptureSheet.tsx`, `RitualGate.tsx`, `HabitsView.tsx`, every fetch-then-update site.
- **CSS:** skeleton shimmer, press states for `.btn`-likes, spring-physics on CaptureSheet (`cubic-bezier(0.22,1.68,0.36,1)`), drag-to-dismiss on mobile sheets.
- **All mutations:** optimistic by default. All effects: `prefers-reduced-motion` collapses to instant.
- **Use EmptyState** as inline error state on rollback.

### T-06 · Unified Timeline feed (~2 sessions, OPTIONAL last per spec §3 W3)
- **Owns:** `src/app/_components/views/TimelineView.tsx`, `src/app/api/timeline/route.ts`, `src/lib/timeline.ts`
- **New tab:** `05 // TIMELINE` between Flow and Claude. Extend `useActiveTab` Tab union with `"timeline"`; add row to `TABS` array.
- **Merge sources:** `agent_runs` (`agentRunsStore.ts`), ships (`shipLog.ts`), commits (`projectState.ts`), captures, telegram_events (Supabase migration 006), calendar (`google.ts`).
- **Endpoint:** GET `?day=YYYY-MM-DD`. Lazy 200 rows/day cap.
- **UI:** Date picker keyboard ←/→ + URL `?day=` sync.
- **Defer if W3 fills up.**

---

## Parallel Rip Mechanics (Phase B pattern, repeated)

1. **Verify T-13 visually first** (3 Playwright shots, save to w03/).
2. **Dispatch 6 Sonnet sub-agents in ONE Agent tool block** (T-11, T-09, T-07, T-08, T-06 build; T-12 separately, runs LAST after others land).
   - Each agent writes ONLY its owned files
   - Each agent returns: summary + the CSS snippet it needs appended to globals.css
3. **Main agent appends CSS sequentially** — six contiguous blocks under existing `=== Redesign 2026-Q2 ===` section.
4. **Run** `pnpm tsc --noEmit && pnpm build` once, fix any type errors.
5. **Dispatch T-12 polish agent** AFTER first 5 land (it sweeps existing components).
6. **Playwright verification sweep** in all 3 palettes:
   - `/evening` → 3 shots
   - Now Mode toggled → 3 shots
   - Season meter visible → 3 shots
   - Ambient idle quip after 5min wait (or force-trigger via dev hook) → 3 shots
   - Polish: capture sheet open, skeletons during fetch → 3 shots
   - Timeline (if shipped) → 3 shots
   - Save to `docs/screenshots/redesign-2026-q2/w03/`
7. **Six commits** (one per ticket): `feat(evening): Evening Ceremony (T-11)`, `feat(now): Now Mode + ⌘. (T-09)`, `feat(season): season meter (T-07)`, `feat(idle): ambient idle quips (T-08)`, `feat(polish): haptic motion polish (T-12)`, `feat(timeline): unified timeline (T-06)` — only if T-06 shipped.
8. **Final commit:** `docs(specs): mark Phase C complete`.

---

## File Conflict Map

| File | T-11 | T-09 | T-07 | T-08 | T-12 | T-06 |
|---|---|---|---|---|---|---|
| `src/app/page.tsx` | — | mount NowProvider | mount SeasonMeter | mount AmbientIdle | — | — |
| `src/app/globals.css` | append | append | append | append | append | append |
| `src/lib/realtimeBrowser.ts` | — | edit | — | — | — | — |
| `src/middleware.ts` | edit | — | — | — | — | — |
| `src/app/_components/useActiveTab.tsx` | — | — | — | — | — | edit |

**`src/app/page.tsx` has 3 ticket mounts** → resolve by main agent doing those edits in serial after agents finish their own files. Agents return the JSX snippets they need mounted; main agent inserts them.

---

## Phase C Verification Gates

- `pnpm tsc --noEmit && pnpm build` clean
- All three palettes visual QA per ticket (Definition of Done §4 in spec)
- Mobile <680px single-column for Evening + Now stage + Timeline
- Reduced-motion: idle screen instant, ratchet snap, palette transitions instant
- Season meter doesn't shift layout when XP=0
- Now Mode survives a refresh mid-block (timer persistence works)
- T-12 sweep: no console errors in dev across full app navigation
- Spec doc tickboxes T-11, T-09, T-07, T-08, T-12, T-06 updated with commit SHA + date

---

## Open Risks / Known Issues

- **T-13 needs visual verification** — committed but not yet screenshotted in 3 palettes. If something looks broken, fix before Phase C dispatch.
- **`page.tsx` triple-mount** — three tickets all want to add components to the same root file. Main agent must serialize those edits, not parallel.
- **`evening.show` command stub** in `commands.ts` currently alerts "ships in Week 03" — T-11 must replace it.
- **Timeline tab vs existing tab order** — `claude` is currently last. Inserting `timeline` between Flow and Claude renumbers labels; verify TabBar renders correctly.

---

## Pivotal Operator Quotes (drove this plan)

1. *"i want to do all of this at once not just week 03 all of it -- and what about te stylytistci / visual redesign per claude designs recommendatiosn when does that happen?"* → both: visual redesign first (T-13, done), then all Phase C tickets in parallel.
2. **Auto Mode active** at compaction: execute immediately, minimize interruptions, prefer action over planning.
