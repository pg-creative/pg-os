# PG OS — Redesign Plan, 2026-Q2

> **Audience:** Claude Code, working in `~/CEREBRUM/personal-os`.
> **Goal:** Take PG OS from "good dashboard" to "daily ritual." 3 big swings + 9 sharpenings, scoped as discrete tickets with acceptance criteria, file paths, and dependency order.
> **Companion artifact:** `PG OS Critique & Proposals.html` (visual mockups for the 3 swings live there).
> **Status:** Spec. Nothing below is shipped yet. Pick tickets in order; mark done in this file as you ship.

---

## 0. Operating principles (apply to every ticket)

These are non-negotiable. If a ticket suggestion conflicts with these, the principle wins.

1. **One sentence at the top.** Every screen earns a single literary line in `--serif` with one italic-accent word. "Working *late*, Patrick." Not card stacks.
2. **Show the verb, hide the data.** Surface 1–3 next actions per surface. Bury the rest behind expand/keystroke. Data is the receipt of action, not the action.
3. **Bookends carry weight.** Morning and evening get *bespoke routes* (`/briefing`, `/evening`) — not cards inside the grid.
4. **Modes mean something.** Day/Twilight/Midnight should change *behavior* (verbosity, default volume, polling cadence) — not only hex tokens.
5. **Stay inside the design system.** Tokens from `globals.css` only. No new colors. No new fonts. No emoji in chrome. Italic-accent flourish exactly *one word per display heading*.
6. **Foundation before flash.** No decorative shaders. Every visual effect must tie to real data/meaning. (See `feedback-foundation-before-flash.md`, 2026-04-24.)
7. **Reduced motion + a11y respected.** Everything new ships with `prefers-reduced-motion`, focus-visible ring, 44px mobile targets, and ARIA where it matters.
8. **Optimistic UI by default** for any user-initiated mutation (capture, queue accept, habit check, ceremony submit).

---

## 1. Architecture additions (ship before tickets)

### 1.1 New routes
```
src/app/briefing/page.tsx        ← Morning Briefing (full-bleed, no chrome)
src/app/evening/page.tsx         ← Evening Ceremony (full-bleed, no chrome)
src/app/now/                     ← Now Mode = global UI state, not a route (see T-09)
```

### 1.2 New API endpoints
```
src/app/api/briefing/route.ts    ← GET: assembles narration + 3 actions for today
src/app/api/evening/route.ts     ← GET: day-rollup; POST: writes journal entry
src/app/api/timeline/route.ts    ← GET: unified chronological feed (param: ?day=YYYY-MM-DD)
src/app/api/season/route.ts      ← GET: tier, XP, streak, day-of-season
```

### 1.3 New shared components
```
src/app/_components/
  BriefingShell.tsx              ← reusable full-bleed wrapper (used by /briefing + /evening)
  CommandPalette.tsx             ← ⌘K overlay, fuzzy search, action runner (T-04)
  NowModeProvider.tsx            ← context + ⌘. toggle + body class + SSE pause (T-09)
  SeasonMeter.tsx                ← topbar slim strip (T-07)
  EmptyState.tsx                 ← <EmptyState verb explanation cta /> (T-11)
  SoundProvider.tsx              ← Web Audio chime player + Sound toggle (T-10)
  AmbientIdle.tsx                ← 5-min idle → fullscreen hero scene (T-08)
  TimelineFeed.tsx               ← unified chronological list (T-06)
```

### 1.4 New lib modules
```
src/lib/
  briefing.ts                    ← assemble morning narration; uses calendar + queue + projects
  ceremony.ts                    ← assemble day rollup; uses agent_runs + git + ships + queue
  season.ts                      ← XP rules, tier thresholds, streak math
  timeline.ts                    ← merge agent_runs + ships + commits + captures + telegram_events + calendar
  sound.ts                       ← Web Audio primitives (capture, ship, tier-up chimes)
  fuzzySearch.ts                 ← lightweight scorer for ⌘K (no external dep)
```

