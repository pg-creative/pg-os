# PG OS — /next-million Output (2026-04-27)

## Where we are right now

Phases 1-8 + Recursive Fox tracks A-D are shipped. The OS is a five-tab Next.js dashboard with a Ghibli/Laputa palette engine, file-backed OAuth, an Anthropic-streaming co-pilot panel (⌘J), brand-mode cycling (⌘⇧M), a self-improvement observatory pulling from Claude Code transcripts, and morning/evening RitualGates. The Supabase migration is queued but PG-blocked on the manual setup checklist.

## The next million things, organized by ambition tier

### Tier 1: Obvious next moves

1. Finish Supabase Track A tail — apply migration, set env vars, ship to Vercel, point os.pgsmith.com.
2. Migrate `~/.pg-os/ships.db` and `~/.pg-os/queue/*.md` content into Supabase tables on first deploy.
3. Add Whoop, Spotify, Calendar webhooks/cron sync so data is fresh without opening the tab.
4. Real auth migration: replace shared-secret cookie with WebAuthn passkey on os.pgsmith.com.
5. Push notifications wired end-to-end (table exists) — RitualGate misses, queue items aging > 24h, calendar events.
6. Service Worker + offline cache so the OS opens instantly on the phone even on the subway.
7. Per-mode filter persistence in Supabase (currently localStorage) so brand mode follows you across devices.
8. Tighten the Claude tab Skills view — surface skills used vs. dormant from `~/.claude/skills/INDEX.md`.
9. Add a `/dev/design-lab` route inside the OS itself for live variant testing of any view.
10. Daily auto-screenshot of every tab → posted to a private Notion log so design drift is visible week-over-week.

### Tier 2: Stretch but plausible

1. **Federated query bar (⌘K)** — single search across Notion, Gmail, Calendar, Claude transcripts, ship log, queue, journal. Fuzzy + semantic. Result types color-coded by source.
2. **Co-pilot tool fleet doubles to 30+** — git push/pull, Notion CRUD, Gmail draft, Calendar create, Spotify queue, ship-log mutation, and a `run_skill(name, args)` meta-tool that dispatches any local skill.
3. **Live agent runs surfaced in Claude tab** — the existing `agent_runs` table gets a streaming feed view: what's running now, what just finished, what each one cost.
4. **Recursive Fox tracks E/F/G** — E: trust-categories visual ladder (auto-promote when category hits N successful runs). F: proposal browser with diff view + one-click apply. G: ship velocity → mood gauge that reshades the whole UI.
5. **Time-blocking overlay on the Flow tab** — drag calendar events to assign a deep-work block; OS dims notifications and silences Slack.
6. **The morning ritual writes itself** — co-pilot reads yesterday's ships, today's calendar, current Whoop recovery, and drafts a 3-priority plan for PG to approve in 30 seconds.
7. **Voice everywhere, not just Capture** — ⌘' opens an ambient mic that transcribes + intent-routes (ship/queue/note/journal/email-draft).
8. **Inbox triage view inside the OS** — Gmail MCP feeds a Kanban-style triage (reply/defer/archive/delegate) with co-pilot drafting replies in PG's voice.
9. **Brand mode → published surface** — the same OS in `voyager` mode is a Voyager game-tracker. In `writer` mode it's a drafting cockpit. In `alchmy` mode it's a client-portal preview. Same chassis, different soul.
10. **Habit→ship causal graph** — visualize which morning rituals correlate with high-velocity ship days. Whoop recovery × ritual completion × ships shipped.
11. **OS-as-theme-engine** — every tab's typography/spacing/animations driven by a single `os.theme.json` PG can mutate live.
12. **Phone-native shell** — a separate React Native (or Expo) wrapper that shares the same Supabase backend so the phone stops being a tunnel-fragile fallback.
13. **Cowork bridge** — Cowork sessions write directly to OS proposals_log via API rather than markdown export. PG reviews proposals from any device.
14. **Replay mode** — scrub through any past day: ships, calendar, mode at the time, Whoop recovery, ritual completions, capture entries. Time-machine for self.
15. **Persistent dock widget on macOS** — a small native menu-bar app that mirrors current Whoop recovery, queue depth, and ship-streak. Click to deep-link into the right tab.

### Tier 3: Audacious

