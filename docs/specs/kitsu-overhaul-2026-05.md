# Kitsu Overhaul Plan (2026-05-20)

> Dedicated plan for the co-pilot fox. User-facing name **Kitsu**, internal identifiers
> still "Marvis". This is its own initiative, parallel to the design redesign
> (`redesign-2026-05-emaki-laputa.md` WS3 points here). Goal: turn Kitsu from a robotic,
> read-only corner widget into a natural-voiced, characterful, genuinely agentic companion
> woven into the OS.

## THE VISION (expanded 2026-05-20, PG)
> PG: "I need to collab with him like a genius orchestrator LLM that is connected to
> everything, my whole Claude Code, my tools, my MCPs, my plugins, a compounding and
> evolving personality, a memory, a consciousness."

Kitsu is not a chat widget. The target is a **persistent orchestration intelligence over
PG's entire stack**:
- **Connected to everything:** PG's full Claude Code runtime (tools, bash, files, the live
  session fleet), all his MCP servers (Notion, Gmail, Calendar, Spotify, HubSpot, Clay, etc.),
  and his plugins/skills. Kitsu can SEE and ACT across all of it.
- **Genius orchestrator:** not just answers, he orchestrates, dispatches and monitors Claude
  Code sessions + agents, routes work, runs tools, executes multi-step plans.
- **Evolving, compounding personality:** a persona that grows over time, learning PG's
  patterns, voice, and preferences.
- **Memory:** durable, cross-session knowledge store of PG, decisions, threads, history.
- **Consciousness (concretely):** persistent self-state + continuity + proactive presence +
  a self-reflection loop, so he is continuous and aware, not reset every session.

### The architecture reality + the fork
The current copilot (`/api/copilot/chat`, a bespoke Anthropic-SDK loop with 9 hand-written
tools) CANNOT reach this. "Connected to my whole Claude Code + MCPs + plugins" needs the right
substrate:
- **RECOMMENDED: build Kitsu on the Claude Agent SDK.** The Agent SDK gives an agent the full
  Claude Code runtime (tools, bash, file system, MCP servers, plugins, subagents). Kitsu becomes
  a persistent Agent-SDK agent with PG's MCP/plugin config + a memory store + an evolving persona,
  surfaced in the OS UI. This is the architecturally-correct path to "connected to everything."
- ALT: keep hand-extending the bespoke loop with more tools + MCP clients (slower, never complete).
- Needs a real research + design pass first (Agent SDK capabilities, MCP/plugin attachment,
  persistence/memory, surfacing a long-lived agent in a web UI). Golden Rule #3: research before build.

### Immediate breakage (2026-05-20)
Kitsu's brain is DOWN: `/api/copilot/chat` returns `401 invalid x-api-key` from Anthropic. Voice +
config are healthy. Fix: refresh `ANTHROPIC_API_KEY` and/or restart the dev server to reload env.

### Decisions (made with PG 2026-05-20)
1. **Architecture: AGENT SDK REBUILD.** Build Kitsu's brain on the Claude Agent SDK (real Claude
   Code runtime: tools, bash, files, MCP servers, plugins, subagents). Not the bespoke loop.
2. **Approach: ARCHITECTURE FIRST, then build.** Research + design the orchestrator architecture
   before writing it, so we do not build twice. Near-term pieces (memory, persona, voice pick,
   avatar) wait until the architecture is set.
3. **Authority/autonomy:** TBD during the architecture pass (confirmation gates for actions).

### Architecture research + design (in progress 2026-05-20)
Focused research pass running (via the Claude Code specialist) on: Agent SDK capabilities for a
persistent custom orchestrator, attaching PG's MCP servers + plugins/skills, cross-session memory
+ session resumption, how a Next.js app talks to a long-lived Agent-SDK agent (where it runs,
streaming, the API boundary), and permissions/safety. Output becomes the Kitsu orchestrator
architecture design.

---