### 1.5 New env / config
- No new env vars required. All features piggyback on existing OAuth + Supabase + Anthropic key.
- New `localStorage` keys (single-user, browser-local):
  - `pg-os-briefing-YYYYMMDD` — "shown today" flag
  - `pg-os-evening-YYYYMMDD` — "submitted today" flag
  - `pg-os-sound-enabled` — boolean
  - `pg-os-now-mode` — boolean (mirror of context for refresh)
  - `pg-os-active-chest` — id of pinned project (T-03)

### 1.6 New CSS sections in `globals.css`
Append (do NOT modify existing tokens):
```css
/* === Redesign 2026-Q2 === */
.briefing-shell { ... }      /* full-bleed hero + gradient overlay */
.command-palette { ... }
.now-mode-stage { ... }
.season-meter { ... }
.empty-state { ... }
.ambient-idle { ... }
.timeline-feed { ... }
```

---

## 2. Tickets

> **Format:** every ticket below has Goal, Files, Acceptance Criteria, Dependencies, Effort, Notes.
> Effort is in PG-Sessions (≈ 90-min focused blocks).

---

### T-01 · Empty State pass *(unblocks everything else)*

**Goal:** Replace every "Loading…" / "No X yet." with a `<EmptyState>` that names the verb to fix it. Build the component first; reuse everywhere.

**Files:**
- `src/app/_components/EmptyState.tsx` (new)
- All `views/claude/*` (Trust, Agents, Signals, Skills, Archive — currently flat strings)
- `views/HabitsView.tsx`, `views/FlowView.tsx`, `views/ProjectsView.tsx`

**Component API:**
```tsx
<EmptyState
  verb="Run session-review"           // the action that fixes it
  explanation="Claude hasn't seen enough sessions to model your trust map."
  cta={{ label: 'Run now', onClick: ... }}  // optional
  glyph="○"                            // optional unicode
/>
```

**Acceptance:**
- Component supports keyboard activation on CTA (Enter/Space).
- Voice: second-person, *one* italic-accent word per explanation.
- Replaces ≥ 6 existing "No X yet" strings.
- Dark variant only (matches design system).

**Dependencies:** none.
**Effort:** 1 session.

---

### T-02 · Sound design v0

**Goal:** Three Web Audio chimes — `capture`, `ship`, `tierUp`. Off by default; gated behind a single Sound toggle in topbar (next to palette switcher). Tuned warmer at Howl's/Day, glassier at Mononoke/Midnight.

**Files:**
- `src/lib/sound.ts` (new)
- `src/app/_components/SoundProvider.tsx` (new) — context + toggle UI
- `src/app/page.tsx` — mount provider
- `src/app/_components/CaptureSheet.tsx` — fire `capture` chime on submit
- `src/lib/shipLog.ts` — fire `ship` chime on POST 200

**Acceptance:**
- No external audio files; pure Web Audio oscillators + envelope.
- `prefers-reduced-motion: reduce` mutes all chimes.
- Toggle persists in `localStorage('pg-os-sound-enabled')`, default `false`.
- Each chime ≤ 350ms, peak ≤ -12dBFS.

**Dependencies:** none.
**Effort:** 1 session.

**Notes:** Don't use `setTimeout` for envelope — use `AudioParam.linearRampToValueAtTime`. Resume `AudioContext` on first user gesture (Safari).

---

### T-03 · Pin the active Chest (Projects hierarchy)

**Goal:** Make Projects view show ONE active project at 1.6× height with full-bleed accent border + today's commits inline. Everything else collapses to slim rows.

**Files:**
- `src/app/_components/views/ProjectsView.tsx`
- `src/lib/projects.ts` — add `activeChestId` getter from `pg-os-active-chest` localStorage
- `src/app/api/projects/route.ts` — return `isActive: boolean` per project

**Acceptance:**
- One project marked as active; rendered as hero card with: title, today's commit count, last 3 commit messages, current blockers, action items.
- Other projects render as 1-line rows: name · last update · ship-count this week.
- "Set active" action appears in `…` menu of every project card.
- Active pin auto-collapses to slim row after 14 days idle (no commits, no MEMORY.md updates).
- Keyboard: pressing `[` and `]` cycles which project is active.