1. **Voyager game-tracker spawned from PG OS shell** — fork the chassis. Steam/PSN/Xbox/Nintendo OAuth, screenshot ingestion, journal entries auto-tagged by game, brand-mode locked to Voyager. Public alpha for the Voyager community before it ships as its own product.
2. **Alchmy client portal as PG OS sub-app** — every Alchmy retainer gets a personalized portal at `client.alchmy.studio/<slug>` running the same chassis. Their queue, their ships, their proposals_log. PG sees them aggregated in his OS.
3. **Writer drafting cockpit** — distraction-free triple-pane (outline / draft / research). Same Capture FAB feeds drafts. Co-pilot is fine-tuned on PG's literary voice. Saves to a `manuscripts` Supabase table with version history.
4. **Hero's Chronicle gameplay loop inside PG OS** — the OS literally is the meta-layer. Habits → XP → unlocks → quest acceptance writes back into the OS queue. Real-life gamification that runs on real ship data, not pretend stats.
5. **Autonomous overnight agent fleet** — between PG's sessions, agents run: enrich brief, prune stale queue items, propose ship-log corrections, generate a morning briefing, draft 3 LinkedIn hook options for tomorrow, summarize Claude Code transcripts. PG wakes to a proposals review, not an empty inbox.
6. **PG OS as a productized stack** — packageable as "Operator OS" for indie founders. Bring-your-own Anthropic key, plug your own data sources, get the brand-mode chassis. Tiered pricing matching Alchmy ($2,995 setup / $99 monthly).
7. **Embodied UI: visionOS spatial dashboard** — ships float as cards in your room. Brand mode tints the whole space. Capture FAB is a pinch gesture. Whoop recovery throbs on the wall.
8. **Apple Watch complication suite** — current ritual state (○ ◐ ● ★), Whoop recovery delta, queue depth, ship streak — all glanceable on the wrist.
9. **Ambient screen mode for the home office** — a dedicated iPad on the desk runs an ultra-minimal version: time-of-day Laputa palette, current ritual, deep-work timer, now-playing. No interaction; pure ambient signal.
10. **OS-narrated daily story** — every evening, the co-pilot generates a 200-word literary recap of the day in Writer voice. Stored in journal, optionally posted as a private Substack.
11. **Multiplayer mode** — invite a collaborator into a brand mode. Voyager mode opens to your editor's queue too. Alchmy mode opens to a co-pilot teammate. Same OS, scoped by mode.
12. **Real-time decision-tree visualization** — when PG triggers a council/research/plan-tree, the OS renders the agent fan-out as a live D2 diagram. Watch your own thinking branch.
13. **Personal RAG over the whole vault** — semantic search across CEREBRUM (~7GB) with citations. Co-pilot grounds every answer in PG's own writing. The vault becomes an oracle, not an archive.
14. **Hardware integration: Stream Deck + Loupedeck** — physical buttons mapped to brand-mode swap, ritual checkoff, capture trigger, Spotify control. The OS extends off-screen.
15. **Auto-published "PG OS public" page** — at `pgsmith.com/today` — current mode, recent ships (filtered to public-safe), now-playing, current book. A living "homepage" that updates without effort.
16. **Ghibli weather engine** — actual weather + Whoop strain + brand mode → animated background (rain in Twilight, snow in Midnight on Recovery, golden particles in Day on Alchmy mode). Effects ALWAYS tied to data.
17. **Council-as-a-tab** — a permanent Council view where PG can pose any question and see N personas (Stoic/Strategist/Skeptic/Friend) answer in parallel. Persists every council to decisions_log.
18. **Goal pyramid view** — polaris.md auto-renders as a quarter-goal pyramid with each ship contributing or not. Misalignment shows up red. The OS becomes a self-policing OKR tool.
19. **Email digest mode for non-Claude Code time** — a daily 6am email "PG OS Brief" with everything Tier 1's morning ritual surfaces, so the OS works even when the laptop's closed.
20. **Generative micro-rituals** — based on Whoop recovery + day-of-week + last-7-days ship velocity, propose a custom morning ritual (e.g., low recovery → swap "deep work" for "1 hour walk"). PG approves, OS adapts.

### Tier 4: Generational

1. **The OS becomes the Hero's Chronicle backend.** Hero's Chronicle ships as a public RPG layer over PG OS itself: any user installs PG OS, plugs in their own data sources, and HC turns their real life into the game. Two products, one substrate. The MVP demo is PG playing his own game live every morning.

2. **PG OS as the seed crystal for "Brand-aware operating systems."** A new category: dashboards that don't just track work, but inhabit a brand identity. Voyager-OS, Alchmy-OS, Writer-OS, Metrasens-OS — each is the same chassis, sold by Alchmy as the productized output of "we'll build you an OS in your brand voice." The OS is the deliverable. Pricing tier sits above $4,995.

3. **Autonomous personal economy.** The agent fleet doesn't just propose actions — it executes commerce: drafts and sends client invoices on ship, books cars when calendar density spikes, reorders supplements when Whoop deficits appear, posts content from approved drafts on schedule. PG approves once, OS handles the rest. Net effect: PG operates a one-person company at the throughput of a five-person team.

