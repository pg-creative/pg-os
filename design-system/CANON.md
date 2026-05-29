# PG OS — Design Canon

> **This is a compass, not a cage.** It records what the code actually does and
> where to make taste decisions. It does **not** mandate one fixed look. As of
> 2026-05-20 a direction IS locked for the home surface (Emaki x Laputa; see the
> "Locked direction" section below), but this canon stays descriptive. Replaces the
> prescriptive `DESIGN-SYSTEM.md v0.1` (archived 2026-05-20 in `_archive/`; it
> dictated a single "warm dark Ghibli" look that fought the projects it served).

## The three layers

1. **Process / taste (portable, project-agnostic)** → `~/.claude/rules/design-anti-generic.md`.
   How to decide: build live switchable options including a falsification variant,
   research-first lookup, and voice (NO em dashes anywhere, hard rule set 2026-05-20).
   The prescriptive look-mandates (single-bento, max-accents, motion timing, font rules)
   were scrapped 2026-05-20 as too restrictive. Travels across every PG project.
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

## Locked direction (2026-05-20) — Emaki x Laputa
PG locked the home-surface direction: a painted Japanese picture-scroll (emaki) wearing
Laputa's crisp legibility, with a 3-phase time-responsive sky (day 陽光の庭 Laputa light-blue,
twilight 黄昏の刻 sakura dusk, night 狐火の道 foxfire), the real Kitsu Live2D avatar, Noto Serif
JP titles + clean sans for data. Key locked rule: blur, halos, and scrims are LUMINANCE-AWARE
(phase tokens + CSS vars `--panel-blur`, `--hero-halo`); a dark-mode treatment silently breaks
on the bright day sky. Approved prototype: `/dev/emaki-laputa`. Full lock (palettes, craft rules):
`~/.claude/research/pgos-aesthetic-lock-2026-05.md`. Build plan: `docs/specs/redesign-2026-05-emaki-laputa.md`.
The 6 legacy variants above are the PRE-lock state; the redesign migrates surfaces to the locked
direction tab by tab.

## How this evolves
Append facts here as they stabilize. Don't pre-theorize a look. The per-direction lock (layer 3)
is now written and linked above; update it if the direction is refined.