**Dependencies:** none.
**Effort:** 1 session.

---

### T-04 · ⌘K Command Palette

**Goal:** A fullscreen overlay opened with ⌘K (or Ctrl+K). Single input at top. Below: ranked list of commands across navigation, captures-by-destination, project launchers, agent runners.

**Files:**
- `src/app/_components/CommandPalette.tsx` (new)
- `src/lib/fuzzySearch.ts` (new) — small scoring fn (token overlap + prefix bonus)
- `src/app/page.tsx` — mount + global ⌘K handler
- `src/lib/commands.ts` (new) — registry: `{ id, label, hint, run, icon? }[]`

**Command registry seeds:**
- `nav.home`, `nav.habits`, `nav.projects`, `nav.flow`, `nav.claude`
- `capture.ship`, `capture.queue`, `capture.essay`, `capture.linkedin`, `capture.yuriko`, `capture.hc-journal`
- `project.launch.<id>` (one per active project)
- `agent.run.morning-briefing`, `agent.run.session-review`, `agent.run.enrich-review`
- `mode.toggle.now`, `mode.toggle.sound`, `palette.howls`, `palette.totoro`, `palette.mononoke`
- `briefing.show`, `evening.show`

**Acceptance:**
- Opens in <100ms from keystroke.
- Type-ahead with ≥ 25 commands ranked by relevance, recency boost (last-used wins ties).
- Esc dismisses; Enter runs top result; ↑/↓ navigates; Tab autocompletes.
- Focus trap inside overlay; restores focus on dismiss.
- ARIA: `role=dialog aria-modal=true`; results in a `role=listbox`.
- Recent commands cached in `localStorage('pg-os-cmd-recent')`, capped at 8.
- Renders an inline hint row for keyboard shortcuts (⌘K / ↵ / Esc).

**Dependencies:** none.
**Effort:** ~2 sessions.

**Notes:** Don't use `cmdk` library; the matcher is small. We want full control over the look.

---

### T-05 · Narrated Claude overview *(replaces 7-tab landing)*

**Goal:** Claude tab's "Overview" sub-tab becomes a single nightly-generated paragraph in second-person voice. Phrases inside the prose are clickable → deep-link to the relevant sub-tab (Proposals/Trust/Agents/Signals/Skills/Archive).

**Files:**
- `src/lib/claudeStore.ts` — add `getOverviewNarration()` that calls Anthropic with structured input (proposals_log + trust_categories + recent corrections)
- `src/app/_components/views/claude/Overview.tsx` — replace stat cards with prose block
- `src/app/api/claude/overview/route.ts` (new) — caches narration for 24h; refreshes on session-review run

**Prompt shape (sketch — refine on first run):**
> System: You are PG's daily review Claude. Voice = second-person, no hype, no exclamation, one italic-accent word per sentence at most. Output ≤ 7 sentences. Each sentence may wrap one phrase in `[[…|target]]` linking to overview/proposals/trust/agents/signals/skills/archive.
> User: `<7-day stats JSON>`

**Acceptance:**
- Narration renders as 5–7 sentences, mixed serif body + inline mono badges where stats appear.
- Clickable phrases use the `[[label|target]]` syntax → render as italic-accent links.
- Falls back gracefully if Anthropic key missing or request errors (renders prior cached, then "Quiet today.").
- Cache busts on `session-review` agent run.
- Voice rules enforced via system prompt + light post-processing (strip `!`).

**Dependencies:** none. (Anthropic SDK already wired.)
**Effort:** ~1.5 sessions.

---

### T-06 · Unified Timeline feed

**Goal:** New top-level tab (insert between **Flow** and **Claude**, label `05 // TIMELINE`) showing chronological merge of: agent_runs, ships, commits, captures, telegram_events, calendar events. Today-first; date-pickable backward.

**Files:**
- `src/lib/timeline.ts` (new) — merge function over already-stored sources
- `src/app/api/timeline/route.ts` (new) — GET `?day=YYYY-MM-DD`, defaults to today
- `src/app/_components/views/TimelineView.tsx` (new)
- `src/app/_components/TabBar.tsx` — add tab
- `src/app/page.tsx` — add view route
- `src/app/_components/views/FlowView.tsx` — add "Drip log" link to Timeline?day=… (replaces inline drip log eventually)

