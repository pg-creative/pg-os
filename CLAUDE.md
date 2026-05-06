# Personal OS

> Sub-project of [CEREBRUM](../CLAUDE.md). Personal operating system dashboard — PG's daily command center.

## What This Is
A Next.js 15 + React 19 + Tailwind v4 personal dashboard running at `http://127.0.0.1:3030`. Ghibli anime cel-shaded aesthetic with three Laputa time-responsive palettes (Day / Twilight / Midnight). Five tabs (Home / Habits / Projects / Flow / Claude) + floating Capture FAB with voice. File-backed OAuth tokens. Wired to Hero's Chronicle Supabase for habits/journal. Claude tab aggregates self-improvement signals from Claude Code transcripts, Cowork exports, and the web chat archive (FTS5).

Kickoff: 2026-04-21. **Production: https://pg-os.vercel.app** (stable, no auth gate). Dev: `http://127.0.0.1:3030` for surfaces that need filesystem (AppleScript launcher, fs.watch SSE, live Claude session tails).

## Current Status
**PWA + Production Deploy shipped (2026-05-06).** PG OS deployed to Vercel at `pg-os.vercel.app` — auth gate (`PGOS_SHARED_SECRET`) removed entirely for personal-tool ergonomics; cloudflared tunnel retired. PWA installable on iPhone Home Screen with V2 Midnight Ember icon (cream/gold serif PG on midnight bg, full-bleed 180/192/512). Mobile bottom thumb bar shipped (top tabbar kept on desktop, responsive at 768px); tabs converted from `<button>` to `<a href="?tab=...">` anchors so navigation survives iOS hydration failure. Bridge BrickBuilder rebuilt as V1 Donkey Kong Construction (Mario w/ hammer + NES brick stack + Press Start 2P). `/evening` rebuilt as EV2 RPG Status Panel (mission-report header, hex tier badge, jewel-tone stats, MISSION COMPLETE finale). 4 design labs preserved at `/dev/{icon,pomodoro,evening,mobile-nav}-lab/` as live archive of variant picks. iOS hardening: hardcoded RGBA (no `color-mix(oklab)`), `touch-action: manipulation`, no `backdrop-filter`, z-index 9999, pre-hydration palette resolution script. Middleware gains `?skip-evening=1` + `?skip-briefing=1` escape hatches; sameSite changed strict→lax for cross-origin compat.

**Projects drill-in shipped (2026-05-02).** Master grid cards link into `/projects/[id]` route showing current state, blockers, action items, roadmap, spec docs, recent commits. Realtime via fs.watch on `.git/logs/HEAD`, `.git/index`, and project MEMORY.md files, debounced 250ms through SSE at `/api/projects/events`. Both grid and detail page update without reload — committing in another terminal updates the open dashboard inside ~1.5s. URL-synced tab state (`?tab=…` deep links + browser back/forward). Next 16 `allowedDevOrigins` config added so 127.0.0.1 hydrates correctly. Projects view writes BLOCKERS / ACTION ITEMS / ROADMAP from MEMORY.md headers — populate per-project memory to fill the columns.

**Activity Stream shipped (2026-04-29).** PG OS now canonical surface for all agent activity (replacing Notion over time). Migration 006 added agent_runs.summary/body_md/notion_url/model/brief_date + queue_items.run_id FK + telegram_events table. Claude tab gets ACTIVITY sub-section: clickable timeline joining agent_runs ⨯ queue_items ⨯ decisions_log ⨯ telegram_events with inline expand. Runners wire in via `agent-runner.sh` `notify_pgos_run` (auto for `run_agent` users; manual for the 3 bespoke ones: morning-briefing, session-review, enrich-review).

