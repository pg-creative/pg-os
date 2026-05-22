# PG OS — Functionality / Wiring Plan (fresh session, 2026-05-21)

> The DESIGN is done. Whole OS is a cohesive Emaki x Laputa bento app: one global top bar, full-bleed
> bespoke painting per tab, bento tiles, persistent collapsible Kitsu, live day/twilight/night toggle,
> legibility passed via two 4-auditor gates. Branch `worktree-cockpit`, worktree
> `~/CEREBRUM/personal-os/.claude/worktrees/cockpit`, dev `pnpm exec next dev -p 3031`.
> **Now the focus shifts from look to FUNCTION: make it actionable and wire it to PG's real
> projects, Claude Code, and Kitsu.**
>
> Method (unchanged): NO em dashes anywhere. Plan mode for any design move. Show-all-options-BUILT
> (never text menus). Cohesion over divergence. Run the 4-auditor QA gate on built surfaces. Research
> before building. Read memory `redesign_cohesive_shell_locked.md` + `redesign_shell_phase_b_details.md`.

## Phase 0 — Quick design carryover (do FIRST, ~30 min, then move to function)
1. **Overlay too harsh** (PG: "on many tabs you can barely see the image"). The `EmakiBackdrop` scrim
   is too opaque, especially on `subtle` tabs. Lighten it: in `src/app/_components/emaki/EmakiBackdrop.tsx`
   drop the scrim (subtle ~0.85 -> ~0.55, prominent ~0.60 -> ~0.38) so the bespoke painting actually reads,
   while keeping panels solid for legibility (the art shows in the gaps/margins, not through text). Tune per
   tab + re-screenshot day/twilight/night.
2. **Reoptimize the art**: the 27 PNGs are 46MB (~1.7MB each) and gitignored. Resize to ~1600px wide +
   compress (sharp or `sips`/`magick`) to ~250-350KB each (~8MB total) for faster load, then `git add -f`
   `public/art/tabs/` so it deploys. Add the resize step to `scripts/gen-tab-art.py`.
3. **Re-add SoundToggle** to `EmakiShellBar` right-actions (preserved in `_legacy/LegacyTopBar.tsx`).
   Brand-mode picker (per-brand accent/filter lens, ⌘⇧M) is OPTIONAL — re-add only if PG wants the button.

## Phase 1 — Make every tab ACTIONABLE (the core of this session)
Right now tabs mostly DISPLAY. Wire real data + real ACTIONS (with confirmation gates for writes). Audit
each tab for "what should clicking this DO?" Per tab:
- **Cockpit** = the Claude Code control surface. Verify the daemon (`scripts/cockpit-daemon.mjs`) +
  two-way terminal + launch/attach actually work end-to-end; this is the live Claude Code integration.
- **Projects** = drill-in exists; wire actions: launch a session in a project, set active, surface
  blockers/action-items from MEMORY.md, link to the live session in Cockpit.
- **Flow** = queue approve/dismiss/decide must write through (`~/.pg-os/queue/` + Supabase mirror).
- **Habits** = complete/log habits + journal write through to HC Supabase. Verify.
- **Claude** = self-improvement proposals are actionable (approve/dismiss -> decisions_log + trust).
- **Brain** = dartboard entries actionable (process/route via the dartboard pipeline).
- **Stack** = evals actionable (install / dismiss / mark).
- **Home / Timeline** = mostly read; make tiles click-through to their source tab.

## Phase 2 — Kitsu orchestrator (the big build; ties it together)
Kitsu Phase 1 (Agent SDK brain) + Phase 2 (UI wired) + Spotify control are DONE. Next:
- **Phase 3 — memory + evolving persona**: `~/.pg-os/kitsu/personality.md` + `decision-log.md` +
  Supabase `agent_state`; read on init, correction feedback loop writes back. Cross-session continuity
  beyond SDK session resume.
- **Phase 4 — orchestration + proactive presence**: give Kitsu the `Monitor` tool on the live fleet;
  let him dispatch + monitor Claude Code sessions and scheduled agents, route work, and proactively
  surface nudges. This is the "genius orchestrator connected to everything."
- **Expand Kitsu's action tools** to the actionable items above (queue, ships, projects, habits, launch
  sessions) with the conservative confirmation gates already in `canUseTool`.

## Phase 3 — Claude Code / projects deep integration
- Harden the Cockpit daemon two-way terminal; Projects <-> live sessions <-> Kitsu (Kitsu can launch /
  monitor a session per project from the Cockpit).
- Fleet telemetry feeds Kitsu's Monitor; the Cockpit tab IS the orchestration cockpit.

## Key files / state
- Design kit: `src/app/_components/bento/` (TabShell/BentoBox/BentoGrid/emakiContext), `emaki/`
  (theme.ts PHASES, materials.tsx, EmakiBackdrop.tsx, tabBackdrops.ts), `EmakiShellBar.tsx`.
- Kitsu: `src/lib/kitsu/kitsuAgent.ts` (Agent SDK + tools + canUseTool), `src/app/api/kitsu/query`,
  `useMarvis.tsx`, `MarvisCorner.tsx` (now collapsed-by-default).
- Claude Code: `CockpitView.tsx`, `scripts/cockpit-daemon.mjs`, `/api/cockpit/*`, `/api/sessions`.
- Data routes: `/api/{vitals/whoop,calendar/events,projects,claude/agents,ships,queue,habits,spotify/*}`.
- Art regen: `scripts/gen-tab-art.py` (Legnext API: POST /api/v1/diffusion `{text,model:"midjourney",
  task_type:"imagine"}` + browser User-Agent REQUIRED or Cloudflare 1010; poll /api/v1/job/{id}).
- **BLOCKER to clear early**: `~/.zshrc` line 23 exports a STALE 401 `ANTHROPIC_API_KEY` that shadows the
  valid one in `.env.local` (Next does not override an exported env var). Fix line 23 so Kitsu's brain +
  the Claude CLI it spawns authenticate without the dev-server-relaunch workaround.

## Commits so far (worktree-cockpit): 98d2bf4 -> 85def63 (14 commits, design complete).
```
98d2bf4 bento kit + global Kitsu        a1ef4da BentoHome v0 (retired)    2a623bf global nav (kill amalgamation)
9b9ea5c full-bleed + overlaid nav       7bf3286 immersive hero art        6c8630a Cockpit into language
48bca96 phase toggle restored           284b42e theme-everything+scale    42cbbae audit fixes (Home)
ff32973 all 7 tabs reskinned            85def63 bespoke art + 2nd audit sweep
```