**Row shape (uniform):**
```
{ ts: ISO, kind: 'ship'|'commit'|'capture'|'agent'|'telegram'|'calendar',
  glyph: '◆'|'·'|'⚡'|'○'|'✱'|'□',
  title: string,    // serif body — italic-accent ONE word
  meta: string,     // mono uppercase
  href?: string }   // optional deep-link
```

**Acceptance:**
- Renders ≥ 6 source types correctly.
- Date picker (←/→ keyboard, click) navigates by day. URL syncs `?day=YYYY-MM-DD`.
- Lazy-loads at most 200 rows per day; older days truncated with "see more →".
- Empty day uses `<EmptyState>` (T-01).
- Mobile: collapsing to single column with sticky day header.

**Dependencies:** T-01.
**Effort:** ~2 sessions.

---

### T-07 · Season meter (topbar strip)

**Goal:** Slim 28px-tall strip directly under the topbar showing current tier letter, XP earned this season, season day count, next-tier progress. Subtle ratchet animation on ship.

**Files:**
- `src/lib/season.ts` (new) — XP rules + tier thresholds
- `src/app/api/season/route.ts` (new) — GET current state
- `src/app/_components/SeasonMeter.tsx` (new)
- `src/app/page.tsx` — mount under topbar
- `src/app/_components/views/HomeView.tsx` — also render expanded view at bottom of Home

**Tier thresholds (initial — make configurable via `src/lib/season.ts`):**
```
F: 0       D: 1500    C: 4000    B: 7500
A: 11500   S: 14000   SSS: 18000
```

**Season cadence:** 66-day arcs (matches `season-preview-*` mockups). Day-of-season computed from `seasonStart` env or `Date.now() - 66d` rolling.

**Acceptance:**
- Renders without layout shift even when XP is 0.
- "Ratchet" animation = bar grows + value counts up over 600ms when XP delta > 0 (poll every 60s, or use realtime channel).
- Respects `prefers-reduced-motion`: snaps to value, no bar animation.
- Tier letter uses serif italic in `--accent` (matches tier-lab variant C).
- Click → navigates to expanded season view (Home bottom).

**Dependencies:** T-02 (tier-up chime fires on threshold cross).
**Effort:** ~1 session.

---

### T-08 · Ambient Idle screen

**Goal:** After 5 minutes of zero input (no keystroke, no mousemove, no SSE update reflected in DOM), softly transition to a fullscreen hero painting + clock + literary quip.

**Files:**
- `src/app/_components/AmbientIdle.tsx` (new)
- `src/app/page.tsx` — mount
- `src/lib/quips.ts` (new) — small array of mode+time-keyed quips

**Quip examples (one italic-accent word each):**
- Day: "noon · the *queue* will hold"
- Twilight: "dusk · the *reply* can wait"
- Midnight: "the *log* is closed"

**Acceptance:**
- Fade-in over 1.2s; instant fade-out on any input.
- Hero painting matches active palette.
- Time uses serif `--clock` style with `:` blink.
- Disabled when Now Mode is active (T-09 owns full-bleed in that case).
- Disabled on mobile <1024px (use OS lock screen instead).
- Pauses SSE tabs to save battery? *No — keep SSE alive; only suppress visual updates.*

**Dependencies:** none.
**Effort:** ~1 session.

---

### T-09 · Now Mode *(big swing)*

**Goal:** Global UI state. ⌘. toggles. When on:
- Hides everything except a single `.now-stage` showing: current focus title, elapsed timer, next-up.
- Pauses SSE channels (timeline, projects, agent_runs).
- Suppresses Capture FAB, palette switcher, season meter.
- Esc or ⌘. exits.

**Files:**
- `src/app/_components/NowModeProvider.tsx` (new)
- `src/app/_components/NowStage.tsx` (new)
- `src/app/page.tsx` — mount provider above tab routing
- `src/app/_components/views/FlowView.tsx` — "Start focus block" button → enables Now Mode and binds timer
- `src/lib/realtimeBrowser.ts` — expose `pause()` / `resume()` for SSE channels

