# Cockpit + Marvis(fox) — Handoff & Plan (2026-05-20)

> Continue on git branch **`worktree-cockpit`** (worktree at
> `~/CEREBRUM/personal-os/.claude/worktrees/cockpit`). Many commits already landed.
> Dev: `pnpm dev` (or `pnpm exec next dev -p 3031` for the worktree). Daemon:
> `node scripts/cockpit-daemon.mjs`. Cockpit tab: `/?tab=cockpit`.

## What's BUILT + working
- **Cockpit tab** (`CockpitView`) — live session grid joining telemetry (`~/.pg-os/sessions/*.json` via `cockpitTelemetry.ts`) + activity (`/api/sessions`) + daemon controllable list. `/api/cockpit/telemetry`, `/api/cockpit/daemon`.
- **Two-way control** — `scripts/cockpit-daemon.mjs` (node-pty + ws + tmux, 127.0.0.1 + token at `~/.pg-os/cockpit-token`). Spawns `claude --session-id <uuid>` in tmux; xterm.js `CockpitTerminal`. **Smoke-tested working.** Patterns from Ark0N/Codeman (MIT, cloned in `$CLAUDE_JOB_DIR`).
- **Marvis = fox (Live2D)** — `MarvisCorner` chat widget (fox avatar + transcript + input + mic/wake), `CockpitLive2D` (Cubism4 via pixi-live2d-display; loadCubismCore race fixed). Fox model at `public/live2d/fox/standard_fox.model3.json` (bought on booth, $16 export data).
- **Voice loop LIVE** — `useMarvis`: Web Speech STT + "Hey Marvis" wake-word + `/api/copilot/chat?mode=marvis` (reuses Copilot agent + tools; persona in `lib/cockpit/marvis.ts`) + `/api/cockpit/voice/tts`. **ElevenLabs Starter plan active → real fox voice works** (voice id `c6SfcYrb2t09NHXiT80T`). Graceful fallback ElevenLabs→OpenAI→WebSpeech. Single-voice guard added.
- **Party mode** 🎉 — "initialize party mode" → confetti + strobe + disco in a retro-2009-YouTube frame (`PartyMode.tsx`, video id `i2FW1WJc0lg`).
- **PixelLab pipeline** — `scripts/run-pixellab-batch.py` (pixflux + animate-with-text). 14 animated Marvis concept sprites at `public/agent-office/pixel/` (`/dev/marvis` picker). Agent class sprites NOT yet generated.
- **Labs**: `/dev/marvis` (pixel concepts), `/dev/orb` (Paper shader orbs), `/dev/live2d` (Live2D demo), `/dev/agent-office-lab` (section variants), `/presence-lab.html`, `/marvis-directions.html`.

## Env / keys (in `~/CEREBRUM/personal-os/.env.local`, gitignored; worktree `.env.local` symlinked to it)
`ELEVENLABS_API_KEY` (Starter plan) · `ELEVENLABS_VOICE_ID=c6SfcYrb2t09NHXiT80T` · `DEEPGRAM_API_KEY` ✓ · `PIXELLAB_API_KEY` ✓ · `ANTHROPIC_API_KEY` ✓ · **Picovoice = pending account approval** (interim Web-Speech wake-word works). `LEGNEXT_API_KEY` in shell env (MJ, ~30k credits).

## PLAN (next session — ranked)
1. **🔴 FIX the Marvis panel (usability + fox head cropped).** The fox's head/ears are clipped in `MarvisCorner` (CockpitLive2D `zoom`/`align="top"` + container height crop too tight). Re-tune zoom (~1.4–1.6) + container height so the *whole head* shows; verify the input + buttons are fully on-screen + reachable. General usability pass on the chat widget (sizing, scroll, focus).
2. **Pick + apply the NAME** (kitsune brainstorm: Inari / Kuda / Zenko / Tamamo / Kon / Kitsunebi / Kitsu). Rename "Marvis" across `marvis.ts` persona, `MarvisCorner`, wake-word in `useMarvis`, copy.
3. **Pixel-lab the AGENTS** — add agent class prompts (scribe/ranger/smith/sage/wayfarer, or PG brand personas) to `run-pixellab-batch.py`, generate + animate, wire sessions-as-pixel-characters into the cockpit office (the `CockpitOffice` component exists as a start).
4. **Interactive responsive backgrounds** for the Marvis panel + cockpit — kitsune-themed (foxfire embers, torii, paper, golden-hour). Reactive to state/fleet. (Use `design-lab` skill; consider Paper Shaders already installed.)
5. **Kitsune / Nioh samurai + kodama aesthetic, SECTION-BY-SECTION across personal-os** — design-lab program: each tab (home/habits/projects/flow/timeline/claude/cockpit/stack/brain) gets the theme. Build live variants, PG picks per section.
6. **Lip-sync the fox to REAL audio** — drive `ParamMouthOpenY` from the ElevenLabs audio amplitude (Web Audio AnalyserNode) instead of the current sine-on-speaking.
7. **Picovoice wake-word** when the account clears (config detection already in place).

## Conventions
design-lab + playwright-verify + humanizer skills. Conventional commits. Cross-domain seam = filesystem (`~/.pg-os/`), never import `~/.claude` into the app. Marvis backend confirmed answering; UI is the work.
