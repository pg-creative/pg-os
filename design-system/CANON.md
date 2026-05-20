# PG OS — Design Canon

> **This is a compass, not a cage.** It records what the code *actually does* and
> where to make taste decisions — it does **not** mandate one fixed look. The
> aesthetic is allowed to evolve (a Japanese-direction bake-off is underway at
> `/dev/aesthetic-lab`). Replaces the prescriptive `DESIGN-SYSTEM.md v0.1`
> (archived 2026-05-20 in `_archive/` — it dictated a single "warm dark Ghibli"
> look that fought the projects it was meant to serve).

## The three layers

1. **Process / taste (portable, project-agnostic)** → `~/.claude/rules/design-anti-generic.md`.
   How to decide — build a falsifier, type does real work, max 2 accents, motion
   restraint, em-dash ×2, value-forward voice. Travels across every PG project.
   Plus `~/.claude/rules/visual-style.md` for the *image-generation* DNA + Midjourney/DALL·E formulas.
2. **Descriptive truth (this doc)** — what's actually in the code right now. Facts, not mandates.
3. **Per-direction lock (when chosen)** — once a bake-off direction is picked, it
   gets a focused `~/.claude/research/pgos-aesthetic-lock-YYYY-MM.md` (like the
   wayfarer/alchmy locks). Scoped to PG OS; never imposed on other projects.

---

## Descriptive truth — what the code does today (2026-05-20)

**Theme architecture.** All theming is CSS custom properties on `<html data-variant="…">`,
defined in `src/app/globals.css` (~11k lines). `ModeProvider.tsx` sets `data-variant`
by hour. A parallel `data-brand` attribute overrides `--accent-2` only.

**Variants (6).** Primary, time-responsive: `laputa-day` (light powder-blue, 6am–6pm),
`laputa-twilight` (deep blue/amber, 6–9pm), `laputa-midnight` (ink/gold-ember, 9pm–6am).
Alts: `howls`, `totoro`, `mononoke` (warm-dark). Each defines `--bg-0/1/2`, `--fg`,
`--fg-dim`, `--muted`, `--accent`, `--accent-2/3`, `--panel`, `--border`, `--success`, `--danger`.

**Type scale (legibility foundation, P1 2026-05-20).** One knob + a token ladder with a
**12px hard floor** (replaced the old 8–11px scale that was unreadable):
```
--type-scale: 1;                      /* global readability dial */
--text-2xs: 12px   --text-xs: 13px    --text-sm: 14px   --text-base: 15px
--text-md: 16px    --text-lg: 18px    --text-xl: 22px   --text-2xl: 26px   --text-3xl: 32px
```
(each is `calc(Npx * var(--type-scale))`.) Body is `--text-base`. Nothing readable below 13px; labels floored at 12px.

**Fonts (current Laputa).** `--serif` Playfair Display · `--body` Inter · `--mono` JetBrains Mono.
(Alts swap the serif/mono.) Per `design-anti-generic`, a distinctive display face must do real work; mono is for eyebrows/labels only.

**Where things live.** Views: `src/app/_components/views/*View.tsx` (Home→Bridge command center,
Habits, Projects, Flow, Timeline, Claude, Cockpit, Stack, Brain). Theme + components: `globals.css`.
Cockpit/Kitsu: `views/cockpit/`.

**Legibility / a11y (honest state).** 12px floor enforced; `--muted`/`--fg-dim` contrast
strengthened per variant (P1). Known remaining gap: semantic accent chips
(BLOCKED/UNCOMMITTED/LAUNCH) sit ~2.3–3.0:1 — to be resolved in the color-system
pass of the chosen direction. (The old doc's "all text meets WCAG AA" claim was false.)

**Durable patterns (survive any direction).** Italic-accent-word in serif greetings
("Good *evening*, PG"); `NN // SECTION` mono labels; numbers serif + units mono;
imagery as *atmosphere behind* information (gradient-scrim hero backdrops), not decoration.

---

## How this evolves
Append facts here as they stabilize; don't pre-theorize a look. When PG locks a
bake-off direction, write the per-direction lock (layer 3) and link it here.
