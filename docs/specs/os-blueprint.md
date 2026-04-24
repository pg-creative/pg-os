# PG OS — Blueprint

**Date:** 2026-04-24
**Status:** v1.1 — revised after PG pushback on bento + re-surfacing of context-switching cost as the core pain
**Supersedes:** v0 (focus-tool framing — wrong) and v1 bento (too radical, dropped evening anchor incorrectly)
**Inputs:** cognitive audit (`claude-archive/docs/cognitive-audit.md` §9), Phase 1 audit (`phase-1-audit.md`), 12 interview answers, Laputa time-responsive design system already built

---

## The thesis (corrected again)

> You are not undisciplined. You are plural. **The tax you're paying is context-switching, not discipline.** Every jump between Metrasens, content, HC, and creative work burns neurological currency because each switch discards state. The OS is the home screen that **holds state across tabs** and **launches you back into Claude Code with context preloaded** — so switching between plural tracks costs one click instead of a cold re-entry. And it still holds you accountable to the same two things: did you ship today, did you unblock the decisions you've been dodging?

Two spines, not one. **Ship log** (output) + **Approval queue** (unblock). Two anchors: **Morning** (did you do your ritual) + **Evening** (did you close the day). Everything else either feeds them, reports on them, or gets out of the way.

---

## Humility principle (up-front, non-negotiable)

The interview surfaced this directly: you are hoping the OS will fix your discipline, emotional regulation, plurality management, and shipping consistency — **and you know it won't.** The OS must not pretend to. It must **hold** these tensions without gaslighting you about them.

Concretely, the OS displays a permanent one-line footer:

> *The OS can show you. It cannot do it for you. Discipline, regulation, focus, and shipping are yours.*

Small. Quiet. Always there. It's the vaccine against "if I just had the right system."

---

## Non-negotiable principles (7)

1. **Ship + Decide are the only verbs that matter.** Every surface either ships, unblocks, feeds one of them, or reports on them.
2. **Plurality is a feature, not a bug.** The OS never forces you to pick a single context. Show everything at once. The bento is the aesthetic expression of your actual cognitive state.
3. **Morning ritual already exists — surface, don't re-build.** You do pages + stretch + sunlight + Whoop. The OS asks *"did you?"* — it does not ask you to start a new one.
4. **Day planning is aspirational — offer, don't enforce.** No blocked dashboard. A "today's shape" pane is available but skippable without ceremony.
5. **Small visible wins are the on-ramp into flow.** Ship log is the first thing with positive affect. A first-ship-of-the-day animation. A streak that feels warm.
6. **ADHD-shaped design.** Reduce context-switch cost. Make decisions visible so they don't haunt the background. Single view > navigating between pages. Pins > remembering.
7. **Aesthetic over productivity app.** The Ghibli + golden hour + Laputa ambient feel is load-bearing. If a feature makes the OS feel like Linear or Notion, redesign or cut.

---

## The architecture — tabbed home + launchers

The bento idea is dead. You already have the right instinct: a home screen you know, tabs that drill into specific views, and the OS remembers where you were in each tab.

The architecture has three parts that interlock:

### Part 1 — The Home tab (existing dashboard, unchanged)

Keep everything that's already live:
- Laputa time-responsive hero (Day / Twilight / Midnight auto + manual override)
- LiveClock
- CalendarEvents (today + week toggle)
- NowPlayingLive (Spotify with controls)
- VitalsLive (Whoop — placement to be refined, but stays visible)
- AmbientParticles
- ModeSwitcher

This is the welcome screen. Aesthetic locked. You open the OS → you land here.

### Part 2 — Tabs that persist state

A tab bar (likely top or left rail, design-options territory at build time). v1 tab set:

| Tab | What it holds | State preserved |
|---|---|---|
| **Home** | Existing dashboard (above) | Current Laputa mode manual override |
| **Habits** | Morning + evening anchor check-ins + streak | Today's checkbox state |
| **Projects** | Master view of all active projects + launchers | Last-viewed project, scroll position |
| **Flow** | Ship log + Approval queue (two-pane or stacked) | Current filter, capture-in-progress |

Four tabs. Tight. You can have more later; v1 stays small so it ships.

**State persistence** is the whole point. Every tab remembers its last state in localStorage + a small SQLite store. Switching tabs feels like glancing — no reload, no "where was I."