**Acceptance:**
- Body class `data-now-mode="on"` toggles everything else off via CSS (`display:none` on `.shell > :not(.now-stage)`).
- Timer driven by `Date.now()` — survives refresh via `localStorage('pg-os-now-block')`.
- Block target (default 45m) configurable; on completion, fire `ship` chime + offer "Log block" CTA → writes to ships table with `kind: 'focus_block'`.
- HR (heart rate from Whoop) shown live in mono telemetry under timer if connected.
- Respects `prefers-reduced-motion`: instant transition, no fade.
- Restores prior tab on exit.

**Dependencies:** T-02 (chime), Flow tab timer.
**Effort:** ~3 sessions.

---

### T-10 · Morning Briefing *(big swing)*

**Goal:** A `/briefing` route that renders a full-bleed Ghibli doorway: hero painting + literary greeting + 3 narrated next actions + Begin/Dismiss/Regenerate. Auto-shown at first 06:00–10:00 visit each day; otherwise dismissed via localStorage flag.

**Files:**
- `src/app/briefing/page.tsx` (new)
- `src/app/api/briefing/route.ts` (new) — assembles narration via Anthropic
- `src/lib/briefing.ts` (new) — gathers calendar + queue + projects + yesterday's evening sentence (if any) → calls Anthropic
- `src/app/_components/BriefingShell.tsx` (new) — shared full-bleed wrapper
- `src/middleware.ts` — redirect logic: if today ∉ shown && hour ∈ [6,10) && path = `/` → redirect to `/briefing`

**Narration structure (model output JSON):**
```
{
  "greeting": "Good *morning*, Patrick.",
  "subline": "FRIDAY · MAY 2 · DAY 122 · 6 HRS SLEEP · RECOVERY 71%",
  "narration": "Yesterday you shipped <b>projects drill-in</b>. Today the calendar is gentle…",
  "actions": [
    { "n": "01", "title": "Reply to <em>Maya Lin</em>…", "meta": "3M · DRAFT READY", "href": "/?capture=queue" },
    ...
  ]
}
```

**Acceptance:**
- Renders even when Anthropic is down (cached prior briefing, then static fallback "Good *morning*, Patrick. The day is open.").
- "Begin" button (or ⌘↵) → marks today shown, navigates to `/`.
- "Regenerate" rebuilds narration without remembering this run.
- Mobile-first; full-bleed background, scrollable actions list.
- Sound: soft chime on mount if Sound enabled.
- Speaks the user's existing voice (no exclamation, italic-accent flourish, second-person elided).
- Ships before T-11 (Evening). Briefing must work even if Evening ceremony has never run yet.

**Dependencies:** T-01 (empty fallback uses EmptyState).
**Effort:** ~2 sessions.

---

### T-11 · Evening Ceremony *(big swing)*

**Goal:** A `/evening` route. Auto-fires at 21:00 local (or via ⌘K). Shows day rollup (ships, commits, captures, focus hrs) + a ledger of what happened + an optional textarea ("what mattered today?") that writes to HC journal. Closes with date stamp + chime.

**Files:**
- `src/app/evening/page.tsx` (new)
- `src/app/api/evening/route.ts` (new) — GET rollup; POST writes journal entry
- `src/lib/ceremony.ts` (new) — assembles rollup from agent_runs + git + ships + queue + capture
- `src/app/_components/BriefingShell.tsx` — shared
- `src/lib/habits.ts` — extend to write a "ceremony" journal entry kind

**Acceptance:**
- Stats grid (Ships / Commits / Captures / Focus hrs) populated from real sources.
- Ledger ≤ 8 rows, each with serif title + italic-accent word + mono meta.
- Optional textarea (≤ 280 chars), serif italic, posts to HC journal on submit + fires `ship` chime.
- Submit is optional — closing without writing still marks ceremony complete and seeds tomorrow's briefing with "no note left".
- localStorage `pg-os-evening-YYYYMMDD` prevents auto-fire twice.
- ⌘K command `evening.show` always opens it manually, even if already submitted.