**Phases 1-8 + Recursive Fox tracks A/B/C/D shipped (2026-04-27).** Tab shell, OAuth hardening, mobile-first CSS, Flow tab, Projects tab, Habits wired to HC Supabase, Capture FAB, Home mode, accessibility audit. Phase 8 = Claude tab (self-improvement observatory). **Recursive Fox** then layered on:
- **Track A (foundation):** Supabase backend + dedicated PG OS project, encrypted tokenStore, queueStore mirror (filesystem still source of truth for Claude Code's queue rule), claudeStore mirror to proposals_log + decisions_log, single-user middleware + unlock page, sqlite fallback when env not set.
- **Track B (AI co-pilot):** ⌘J slide-in panel, Anthropic streaming with prompt caching, 9 tools (read_ships/queue/calendar/vitals/signals/archive + propose_action/add_ship/add_queue_item).
- **Track C (brand modes):** ⌘⇧M cycles alchmy/voyager/writer/metrasens/recovery; per-mode filters + accent override.
- **Track D (rituals):** Morning + Evening RitualGate above habits; localStorage now, Supabase migration markers in place.

**Track A SHIPPED** — Vercel deploy live at `pg-os.vercel.app`, all 26 env vars synced, Supabase mirror operational. The `os.pgsmith.com` custom domain step still pending (DNS + OAuth redirect URI additions on Google/Spotify/Whoop dashboards) — until then prod URL is `pg-os.vercel.app`.

## Stack
- **Framework:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4 (via `@import "tailwindcss"`)
- **Package manager:** pnpm
- **Runtime:** Node 22+ (uses `node:sqlite` for fallback)
- **Cloud state (when configured):** Dedicated PG OS Supabase project — `ships`, `queue_items`, `oauth_tokens` (encrypted), `proposals_log`, `decisions_log`, `trust_categories`, `agent_runs`, `push_subscriptions`, `mode_state`. Uses `PGOS_SUPABASE_SERVICE_ROLE_KEY` server-side. RLS off (single-user, gated by middleware).
- **Local state (always present, source of truth for some):**
  - `~/.pg-os/queue/*.md` — Claude Code's queue-write rule writes here; mirrored to Supabase on next OS read
  - `~/.claude/self-improvement/data/*.json` — agents write here; mirrored to proposals_log + trust_categories on PG action
  - `~/.pg-os/ships.db` — sqlite fallback if Supabase env not set
  - `~/.pg-os/tokens.json` — token fallback if Supabase env not set
- **Remote state (HC):** `ystqevehdgoonhpjmgis.supabase.co` continues to host habits + journal only. PG OS does NOT migrate this.
- **OAuth:** Google Calendar, Spotify, Whoop — redirect URIs are env-driven. Local: `127.0.0.1:3030`. Production: `os.pgsmith.com` (or whatever domain). Each OAuth provider can have BOTH registered.
- **Auth (deployed):** Single-user shared-secret cookie via `src/middleware.ts`. Visit `?key=<PGOS_SHARED_SECRET>` once per device, cookie persists 90d. Dev mode (no env) is unblocked.
- **Encryption:** OAuth access/refresh tokens are AES-256-GCM encrypted with `TOKEN_ENC_KEY` (32 bytes base64) before Supabase write.
- **AI co-pilot:** `@anthropic-ai/sdk` streaming with prompt caching. Uses `ANTHROPIC_API_KEY`. Default model: `claude-sonnet-4-6`.
- **Design tokens:** CSS custom properties per Laputa variant, `data-variant` on `<html>` driven by `ModeProvider`. Brand mode is a parallel `data-brand` attribute that overrides `--accent-2` only.

## Key Files
```
src/app/
├── layout.tsx                 ← ModeProvider + TabProvider
├── page.tsx                   ← Topbar + TabBar + active view routing
├── globals.css                ← ~2150 lines: theme tokens, layout, views, a11y foundation, Tier 1 polish, Claude view styles
├── _components/
│   ├── ModeProvider.tsx       ← Laputa Day/Twilight/Midnight auto-switch
│   ├── useActiveTab.tsx       ← tab state + view transitions
│   ├── TabBar.tsx             ← tablist/tab ARIA + arrow keys
│   ├── CaptureFAB.tsx         ← magnetic-attract button; ⌘⇧K shortcut
│   ├── CaptureSheet.tsx       ← modal w/ focus trap + voice + 6 destinations
│   ├── useVoiceCapture.tsx    ← Web Speech API wrapper
│   ├── HomeModeToggle.tsx     ← home mode on/off pill
│   ├── LocationLive.tsx       ← Geolocation + reverse geocode + weather
│   └── views/                 ← HomeView, HabitsView, ProjectsView, FlowView, ClaudeView
│       └── claude/            ← Overview, Proposals, Trust, Agents, Signals, Skills, Archive
├── projects/[id]/page.tsx     ← Project drill-in (hero + sections + commits)
├── api/
│   ├── auth/{google,spotify,whoop}/{route,callback} ← OAuth flows
│   ├── calendar/events        ← Google Calendar events
│   ├── spotify/now-playing    ← Spotify current track
│   ├── spotify/command        ← play/pause/next/prev
│   ├── vitals/whoop           ← Whoop recovery + sleep
│   ├── ships                  ← ship log GET + POST
│   ├── queue                  ← approval queue GET/POST/DELETE
│   ├── projects               ← project state (git + memory + queue)
│   ├── projects/[id]          ← per-project detail (sections + commits + branches)
│   ├── projects/events        ← SSE channel; fs.watch on .git/logs/HEAD per project
│   ├── launch                 ← AppleScript → Ghostty launcher
│   ├── capture                ← route capture to ship/queue/essay/linkedin/yuriko/hc-journal
│   ├── habits                 ← HC habits + journal read/write
│   ├── status                 ← OAuth connection diagnostics
│   └── claude/                ← Claude tab data — overview, proposals, trust, signals,
│                                 agents, skills, archive (FTS5), run-agent
└── lib/
    ├── session.ts             ← iron-session helper (legacy, mostly unused now)
    ├── tokenStore.ts          ← file-backed token store (~/.pg-os/tokens.json)
    ├── google.ts              ← Google OAuth + calendar client
    ├── spotify.ts             ← Spotify OAuth + now-playing + commands
    ├── whoop.ts               ← Whoop OAuth + vitals
    ├── shipLog.ts             ← node:sqlite ship log + streak + velocity
    ├── queueStore.ts          ← markdown frontmatter parser for queue
    ├── projectState.ts        ← git + MEMORY.md + queue per-project
    ├── launcher.ts            ← AppleScript to Ghostty via System Events
    ├── projects.ts            ← canonical list of active projects (incl. claude-config)
    ├── capture.ts             ← capture destination router
    ├── habits.ts              ← HC Supabase reads/writes
    ├── hcSupabase.ts          ← HC service-role client
    ├── claudeStore.ts         ← self-improvement file reader (proposals, trust, findings, stats)
    ├── agentHealth.ts         ← parses review-log.md for agent last-run + status
    └── claudeArchive.ts       ← node:sqlite read of claude-web-history archive.db
```

## Cowork Signal Bridge
`scripts/export-cowork-signals.py` — manual-run Python parser. Reads markdown exports from `~/.pg-os/claude/cowork-exports/` and writes signals to `~/.pg-os/claude/cowork-signals.jsonl` using the same correction/confirmation patterns as the Claude Code transcript parser. The Claude tab merges these into the 7-day window.

## Env Vars (.env.local — gitignored)
Required:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`
- `WHOOP_CLIENT_ID`, `WHOOP_CLIENT_SECRET`, `WHOOP_REDIRECT_URI`
- `SESSION_PASSWORD` (legacy iron-session; still needed for logout route)

Optional but unlocks Habits:
- `HC_SUPABASE_URL` (prepopulated with HC's URL)
- `HC_SUPABASE_SERVICE_ROLE_KEY` — grab from https://supabase.com/dashboard/project/ystqevehdgoonhpjmgis/settings/api

## Design System
- **Aesthetic locked:** Ghibli cel-shaded + golden hour + JRPG accents. No decorative shader layers. Effects must be tied to real data/meaning (lesson from 2026-04-24 — see `feedback-foundation-before-flash.md`).
- **Three Laputa palettes** auto-switch by hour: 6am–6pm Day (powder blue + coral), 6–9pm Twilight (deep blue + amber), 9pm–6am Midnight (ink + golden embers).
- **Accessibility:** WCAG AA muted contrast (4.5:1), 11px font floor, `:focus-visible` global ring, `prefers-reduced-motion` handler, tablist/tab ARIA pattern, focus trap on modal, 44px mobile touch targets, h1 on view titles, streak glyph prefix (○ ◐ ● ★) as non-color tier signal.
- **Tier 1 polish (universal):** native View Transitions on tab swap, spring-physics card hover, magnetic FAB, stagger reveal on grids. No tier-2-to-5 decoration in the tree.

## Running
```bash
cd ~/CEREBRUM/personal-os
pnpm dev                                          # starts at :3030
cloudflared tunnel --url http://127.0.0.1:3030   # public URL for phone
```

## Phone Access
`cloudflared tunnel --url http://127.0.0.1:3030` gives a random `*.trycloudflare.com` URL per session. Works as long as Mac is awake. OAuth sign-in does NOT work from the tunnel URL (redirect URIs are `127.0.0.1:3030`); sign in on desktop first, tokens then usable from anywhere.

For a real Vercel deploy: needs migration of `~/.pg-os/ships.db`, `~/.pg-os/tokens.json`, `~/.pg-os/queue/*.md` to Supabase tables. Deferred as a proper follow-up.

## Agent Scope
Tiny project. No strict agent-scope warnings yet. Just skip `node_modules/`, `.next/`, `docs/screenshots/`.
