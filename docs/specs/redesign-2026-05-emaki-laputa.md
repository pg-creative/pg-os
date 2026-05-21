# PG OS Redesign — Emaki × Laputa Direction (2026-05-20)

> **This is the current, canonical redesign plan.** It supersedes the *visual-direction*
> portions of `REDESIGN-2026-Q2.md`; that doc's §0 operating principles still hold where
> they don't conflict (one literary line per screen, show-the-verb, foundation-before-flash,
> a11y/reduced-motion). The big change since Q2: a real aesthetic direction is now chosen.
>
> **Method:** `design-lab` + HTML-artifact-first (per `~/.claude/rules/motion-prototyping.md` —
> for a web app the HTML artifact IS the deliverable). Process canon: `~/.claude/rules/design-anti-generic.md`
> (slimmed 2026-05-20 to options + research-first + em-dash; no prescriptive look mandates).

## Where we are (decided 2026-05-20)

- Ran a 2-round design-skills bake-off. **Round 1** (skills at vendor default on a fixed Home slice) → PG's favorite was **impeccable** (a polisher, because it started from his own baseline). **Round 2** (research-first, then interview-first, 4 distinct directions × 3 arms A/B/C) → PG chose **Emaki Scroll, arm C (Nioh-kitsune)** as the direction, to be **fused with Laputa Observatory's legibility & sleekness**, with a **3-phase time-responsive sky**: Laputa day → cherry-blossom twilight → foxfire-spirit night.
- **Matched 3-phase sky art generated** (`public/art/aesthetic-2026-05-20/emaki-sky-{day,twilight,night}_0..3.png`, MJ, one scene morphing through the day; 4 candidates each).
- **Fusion preview** building at `/dev/emaki-laputa` (day/twilight/night toggle).
- Bake-off labs preserved as baselines: `/dev/aesthetic-lab` (round-1 baseline), `/dev/skills-bakeoff` (round-1 skills), `/dev/bakeoff-r2` (round-2, 4 dirs × 3 arms).

## Why this matters in plain terms
We picked the *look* (a painted Japanese picture-scroll that's also crisp and readable, where the day moves from open sky → sakura dusk → spirit-night, and the fox Kitsu is finally native). Picking the look is step 1. The actual work is making the **whole product** wear it — every icon, every tab, every asset — not just the hero image. That's what's below.

---

## The remaining scope — 5 workstreams

### WS1 — Lock the direction  *(DONE 2026-05-20, gate passed)*
- [x] PG reviewed `/dev/emaki-laputa` across all 3 phases and approved: "all three work, lock it."
- [x] Legibility + day fixes applied. Key fix: luminance-aware blur/halo (per-phase tokens + CSS vars). Day de-blurred, de-smeared, returned to crisp Laputa light-blue.
- [x] Lock written: `~/.claude/research/pgos-aesthetic-lock-2026-05.md`. CANON updated with the locked-direction section.
- [ ] (carry) Optionally compare the other 3 MJ candidates per phase later if a different one than `_0` reads better.

### WS2 — Full visual-system regen  *(NOT just the hero sky)*
This is the part PG flagged: "we need the whole thing to update — icons, aesthetic, etc."
- [ ] **3-phase palette tokens** wired into `globals.css` `data-variant` — extend the existing Laputa Day/Twilight/Midnight system to the new day(Laputa) / twilight(sakura) / night(foxfire) palettes.
- [ ] **Per-surface painted backdrops** — each major surface may need its own scene rendered in the 3-phase world (not every tab can share one hero). Enumerate which surfaces get bespoke art vs a shared wash. (MJ batch, same pipeline.)
- [ ] **Iconography** — tab/nav icons + status glyphs redrawn in the direction (ink-stroke / kanji / foxfire motifs), replacing the current generic set.
- [ ] **App / PWA icon** refresh to match (currently V2 Midnight Ember; needs an Emaki×Laputa-era icon at 180/192/512).
- [ ] **Reusable material components** — washi/parchment insets, kintsugi-seam dividers, foxfire-ember + kodama-orb layers, painted-scrim panel — built once as components, used across tabs.

### WS3 — Kitsu (the fox)  *(outstanding generation work — PG to confirm exact list)*
- [ ] Integrate the **bought Live2D avatar** into the new layout (her pod per phase: torii/brushed-ink at night, etc.). Today's builds use `/agent-office/pixel/marvis-kitsune.png` as a *stand-in*; the real avatar drops into the same slot.
- **CONFIRMED 2026-05-20 — ALL of P4 carry-forward is in scope.** Each is its own sub-task once the direction locks: interactive kitsune backgrounds · lip-sync the fox to real ElevenLabs amplitude (AnalyserNode — pattern proven in PartyMode) · expression/idle/talk sprite set · Picovoice wake-word (when approved).

### WS4 — Module-by-module tab redesign  *(HTML-artifact-first, in design-lab)*
Per motion-prototyping: prototype each surface as an HTML/CSS/JS artifact in `design-lab` first, PG feels it, then translate/ship into the real view.
- Surfaces (from `src/app/_components/views/`): **Home · Habits · Projects · Flow · Claude · Cockpit · Brain · Stack · Personal · Timeline · Bridge** + bespoke routes `/briefing`, `/evening`. *(Exact tab set to confirm — some views may be sub-views or retired.)*
- **CONFIRMED 2026-05-20 — EVERY view is in scope** (all ~11 views + bespoke `/briefing`, `/evening`). Redesign order: start with **Home** (already prototyped), then proceed through the rest.
- [ ] Per surface: design-lab artifact → PG approval → ship into the live view in the locked tokens/components.
- **Standard per-surface QA: the "skills audit" pass** (PG's workflow, 2026-05-20). The 5 design skills are mediocre *generators* (bake-off proved they converge) but strong *auditors* — use them that way. For each surface: run **impeccable** (craft/polish critique) + **taste** (anti-slop/usability) + **taste-5dim** (5-dim scored audit incl. a11y) + **ui-ux-pro-max** (its 99 UX guidelines + accessibility rules) as AUDITORS on the built surface → I synthesize a deduped, prioritized recommendation list → **review with PG** → apply the chosen fixes. Reusable on every tab.
- **Legibility standard (non-negotiable, from research 2026-05-20):** `~/.claude/research/legible-ui-over-imagery.md` — body **18–20px**, headings **24px+**, weight **500+** (600 for data), **7:1 contrast** measured against the panel (never the raw painting), panels solid enough (`rgba` 0.50, 0.70 for data-dense), text-on-image always gets a halo/floor-fade, aging-eyes layer (1.6 line-height, no weight <400, 48px targets). This painted-backdrop direction lives or dies on this.

### WS5 — Lock artifacts + CANON  *(overlaps WS1)*
- [ ] `~/.claude/research/pgos-aesthetic-lock-2026-05.md` — durable cross-project record of the chosen direction.
- [ ] `personal-os/design-system/CANON.md` — updated to describe the shipped system.

---

## Resolved with PG (2026-05-20)
1. **WS3 Kitsu:** ALL of P4 carry-forward in scope (backgrounds, lip-sync, sprites, wake-word) + bought-avatar integration.
2. **WS4 tabs:** EVERY view in scope (all ~11 + bespoke routes). Order: Home first.
3. **WS2 art:** per-surface bespoke-vs-shared is Claude's design judgment ("whatever looks best").

## Sequencing
WS1 (lock) gates everything. Then WS2 (tokens + materials) before WS4 (tabs can't be redesigned until the palette/components exist). WS3 (Kitsu) and the art-generation parts of WS2 can run in parallel with WS4 once tokens land. WS5 is written at WS1 and kept current.