**What is NOT a tab:**
- **Capture** is a floating action button visible on every tab (🎙️ bottom-right). Click → voice or type dump → routing panel appears over the current tab. Never a context switch.
- **Archive / Past Echo** surfaces inline where relevant (ambient in Flow, contextual in Projects), not a destination.
- **Yuriko / Money / Relationship surfaces** live inside Projects or Habits tabs depending on what they are, not peer tabs.

### Part 3 — Launchers (the Claude Code coupling made real)

This is the piece that breaks the neurological cost. Every active project in the Projects tab has a **"Launch session"** button that:
1. Opens a fresh terminal window (mechanism TBD — see open questions)
2. `cd`s into the project directory
3. Starts `claude` (Claude Code)
4. Auto-pastes or injects a pre-built context prompt: *"Resuming work on [project]. Last session: [summary]. Currently blocked on: [from queue]. Recent ships: [last 3]."*

You click the tab → you see the project → you click launch → Claude Code opens already-oriented.

**The real-time state** each project card shows (computed from git + MEMORY.md + queue files):
- Last ship (timestamp + one-line)
- Current block (top queue item, if any)
- Uncommitted changes count
- Last session date
- Deadline if known

**Cost model:** zero context-switch friction. You don't `cd` into a project to see what's going on. You don't grep through memory to remember where you stopped. The tab shows it; the launcher hands Claude the context.

### Home mode toggle (unchanged)

A single toggle in the top-right corner, visible across all tabs. When on:
- Habits tab: stays (anchors are the one thing that matters in home mode)
- Home tab: dims work-adjacent widgets, keeps Spotify/clock/hero
- Projects + Flow: collapse to a single line each
- Notifications muted

This is the only mode-switch in the system. Everything else is tab-switching.

---

## The two spines (inside the Flow tab)

Both live on the Flow tab, side-by-side (two-pane on wide, stacked on narrow).

### Spine A — Ship log
- **Entry**: one textarea with a context tag (auto-suggested from active project in Projects tab, editable)
- **Streak indicator** is warm-amber after 3, gold after 7, ember after 14 — animates on first-ship-of-the-day (your on-ramp-into-flow signal)
- **Context filter** exists but is not primary — default view is "everything"
- **Ship definition**: recommend starting tight (external-artifact-only), override after a week if it feels wrong

### Spine B — Approval queue
The variant-selection-paralysis antidote from Phase 1.

**Entry format:** each decision is a card with:
- Title (1 line)
- Source (which project / Claude session it came from)
- Options (if known — e.g. "9 HC login variants")
- Waiting-since date
- **"Decide" button** → opens the right surface (a variant gallery for HC picks, a Notion doc for strategy decisions, a Claude Code session if it needs discussion)

**Escalation:** items > 14 days old get amber border. Items > 30 days surface in weekly review as "kill-or-commit."

**Claude Code integration** — file-store model (specced below). Pending decisions are markdown files Claude writes when you tag them during a session.

## The two anchors (inside the Habits tab)

The anchors come back. You pushed back correctly — modular tabs mean the anchors can live without dominating the Home screen.

### Morning anchor
You already do this ritual. OS acknowledges, doesn't invent.

Checkboxes (reflecting your interview answer — these are real, load-bearing):
- [ ] Morning pages / writing
- [ ] Stretch + sunlight
- [ ] Whoop check-in
- [ ] (Optional) Day shape — 3 bullets for today's shape

First three are the load-bearing set from the interview. Day shape is aspirational — present but never blocking.

