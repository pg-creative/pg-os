# Cockpit / Kitsu Continuation (2026-05-20 mega-session)

> Paste the PROMPT block below into a FRESH Claude Code session (launched from
> `~/CEREBRUM/personal-os`, branch `worktree-cockpit`, worktree
> `~/CEREBRUM/personal-os/.claude/worktrees/cockpit`). Everything below it is the
> state + plan + an Agent SDK crash course.

---

## PASTE THIS TO RESUME
```
Resume the personal-os redesign + Kitsu work on branch worktree-cockpit (worktree:
~/CEREBRUM/personal-os/.claude/worktrees/cockpit). Run: pnpm exec next dev -p 3031.

Read first:
1. memory cockpit_marvis_build.md
2. docs/cockpit-continuation-2026-05-20.md  (this file: state + plan + Agent SDK crash course)
3. docs/specs/redesign-2026-05-emaki-laputa.md  (the design redesign plan)
4. docs/specs/kitsu-overhaul-2026-05.md + docs/specs/kitsu-orchestrator-architecture-2026-05.md

HARD RULE this session and forever: NO em dashes anywhere (chat, code, docs). Period/comma/colon/parens.

Where we are: design direction LOCKED (Emaki x Laputa, 3-phase sky), Home layout = top-bar
broadsheet, Kitsu being rebuilt as a local Claude Agent SDK orchestrator (Phase 1 committed).
Pick up at the NEXT ACTIONS list in the continuation doc.
```

---

## STATE (end of 2026-05-20)

### Design direction: LOCKED
- **Emaki x Laputa**: painted Japanese picture-scroll + Laputa legibility, 3-phase
  time-responsive sky (day 陽光の庭 Laputa-blue / twilight 黄昏の刻 sakura / night 狐火の道 foxfire),
  real Kitsu Live2D avatar. Approved prototype: `/dev/emaki-laputa`.
- Lock + craft rules: `~/.claude/research/pgos-aesthetic-lock-2026-05.md`. CANON updated.
- Reusable module: `src/app/_components/emaki/` (theme.ts = 3-phase tokens; materials.tsx =
  PaintedBackdrop, WashiPanel, FoxfireLayer, KintsugiSeam, useEmakiVars, per-phase ambient
  animations + pointer parallax, phase glyphs).
- Legibility standard (non-negotiable): `~/.claude/research/legible-ui-over-imagery.md`. Blur/halo
  are LUMINANCE-AWARE (day no-blur/no-halo, night/twilight frosted+halo).

### Home layout: DECIDED = top-bar broadsheet
- 4-variant lab at `/dev/home-lab` (?v=1..5). PG picked **V2 top-bar broadsheet** for Home.
  The **focal-cockpit mechanic (V3/V5, Kitsu at the helm)** goes to the **Cockpit tab**, not Home.
- NOT yet shipped into the live `HomeView` (that is the "wire real data + migrate" step).

### Kitsu: rebuilding as a Claude Agent SDK orchestrator (architecture-first)
- Vision (PG): a genius orchestrator LLM connected to EVERYTHING (his whole Claude Code, tools,
  MCPs, plugins), with evolving personality, memory, "consciousness" (persistence).
- Architecture (approved): Kitsu = a persistent LOCAL Agent-SDK daemon on the Mac (the brain);
  the OS app is the face. See `kitsu-orchestrator-architecture-2026-05.md`.
- **Phase 1 DONE + committed (901b5fc):** `src/lib/kitsu/kitsuAgent.ts` (SDK query() wrapper:
  persona + fleet, 9 tools via createSdkMcpServer, settingSources:["user"] loads ~/.claude
  skills/plugins/.mcp.json, conservative canUseTool, session resume) + `src/app/api/kitsu/query`
  SSE route. Verified: SDK streams correctly end-to-end.
- Autonomy: conservative (reads + propose_action auto; add_*/external writes need approval;
  Bash/Write/Edit disallowed for now).

### Process learnings baked into rules (durable)
- `~/.claude/rules/design-anti-generic.md` slimmed to PROCESS-ONLY (look-mandates scrapped) and
  then RE-STRENGTHENED: radical-multi-variant design-lab is THE method (3-4 genuinely different
  variants, switchable, nav-placement options, falsifier, per module). Skills are AUDITORS not generators.
- NO-EM-DASH rule added to hard-rules.md + ai-tells-essential.md.
- The 5 design skills (impeccable, ui-ux-pro-max, huashu-design, taste, taste-5dim) are installed at
  vendor default (alignment was stripped per PG). Only kept fix: ui-ux-pro-max search.py (real dirs + abs paths).

## BLOCKERS (PG actions)
1. **ANTHROPIC_API_KEY is INVALID (401).** Kitsu's brain (old copilot AND new Agent-SDK) cannot
   auth. PG must drop a fresh key into `.env.local` (console.anthropic.com), then restart dev server.
   This is the only thing between us and a live Kitsu. (Subscription auth via SDK: partial, mid-June 2026, mechanism undocumented.)
