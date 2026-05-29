# Kitsu Orchestrator Architecture (Agent SDK) :: 2026-05-20

> The architecture-first design for rebuilding Kitsu's brain on the **Claude Agent SDK**.
> Grounded in the official Agent SDK docs (overview, mcp, custom-tools, sessions, permissions,
> typescript reference at code.claude.com/docs/en/agent-sdk/*). Companion to `kitsu-overhaul-2026-05.md`.
> Decision: build on the Agent SDK, architecture-first (PG, 2026-05-20).

## The core insight: Kitsu is a persistent LOCAL service
"Connected to my whole Claude Code, my tools, my MCPs, my plugins" means connected to the things
that live on PG's Mac. A cloud/Vercel function cannot reach his local Claude Code runtime, MCP
servers, or plugins. So **Kitsu is a long-lived local Node daemon on PG's machine**, running the
Agent SDK, with his real `.claude/` and `.mcp.json` mounted. The personal-os web app is the FACE;
the daemon is the BRAIN. (Same pattern as the existing cockpit-daemon, but it is an agent.)

## What the Agent SDK gives us for free
- **The agent loop, streaming, tool execution, token/context management** via `query({ prompt, options })`.
  Replaces the hand-rolled loop + 5-round cap in `/api/copilot/chat/route.ts`.
- **MCP attachment** via the `mcpServers` option or auto-loading PG's `.mcp.json` (`settingSources: ["project"]`).
  Same servers Claude Code uses, same `mcp__server__tool` naming. Notion, Gmail, Calendar, Spotify, etc.
- **Plugins + skills + CLAUDE.md** auto-loaded from `.claude/` (so Kitsu inherits PG's whole skill library).
- **Sessions:** capture `session_id` from the init message, `resume: sessionId` next turn, full context restored (JSONL on disk).
- **Permissions:** `allowedTools`, `disallowedTools`, `permissionMode` for safe autonomy.

## The architecture
```
PG's Mac
├── Kitsu daemon (Node, persistent)            <- THE BRAIN
│   ├── @anthropic-ai/claude-agent-sdk query()
│   ├── mounts ~/.claude/  (skills, plugins, CLAUDE.md)
│   ├── mounts .mcp.json    (Notion, Gmail, Calendar, Spotify, HubSpot, Clay...)
│   ├── custom in-process tools (the 9 from copilotTools.ts via createSdkMcpServer)
│   ├── tools: Read/Write/Edit/Bash/Glob/Grep/WebSearch/Monitor (Claude Code runtime)
│   ├── session persistence (resume + JSONL) for continuity
│   └── memory layer:
│       ├── ~/.pg-os/kitsu/personality.md   (evolving persona, read on init)
│       ├── ~/.pg-os/kitsu/decision-log.md  (what he did + PG's corrections)
│       └── Supabase agent_state            (durable cross-session knowledge of PG)
│   exposes: HTTP/SSE  POST /kitsu/query  (stream)
│
└── personal-os web app  <- THE FACE
    └── MarvisCorner / Cockpit tab  ->  streams to the local Kitsu daemon
        (replaces /api/copilot/chat with a thin proxy to the daemon)
```

## "Consciousness" = three layers of persistence
1. **SDK sessions** (built-in): resume conversation + context across reloads.
2. **Evolving persona** (Supabase + `personality.md`): the system prompt is not static. Kitsu logs
   decisions, PG approves/corrects, corrections write back to the persona store, loaded on next init.
   That is how the personality compounds.
3. **Memory files** (`decision-log.md`, knowledge of PG): read before each session, like CLAUDE.md.

## Permissions / autonomy (safe orchestration)
- `allowedTools`: the Claude Code core + the chosen `mcp__*__*` tools.
- `disallowedTools`: catastrophic bash (`rm -rf /`, `sudo:*`), and anything irreversible without a gate.
- `permissionMode`: dial per PG's comfort. Reads + safe actions auto-run; external/destructive/spend actions confirm.

## Migration path (build phases)
- **Phase 1:** scaffold `lib/kitsuAgent.ts` (the Agent SDK `query()` wrapper) + the local daemon entry,
  mount `.mcp.json` + the 9 custom tools via `createSdkMcpServer`, port `MARVIS_PERSONA` as the system prompt.
- **Phase 2:** replace `/api/copilot/chat` with a thin proxy to the daemon; adapt `useMarvis`/MarvisCorner to the new message types; test "list my sessions / what needs me."
- **Phase 3:** memory + evolving persona (Supabase + memory files + the correction feedback loop).
- **Phase 4:** orchestration + proactive presence (the `Monitor` tool on the live fleet, dispatch/monitor sessions + agents, proactive nudges). This is the full "genius orchestrator."

## Risks / decisions
- **R1 MCP location:** local stdio MCPs (Kitsu spawns them, same as Claude Code) vs remote HTTP/SSE. Local is simplest given the daemon runs on PG's Mac. DECISION needed.
- **R2 Autonomy level:** how much Kitsu acts unsupervised (permissionMode). DECISION needed.
- **R3 Session size / cost:** prune/archive long sessions; batch fleet reads; use Monitor (stream) not polling.
- **R4 Deployed app:** the local daemon serves local dev; the Vercel app reaches it only via a tunnel (existing cloudflared pattern) or Kitsu stays a local-first surface. DECISION: local-first is fine to start.

## Decisions for PG before Phase 1
1. Confirm: Kitsu = a **persistent local daemon** on the Mac (the only way to reach your real CC + MCPs + plugins).
2. **Autonomy:** start conservative (reads auto, all writes/external/spend confirm) and loosen later?
3. Green-light Phase 1 scaffold.