### Evening anchor
Confirmed in interview Wave 3 — you DO evening reflections + mood check-ins. (Phase 1 audit missed this because it lives in Hero's Chronicle, not Obsidian — see HC reconciliation section below.) The evening anchor is both **"close the day cleanly"** AND reflection/mood.

Checkboxes:
- [ ] Today's ship logged (autopopulated from Flow tab)
- [ ] Tomorrow's one-thing (single line — appears in Habits tab tomorrow morning)
- [ ] Open loops count (glanceable number from Approval queue — awareness, not a task)
- [ ] Mood check-in (1-5 or emoji set — exact format TBD, must reconcile with HC)
- [ ] Reflection (freeform, always optional, never prompted with leading language)

**Streak:** two streaks, one per anchor. Both get the ember-after-14 treatment. Missed days reset without shame copy.

**Weekly review:** Sunday only. Surfaces automatically in Habits tab. Pulls the week's ships, decisions moved, anchors hit, then one free-text prompt: *"Is that who you wanted to be this week?"* (brutal mirror pattern from v1.)

---

## Claude Code ↔ OS integration — options + recommendation

You said this was a big decision and asked for detail. Here it is.

### The options

**Option A — Live-synced from Claude Code tasks & memory files**
OS reads `~/.claude/projects/*/tasks/` and `memory/*.md` files continuously. Any pending task or file matching a "pending decision" pattern shows up.
- Pros: zero friction, nothing to remember to push
- Cons: noisy — every in-flight task becomes a queue entry. False positives. Hard to distinguish "I'm actively working on this" from "this is blocked on me."

**Option B — Claude writes to OS explicitly via MCP/API**
When Claude Code flags a decision for you (variant pick, approval needed), it makes an explicit call to the OS. Opt-in per decision.
- Pros: precise — only things Claude thinks need approval land there. Clean queue.
- Cons: requires MCP server or local API. Claude has to remember to push (reliability concern). More infrastructure.

**Option C — Shared markdown file store** *(recommended)*
A single directory: `~/.pg-os/queue/`. Each pending decision is a markdown file with frontmatter (title, source, options, created_at). Both OS and Claude Code read and write this directory. OS renders queue from directory contents.
- Pros: transparent — you can `ls` the directory or open any file. Git-trackable. Works across sessions because files persist. Hand-editable if miscategorized. Aligns with your "living documents" principle. Zero new infrastructure (no MCP, no API). Matches how you already think (files as truth).
- Cons: both sides have to agree on the markdown format. If Claude forgets to write a file, the decision isn't surfaced — but that's true of all of B too.

**Option D — Manual PG capture**
You tag decisions as "needs approval" when they come up. Claude doesn't auto-push.
- Pros: full control
- Cons: adds friction, likely won't happen consistently under ADHD. Phase 1 audit showed decisions accumulate silently as it is.

### My recommendation: **Option C — shared markdown file store**

Three reasons:
1. **Aligns with your entire philosophy** — living documents, git-trackable, aggressive pruning, manual-when-manual-wins, no unnecessary automation.
2. **Most debuggable** — if something feels wrong, you open the file. No black box.
3. **Simplest build** — a directory + a markdown schema is hours of work, not weeks. An MCP server is weeks.

Claude Code gets a tiny rule ("when a decision is waiting on PG's approval, write a file to `~/.pg-os/queue/` with this schema") that I can add to `~/.claude/CLAUDE.md` once you approve. OS watches the directory and renders.

Auto-expire rule ties into the reconcile loop (see below).

---

## v1 scope — all four advanced features

Per your answer: all in, aesthetic preserved.

### Home mode toggle
Specced above. Simplest of the four.

### Brutal mirror
A quiet ambient pattern, not a confrontation.
- **Weekly card** (Sunday only, Human context): *"This week — you shipped X things. Decided Y. Avoided Z. Is that who you wanted to be this week?"* Free-text response optional.
- **Daily ambient** (all days, bottom of dashboard, small): one rotating line pulled from your own archive via RAG. *"You said on [date]: 'I want to become more of a risk taker.' Today's decisions queue: 5 items."*
- Never red. Never "critical." Tone is mirror, not judge. Matches your "brutally honest advisor" prompt voice from the archive.

### Synthetic deadlines for drifting tracks
For tracks without external forcing functions (PG Creative, Voyager, Yuriko):
- OS invites you to set a tentative deadline when the tile has been static for 7 days
- If you decline, the tile shrinks and enters "drift" state — visible but muted
- Drift tracks appear in the weekly brutal mirror card
- Never auto-assigns deadlines on your behalf — respects the "OS suggests, PG decides" posture

### Native reconcile loop (anti-churn)
Runs daily at a quiet time (say 2am).
- Approval queue items > 14 days: escalate to amber border
- Approval queue items > 30 days: surface in weekly review as "needs kill-or-commit"
- Ship log entries with no source file / orphan references: flagged for cleanup
- Stale track tiles (no ship, no decision in 30 days): proposed for archive
- **Report surface:** a small weekly "reconcile report" card Sunday morning

This is the OS being its own janitor — because you flagged orphan churn as your #1 escalating friction.

---

## Hero's Chronicle reconciliation (architectural open question)

You flagged this directly: PG OS and HC overlap on daily journal + mood check-in + shipping + streaks + goals. HC launches Oct 2 as a product for other people to use. PG OS is for you. Both need to exist. They cannot duplicate.

This is a **Phase 3 blocker** (Habits tab build depends on it) but **NOT a v1 blocker** (Phase 1 tab shell is independent). We can answer it between Phase 2 and Phase 3.

Options at a glance:

- **A. Separation** — HC stays the product; PG OS is private. PG OS's evening anchor just links out to HC's journal. Minimal overlap, maximum clarity. Cost: context-switch between two apps (the exact thing v1.1 is trying to kill).
- **B. Shared data, separate surfaces** — both read/write HC's Supabase. Mood + journal + streaks live in HC's DB; PG OS displays them in Habits tab with a link to edit in HC. One source of truth, two viewports.
- **C. PG OS writes into HC** — PG OS's evening anchor posts to HC's journal via API. HC stays source of truth; PG OS is a thin write surface. Useful if HC's mobile is where you do most check-ins but PG OS is open when you're at the desk.
- **D. Merge private features into PG OS, ship HC without them** — the journal + mood features become PG OS-only for personal use. HC ships with the public-facing gamification surface (attributes, achievements, companion) minus PG's personal life-tracking. Biggest architectural move, cleanest eventual product.

This is council-worthy when we get there. Not now. Flagging so we don't wander into Habits tab build without having resolved it.

---

## Layers → Tabs (mapped)

The v1 layer model maps cleanly to the tab architecture:

| Former layer | Now lives in |
|---|---|
| Anchor rituals | **Habits tab** (morning + evening) |
| Physical telemetry | **Home tab** (VitalsLive card — placement refinement pending) |
| Voice capture | **Floating action button** (reachable from any tab) |
| Thinking companion (archive RAG) | **Ambient in Flow + contextual in Projects** (not a dedicated tab) |
| Ship log + Approval queue | **Flow tab** (two spines) |
| Project state / launchers | **Projects tab** (new — the launcher pattern) |

This is the same functional surface as v1, reshaped to remove context-switch cost.

---

## Yuriko surface

Unchanged from v0, slightly refined.

- Dedicated card that appears in bento when "I'm writing Yuriko" toggle is active in capture
- Hidden in Home mode
- Voice dumps from this mode bypass routing panel — straight to novel notebook
- Writing session counts as a ship tagged `yuriko`

---

## Money / runway widget

Unchanged from v0: runway-weeks + shipping velocity + "enough" progress. No raw numbers on dashboard. Ledger view behind a deliberate click.

Position in bento: lives in the Human tile when active, or can be pinned S.

---

## Relationship surfaces

Unchanged from v0:
- Home mode toggle (covered above)
- Therapy monthly ambient card in Human tile
- Parker birthday + last-contact ambient card in Human tile
- Dad: no dedicated surface; appears on birthday/anniversaries only

---

## Build sequence (v1.1)

Reordered to deliver the core context-switching fix first.

**Phase 1 — Tab shell + state persistence** *(first build)*
Minimal. Add the tab bar. Four tab routes (Home / Habits / Projects / Flow). Each tab = a page stub with "coming soon" except Home, which keeps the existing dashboard exactly as-is. LocalStorage per-tab state.
Exit: you can click between 4 tabs, Home renders unchanged, other tabs render placeholders, last-tab is remembered on reload.

**Phase 2 — Flow tab (Ship log + Approval queue) + file-store plumbing**
The two spines, live. Ship log writes to local SQLite. Approval queue reads `~/.pg-os/queue/` markdown files. CLI helper `pgos queue add`. Claude Code rule added to `~/.claude/CLAUDE.md`.
Exit: 7 days of at least 1 ship/day and at least 1 queue item flowing through.

**Phase 3 — Habits tab (morning + evening anchors)** *(blocked on HC reconciliation decision — see section above)*
Two checklists, two streaks, Sunday weekly review card. Reads Flow tab for autopopulation. Mood + reflection integration depends on HC decision.
Exit: anchor streaks start accumulating + mood check-in is either live in PG OS or cleanly handed off to HC.

**Phase 4 — Projects tab skeleton (no launchers yet)**
Tiles for active projects. State read from git + MEMORY.md + queue files. "Last ship / current block / last session / deadline" per tile.
Exit: tiles render correct state across Metrasens, PG Creative, HC, Voyager, personal-os, claude-archive, career-ops.

**Phase 5 — Launchers (the context-switch-cost killer)**
Each project tile gets a "Launch session" button. Opens terminal + `cd` + `claude` + injects context prompt. Mechanism depends on open question 2 below.
Exit: one click from Projects tab → working Claude Code session with project context loaded.

**Phase 6 — Voice capture FAB + routing**
Floating action button on every tab. Voice/type dump → routing panel → destination (ship log, queue, LinkedIn via `linkedin-post-creator`, essay draft, Yuriko, etc).

**Phase 7 — Home mode toggle**

**Phase 8 — Brutal mirror ambient (inside Habits weekly review)**

**Phase 9 — Synthetic deadlines** for drifting tracks (PG Creative, Voyager)

**Phase 10 — Reconcile loop** (nightly janitor for queue + ship log orphans)

**Phase 11 — Yuriko surface** + Money runway widget + Relationship ambient cards. Slot into Projects tab as specialized tiles.

**Phase 12 — Harden pass** — edge cases, real-world failure, the "does it feel like a productivity app?" anti-test.

---

## What PG OS is NOT (unchanged + sharpened)

- **Not a productivity app.** Aesthetic violation.
- **Not a focus tool.** Show-everything, not pick-one.
- **Not a Notion replacement.** Notion stays the long-form store.
- **Not a calendar.** Google stays the source.
- **Not a CRM.** Salesforce / Notion stay.
- **Not a Claude chat UI.** Claude Code is that.
- **Not a habit tracker.** Anchors are an acknowledgement, not a gamified streak.
- **Not a mood journal.** You don't journal phenomenologically. The OS respects that.
- **Not the fixer of your discipline, emotions, plurality, or shipping.** Humility footer.

---

## Remaining open questions (what I need to get v1 going)

These block or materially shape Phase 1+. Answers below.

1. **Tab set** — 4 tabs (Home / Habits / Projects / Flow) with Capture as a floating action button? Or do you want Capture as its own tab, or Flow split into Ship + Decide?
2. **Launcher mechanism** — how should "Launch session" actually open a terminal with Claude Code? Options:
   - **A. AppleScript to Ghostty** — opens a new Ghostty tab/window, runs `cd ~/CEREBRUM/<project> && claude`, pastes context prompt
   - **B. Command-to-clipboard** — copies `cd ~/CEREBRUM/<project> && claude --context "<prompt>"` to clipboard, you paste into any terminal
   - **C. macOS URL scheme** — `ghostty://...` or custom `pgos://launch/<project>` handler
   - **D. A tiny local agent** (long-lived background process) that spawns terminals
3. **Project state data source** — how does the Projects tab know current state?
   - **A. Auto-detect** from git status + `.claude/projects/*/memory/MEMORY.md` + `.pg-os/queue/*.md`
   - **B. Per-project `status.md`** that you (or Claude) update manually
   - **C. Hybrid** — auto-detect baseline, manual override via `status.md` if present
4. **Whoop card placement** — you flagged it's in the wrong spot. Options: (a) smaller, tucked into Home; (b) moved to Habits tab (ties to morning check-in); (c) a collapsible sidebar across all tabs. Your call.
5. **Evening anchor contents** — I specced 4 items: ship-logged / tomorrow's-one-thing / open-loops-count / optional-reflection. Is that the right set, or different items?
6. **Ship granularity** — tight (external artifact only) or broad (includes commits, completed drafts, a finished Claude session that moved something). Recommend tight to start.

Questions 1-3 are Phase 1-blocking. 4-6 can resolve during build.

---

## Next

Answer the open questions → I write `docs/specs/phase-1-tab-shell.md` → we build Phase 1 (tab shell + state persistence, Home stays identical).

The shape test: the sentence **"v1 of PG OS keeps my home screen the same, gives me four tabs that hold state, and lets me launch into Claude Code without losing where I was"** should feel correct.
