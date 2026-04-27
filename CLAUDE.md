# Personal OS

> Sub-project of [CEREBRUM](../CLAUDE.md). Personal operating system dashboard — PG's daily command center.

## What This Is
A Next.js 15 + React 19 + Tailwind v4 personal dashboard running at `http://127.0.0.1:3030`. Ghibli anime cel-shaded aesthetic with three Laputa time-responsive palettes (Day / Twilight / Midnight). Five tabs (Home / Habits / Projects / Flow / Claude) + floating Capture FAB with voice. File-backed OAuth tokens. Wired to Hero's Chronicle Supabase for habits/journal. Claude tab aggregates self-improvement signals from Claude Code transcripts, Cowork exports, and the web chat archive (FTS5).

Kickoff: 2026-04-21. Current live URL (cloudflared tunnel): `https://shorts-visible-overhead-broadband.trycloudflare.com` (per-session; reset on Mac sleep).

## Current Status
**Phases 1-8 shipped (2026-04-27).** Tab shell, OAuth hardening, location sync, mobile-first CSS, Flow tab (ships + approval queue), Projects tab + Ghostty launchers, Habits wired to HC Supabase, Capture FAB + voice, Home mode toggle, full accessibility audit implementation. **Phase 8 (Claude tab):** 3-source self-improvement observatory — overview / proposals / trust state / agent health / signals / skills+rules / archive search. Approve+dismiss writes back to `~/.claude/self-improvement/data/`. Run-agent launches Ghostty. See `docs/specs/os-blueprint.md` for the v1.1 blueprint and phase mapping.

## Stack
- **Framework:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4 (via `@import "tailwindcss"`)
- **Package manager:** pnpm
- **Runtime:** Node 22+ (uses `node:sqlite`)
- **Local state:**
  - `~/.pg-os/tokens.json` — OAuth refresh/access tokens (file-backed, 0600, atomic writes)
  - `~/.pg-os/ships.db` — node:sqlite ship log
  - `~/.pg-os/queue/*.md` — approval queue markdown files (Claude Code writes these per `~/.claude/CLAUDE.md` rule)
- **Remote state:** Hero's Chronicle Supabase (`ystqevehdgoonhpjmgis.supabase.co`) for habits + journal. Uses `HC_SUPABASE_SERVICE_ROLE_KEY` server-side, bypasses RLS (single-user app).
- **OAuth:** Google Calendar, Spotify, Whoop — all redirect to `127.0.0.1:3030`. Do not change.
- **Design tokens:** CSS custom properties per Laputa variant, `data-variant` on `<html>` driven by `ModeProvider` (auto-switches by clock hour).

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
├── api/
│   ├── auth/{google,spotify,whoop}/{route,callback} ← OAuth flows
│   ├── calendar/events        ← Google Calendar events
│   ├── spotify/now-playing    ← Spotify current track
│   ├── spotify/command        ← play/pause/next/prev
│   ├── vitals/whoop           ← Whoop recovery + sleep
│   ├── ships                  ← ship log GET + POST
│   ├── queue                  ← approval queue GET/POST/DELETE
│   ├── projects               ← project state (git + memory + queue)
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