2. **Kitsu voice pick:** model upgraded flash->multilingual_v2 (good), but the VOICE itself
   (`ELEVENLABS_VOICE_ID c6Sf...`) is PG's ear to choose. A sample MP3 was generated this session.

## NEXT ACTIONS (resume here, in order)
1. **(if key refreshed)** Restart dev server, hit `/api/kitsu/query`, verify Kitsu thinks + uses tools/MCPs.
2. **Phase 2 (Kitsu):** wire `useMarvis` / MarvisCorner from `/api/copilot/chat` to `/api/kitsu/query`
   (handle the session_id continuity event, keep TTS). Was about to start when context cleared.
3. **Phase 3 (Kitsu):** memory + evolving persona (Supabase + ~/.pg-os/kitsu/personality.md +
   decision-log.md + the correction feedback loop).
4. **Phase 4 (Kitsu):** orchestration + proactive presence (Monitor tool on the fleet, dispatch/monitor
   sessions + agents). The genius-orchestrator part.
5. **Ship Home:** wire real data into the live `HomeView` in the top-bar layout (migrate off legacy).
6. **Cockpit tab:** rebuild as the focal-cockpit (Kitsu at the helm), converges with Kitsu Phase 4.
7. **Other tabs (WS4):** each gets its own 3-4-variant layout bake-off, then ship. + WS2 icons/app-icon.

---

## AGENT SDK CRASH COURSE (thorough + simple)

**What it is.** The Claude Agent SDK is a library (TypeScript or Python) that lets you build YOUR OWN
agent using the exact same engine that powers Claude Code. You import it, call `query({ prompt, options })`,
and it runs the full agent loop for you.

**The one idea that matters.** A plain LLM call is: you send text, you get text back. An AGENT is a loop:
the model thinks, decides to use a TOOL, the tool runs, the model sees the result, and it repeats until
the job is done. Writing that loop by hand (parse tool calls, execute them, feed results back, cap the
rounds, stream tokens) is exactly what the old Kitsu `/api/copilot/chat` did. **The Agent SDK does all of
that for you.** It is "Claude Code as a library."

**What you get for free (vs hand-rolling):**
- The agent loop, streaming, token/context management.
- A real toolbox: read/write files, run bash, search/fetch the web, plus spawn subagents.
- **MCP servers**: point it at your `.mcp.json` and it can call every MCP tool you have (Notion, Gmail,
  Calendar, Spotify, etc.), named `mcp__server__tool`.
- **Your skills + plugins + CLAUDE.md**: it auto-loads them from `.claude/` via `settingSources`.
- **Sessions**: it saves the conversation; pass `resume: sessionId` and it remembers (this is the basis
  for memory/continuity).
- **Permissions**: `allowedTools`, `disallowedTools`, and a `canUseTool` callback / `permissionMode` let
  you control exactly what the agent may do (e.g. auto-allow reads, require approval for writes).

**The 6 core pieces (the whole API, basically):**
1. `query({ prompt, options })` -> an async stream of events (init w/ session_id, assistant text, tool
   uses, result). You iterate it.
2. `tool()` + `createSdkMcpServer()` -> define your OWN tools in-process (we ported the 9 Kitsu tools this way).
3. `mcpServers` / `.mcp.json` -> attach external MCP servers.
4. `settingSources: ["user"|"project"]` -> load `.claude/` skills, plugins, CLAUDE.md.
5. sessions (`session_id` + `resume`) -> persistence/memory.
6. permissions (`allowedTools` / `disallowedTools` / `canUseTool` / `permissionMode`) -> safety + autonomy.

**Plain SDK vs Agent SDK.** `@anthropic-ai/sdk` (the plain one) = raw message API; YOU build the loop and
tools. `@anthropic-ai/claude-agent-sdk` = the loop, tools, MCPs, skills, sessions, and permissions are built
in. For "an agent that does things," use the Agent SDK. For "one model call," the plain SDK is fine.

**Best practices (what we are following for Kitsu):**
- **Run it where the tools live.** Local MCPs + your Claude Code config live on your Mac, so the agent runs
  as a LOCAL process, not on Vercel. The web app is just the face that streams to it.
- **Permissions conservative by default.** Allow reads, gate writes/external/spend, block catastrophic bash.
  Loosen tool-by-tool as trust grows.
- **Persist sessions** for continuity, and layer a memory store (files + DB) for durable, evolving knowledge.
- **Keep custom tools as an in-process MCP server** (clean, fast). Attach external tools via MCP config.
- **Mind cost/latency:** every tool call is a round trip to the model. Batch reads, prefer streaming/Monitor
  over polling.
- **Auth:** `ANTHROPIC_API_KEY` today; subscription-based auth is coming (mid-2026) but not yet documented.

**Why this is the right substrate for Kitsu.** "Connected to everything + a real orchestrator" cannot be
reached by patching a bespoke chat loop. The Agent SDK gives Kitsu your actual runtime, tools, MCPs, skills,
and persistence in one shot. Kitsu becomes a persistent local agent that IS your Claude Code, wearing a
fox, with memory and an evolving personality, surfaced in the OS.

Docs: code.claude.com/docs/en/agent-sdk (overview, typescript, mcp, custom-tools, sessions, permissions).