**Dependencies:** T-01, T-02, T-10 (BriefingShell shared).
**Effort:** ~2 sessions.

---

### T-12 · Haptic-feeling motion polish

**Goal:** Pass over the dashboard tightening micro-interactions. No new features; just settling things.

**Targets:**
- Skeleton shimmer per card (replace page-wide loaders).
- Optimistic UI on capture/queue/habit-check (rollback on POST 4xx/5xx).
- Spring-physics on CaptureSheet open (scale + opacity, 0.4s, `cubic-bezier(0.22,1.68,0.36,1)`).
- Drag-to-dismiss on mobile sheets (CaptureSheet, RitualGate).
- Selected-state press (already exists on day tabs / switcher) — extend to all `.btn`-like elements: bg → `--fg`, text → `--bg-0`.

**Files:**
- `src/app/globals.css` (new section)
- `src/app/_components/CaptureSheet.tsx`
- `src/app/_components/RitualGate.tsx`
- `src/app/_components/views/HabitsView.tsx`
- Any component doing fetch-then-update.

**Acceptance:**
- All interactive elements have a press state defined.
- All mutations are optimistic; failures show inline error + revert state.
- `prefers-reduced-motion` collapses spring/drag to instant.
- Skeleton shimmer respects `--panel` translucency (no opaque grey blocks).

**Dependencies:** T-01 (EmptyState used as error state too).
**Effort:** ~1.5 sessions.

---

## 3. Roadmap (3 weeks, 3 sessions/week)

### Week 01 — *Unlock: Bookends*
- [ ] T-01 Empty State pass *(1)*
- [ ] T-02 Sound v0 *(1)*
- [ ] T-10 Morning Briefing *(2)* — start, finish next week if needed
- **Outcome:** the day has a front door.

### Week 02 — *Unlock: Command*
- [ ] T-04 ⌘K Palette *(2)*
- [ ] T-03 Pin active Chest *(1)*
- [ ] T-05 Narrated Claude overview *(1.5)*
- **Outcome:** hands on keyboard, eyes on signal.

### Week 03 — *Unlock: Depth*
- [ ] T-11 Evening Ceremony *(2)*
- [ ] T-09 Now Mode *(3)*
- [ ] T-07 Season meter + T-08 Ambient idle *(2)*
- [ ] T-12 Motion polish *(1.5)*
- [ ] T-06 Timeline feed *(2 — optional this week)*
- **Outcome:** the OS becomes a ritual.

---

## 4. Definition of done (per ticket)

A ticket is done when:
1. Acceptance criteria in this doc all check.
2. Works in all three palettes (Howl's / Totoro / Mononoke) — visual QA on each.
3. Works on mobile ≤ 680px (single column where applicable).
4. Keyboard accessible: focus-visible ring, arrow keys where listed, Esc dismisses overlays.
5. `prefers-reduced-motion` respected.
6. No new console errors in dev.
7. PR description includes a before/after screenshot at 1440px in Howl's.
8. This doc is updated: tick the box, add commit SHA + date next to it.

---

## 5. Out of scope (deferred)

- Server-rendered briefing (currently client-fetched on mount — ok for personal use).
- Push notifications for evening ceremony reminder (use Telegram bot already wired instead).
- Multi-user — PG OS stays single-user.
- New OAuth providers (Linear, GitHub Issues) — interesting later, not now.
- Reskin to a 4th palette — the three are enough.

---

## 6. Reference

- **Visual mockups:** `PG OS Critique & Proposals.html` (this project) — has rendered mocks of T-09, T-10, T-11.
- **Design system:** `/projects/98730cda-965b-4e9d-ad5c-77ad662d0258/` — guide + tokens + reference.html.
- **Existing CLAUDE.md:** `~/CEREBRUM/personal-os/CLAUDE.md` — stack + status + key file index.
- **Foundation lesson:** `feedback-foundation-before-flash.md` (2026-04-24) — *no decorative shaders without semantic meaning*.

---

*Spec authored 2026-05-02. Update freely as you ship — this file is the source of truth for the Q2 redesign.*