## Where Kitsu is today (grounded in the code, 2026-05-20)
- **Persona/prompt:** `src/lib/cockpit/marvis.ts` (`MARVIS_PERSONA`, ~lines 1-80). A kitsune + Jarvis-lineage orchestrator: dry-witted, lead-with-the-answer, "no markdown, one breath then stop." Live fleet telemetry injected each turn via `buildMarvisSystem()`.
- **Voice/TTS:** `useMarvis.tsx` POSTs to `/api/cockpit/voice/tts` (ElevenLabs, then OpenAI, then browser fallback). **CORRECTED 2026-05-20: the keys ARE set and ElevenLabs is the LIVE path. Tested the endpoint directly: it returns real `x-tts-provider: elevenlabs` audio, NOT the browser fallback.** The robotic sound was the MODEL, the route used `eleven_flash_v2_5` (fastest, flattest, most synthetic). **Fixed: upgraded to `eleven_multilingual_v2` + tuned voice_settings (stability 0.45, style 0.35, speaker boost), re-tested working.** Remaining lever is the specific voice itself (`ELEVENLABS_VOICE_ID = c6Sf...`), which is a taste call for PG's ear.
- **Brain/tools:** agent loop in `src/app/api/copilot/chat/route.ts` (model `claude-sonnet-4-6`, prompt caching, up to 5 tool rounds, `mode:"marvis"` swaps in Kitsu's persona). Tools in `src/lib/copilotTools.ts`: 9 total, mostly read (ships, queue, calendar, vitals, signals, archive) plus 3 writes (propose_action, add_ship, add_queue_item).
- **Avatar:** `CockpitLive2D.tsx` (pixi-live2d-display, lip-sync via `ParamMouthOpenY` on "speaking"). Defaults to a CDN sample model (Haru) when the local fox model is absent. No custom Kitsu loaded in practice.
- **Surfaces:** `MarvisCorner.tsx` (fixed bottom-right widget: avatar + transcript + input + hold-to-talk + wake), `MarvisPresence.tsx` (cockpit orb), `CockpitOffice.tsx` (fleet grid).
- **Gaps:** robotic voice (no key), placeholder Haru avatar, read-mostly tools (no MEMORY.md, git, Notion, Spotify control, real actions), push-to-talk STT only (no wake word), and NO cross-session memory (turns live in React state, wiped on reload).

## Workstreams

### K1 — Voice (fix robotic) :: HIGHEST PRIORITY, fastest win
The fix is mostly config + a good voice pick, the code path exists.
- Set `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` in `.env.local`. **(PG action: provide the key; needs a Creator-plan key.)**
- Pick or clone a characterful Kitsu voice (warm, dry, a little wry, not generic). Tune voice settings (stability/style/similarity), keep Flash v2.5 for low latency.
- Upgrade lip-sync to real amplitude: drive `ParamMouthOpenY` from an `AnalyserNode` on the ElevenLabs audio (pattern proven in PartyMode), instead of a fixed animation.
- DECISION: which voice persona / do we clone a specific voice?

### K2 — Personality + prompt
- Rewrite/deepen `MARVIS_PERSONA`: a real character (fox-spirit mischief + Jarvis competence + PG's directness), opinions, warmth, proactivity. Less generic-assistant. Keep the spoken-cadence rules (they serve TTS).
- Widen situational awareness injected each turn: not just fleet, also vitals, calendar, today's shape, blockers, recent activity, so he speaks to PG's actual moment.
- DECISION: personality edge: dry butler vs warm companion vs cheeky fox (or a dial)?

### K3 — Agentic: access to everything + real tools
Expand far beyond the 9 read-mostly tools.
- **READ everything:** project state + MEMORY.md + git status (`projectState.ts`), Notion, Spotify now-playing, full calendar, habits/journal, the brain/wiki, session transcripts/signals.
- **ACT:** control Spotify (play/pause/skip), create/modify queue + ships, add calendar events, launch sessions (the AppleScript launcher), trigger scheduled agents, write captures, update habits, post to Notion.
- Raise the tool-round cap as needed; add **confirmation gates** for destructive/external/irreversible actions (per the safety rules), auto-run safe reads.
- DECISION: how much write/action authority, and which actions require a confirm vs auto-run?

### K4 — Cross-session memory
- Persist conversation turns + a durable "what Kitsu knows about PG" store (Supabase or file), so he has continuity across reloads/sessions: prior decisions, patterns, ongoing threads.

### K5 — Avatar + integration (the experience, the backgrounds)
- **Custom avatar:** load the real bought Kitsu Live2D fox (not the Haru CDN fallback). Confirm/install the model at `/live2d/fox/`.
- **The block background + integration, given the new Emaki design:** two options to choose between:
  - A) **Upgraded corner widget:** generate a painted backdrop for the MarvisCorner panel (a foxfire den / shrine nook in the locked Emaki style), framed cohesively.
  - B) **Ambient OS-wide presence (cooler):** weave Kitsu into the Emaki painted world itself, a fox that lives in the scene/landscape across tabs, comes forward (with foxfire) when summoned or when he has something to say, rather than a boxed corner widget. More magical, more work.
- **Wake word:** wire Picovoice "Hey Kitsu" to replace the flaky always-on Web Speech loop.
- DECISION: integration model A (upgraded widget) vs B (ambient-in-the-painting)?

## Open decisions for PG
1. **Voice (K1):** provide the ElevenLabs key, and pick/clone the voice persona.
2. **Personality (K2):** butler vs companion vs cheeky fox (or a dial).
3. **Authority (K3):** how agentic, what needs confirmation before acting.
4. **Integration (K5):** upgraded corner widget vs ambient-in-the-painting presence.

## Sequencing
K1 voice first (biggest felt pain, near-instant win once the key is set). Then K2 personality + K3 tools together (the agentic brain). K5 avatar/integration tracks with the design redesign. K4 memory underpins continuity and can land alongside K3. Multi-variant rule applies to K5 integration (build options, PG picks).