4. **The OS as research instrument.** Every PG OS install is a longitudinal self-experiment. Anonymized cohort data (with consent) feeds a public dashboard: "what rituals correlate with ship velocity," "does Whoop recovery predict creative output," "which brand modes outperform on which days." A public research project that PG's own use of the OS funds. Could become a book, a thesis, a YC pitch.

5. **The OS speaks back as a character.** Voice + brand mode + co-pilot = an actual companion. Voyager mode speaks like a sage cartographer. Alchmy mode speaks like a brilliant strategist. Writer mode speaks like a kind editor. Recovery mode speaks gently. Each mode has a fully realized voice with actor-quality TTS. The OS becomes a distinct *presence* — five companions for five chapters of one life.

### Tier 5: The single biggest possibility

**PG OS becomes the prototype for "Personal Cognitive Sovereignty" — a category nobody owns yet.**

Every system PG touches today (Notion, Gmail, Spotify, Whoop, Anthropic, GitHub, Supabase) is owned by someone else. They store the data, they shape the interface, they decide what's surfaced. PG OS inverts this: PG owns the substrate (Supabase he controls, an LLM key he controls, encrypted tokens he controls), and every external system becomes a *peripheral* feeding the substrate. The OS is the cortex; everything else is sensory.

Productized, this is the most defensible AI-era pitch possible: "you don't need a thousand AI tools. You need one OS where your data lives, your agent works, and your identity is layered. Bring your own keys, own your own substrate, run your own brain." It's the anti-SaaS thesis applied to personal productivity. It's what Roam Research wanted to be, what Notion is too sprawling to be, what Apple won't ship because they're a hardware company. It's the infrastructure layer beneath the entire post-LLM personal-software movement.

Distribution path: PG ships PG OS publicly under Alchmy as a $99/month "Operator OS" with a free self-host tier. Open the chassis, keep the brand-mode engine + agent fleet + Anthropic-tuning as the moat. Document everything PG learns running it on himself for a year as the world's most credible case study. Recruit five other indie operators (one per niche: founder, writer, designer, coach, gamer) to run their own instance, publish their cohort findings. Eighteen months in, you've created a category, you have a thousand paying customers each running their own brain on your chassis, and PG's personal OS is the canonical example. The endgame: PG OS isn't a product, it's an *interface paradigm* — the way people stop renting their cognition and start owning it.

The kicker: every other tier above is justified by this one. The brand modes, the agent fleet, the Hero's Chronicle integration, the council-as-a-tab, the Ghibli weather engine — none of it is decorative. It's all proof that one person, with one stack, can build a system *richer than what venture-backed teams ship*. The OS itself is the marketing. The OS itself is the moat.

## Cross-cutting themes

1. **Everything trends toward proactive, not reactive.** The OS today still mostly waits for PG to open a tab. The endgame is the OS opening conversations: "your Whoop dropped 12 points and you have a 9am call — propose moving it?" "you've shipped 0 today and it's 4pm — pick from these 3 quick wins?"

2. **The OS becomes the agent harness.** Right now agents live in `~/.claude` and write proposals. Future state: agents are first-class OS citizens with budgets, schedules, observable runs, trust ladders, and approval flows. The OS is mission control for a fleet PG never sees the source of.

3. **Data sovereignty becomes the moat.** Every Tier 3+ idea hinges on PG owning the substrate. The pitch isn't "better dashboard," it's "you own the brain." Encrypt-by-default, bring-your-own-keys, self-host-able, exportable.

4. **Brand mode is the unit of personalization.** Not theme. Not skin. Brand mode rewires which data is surfaced, which voice the co-pilot uses, which integrations are active, which color/typography is rendered. One OS, five lives. This is the architectural insight that scales.

5. **The OS earns its decoration.** Every effect ties to real data (lesson from `feedback-foundation-before-flash.md`). Ghibli weather isn't decorative — it visualizes Whoop strain. Animations aren't polish — they signal mode shift. The aesthetic is the information layer, not on top of it.

## What to NOT do

1. **Don't ship Tier 4-5 ideas before the Supabase tail closes.** Every audacious feature compounds on the substrate. Build on a fragile foundation and the whole tower wobbles. Finish Track A. THEN climb.

2. **Don't productize before the personal use case is undeniable.** PG OS becomes "Operator OS" only after PG has run it on himself for 90+ days and can ship a case study with real numbers (ship velocity delta, ritual adherence, recovery improvement). Selling a personal OS PG himself doesn't depend on is the most expensive failure mode.

3. **Don't add brand modes faster than the chassis can support them.** Each new mode (game-tracker, client-portal, drafting cockpit) is a real product surface area. Ship one to public quality before starting the next. Spawning all three simultaneously is how the OS becomes five mediocre apps instead of one extraordinary one.
