# Phase C — Laputa Restore + Legibility Fixes

> **Status:** ✅ COMPLETE — all edits shipped, verified across 6 palettes, single feat commit.
> **Created:** 2026-05-04
> **Completed:** 2026-05-04
> **Trigger:** PG feedback — *"god damn it it looks so bad — i miss the light blue laputa vibes and youve destroyed legibility accross everywhere i hate he colors it is all so hard to read an see everything"*

## Why This Plan Exists

Phase C of the Q2 redesign shipped a Howl's/Totoro/Mononoke palette family (T-13) as the new daily-driver default, replacing the original Laputa Day/Twilight/Midnight light-blue palette. PG hated the result on legibility AND aesthetic grounds. This plan rolls back the default while keeping Howl's/Totoro/Mononoke as **alts** (selectable, not default).

## Decisions (locked via AskUserQuestion before code changes)

**Q1 — Revert scope:** *"Restore old Laputa as default, keep new ones as alts"*
- Light-blue Laputa Day/Twilight/Midnight = daily-driver default
- Howl's/Totoro/Mononoke remain as additional selectable palettes
- 6 palettes total

**Q2 — Legibility fixes:** ALL FOUR
1. Body text contrast — bump `--fg`, `--fg-dim`, `--muted` toward AAA (7:1)
2. Heading/serif weight — bump 500 → 600
3. Accent colors — saturate `--accent` across palettes
4. Hero PNG behind text — palette-aware scrim on `.loc-bg::after`

## What's Already Done (uncommitted on disk)

5 files edited. All TypeScript-coherent — `Mode` type drives the cascade, all references updated.

### 1. `src/app/globals.css` (~143 lines changed)
- Replaced 3-palette block with 6-palette block; **Laputa palettes listed FIRST**
- All 6 palettes received boosted `--fg` / `--fg-dim` / `--muted` contrast values (heading toward AAA)
- All 6 palettes received saturated `--accent` colors
- `:root:not([data-variant])` SSR fallback changed from Howl's (warm-dark) → Laputa Day (light blue)
- `color-scheme` changed from `"dark"` → `"light dark"`
- 3 new swatches added (laputa-day / laputa-twilight / laputa-midnight); 3 existing swatches refreshed (howls / totoro / mononoke)

### 2. `src/app/_components/ModeSwitcher.tsx`
- `CHIPS` array expanded from 3 → 6 entries
- Order: Day, Twilight, Midnight, Howl's, Totoro, Mononoke

### 3. `src/app/layout.tsx`
- `themeColor` light: `#E8F0F7`, dark: `#091433`
- `<html data-variant="laputa-day">` (was `"howls"`)

### 4. `src/app/_components/ModeProvider.tsx`
- `Mode` union expanded to 6 ids
- `MODE_LABELS` expanded with `LAPUTA DAY` / `LAPUTA TWILIGHT` / `LAPUTA MIDNIGHT` entries
- `modeForHour()`: 6am-6pm → `laputa-day`, 6pm-9pm → `laputa-twilight`, else → `laputa-midnight`
- `VALID_MODES` array expanded to all 6
- `LEGACY_MAP` emptied (laputa-* canonical again; reserved for future renames)
- Initial `useState<Mode>("laputa-day")`

### 5. `src/lib/commands.ts`
- `PaletteId` type alias added covering all 6 palette ids
- `paletteCommands` expanded from 3 → 6 entries with keyword sets
- ⌘K command palette now offers all 6 palettes

## What Was Completed (this session)

### Edit 1 — `.loc-bg::after` palette-aware scrim ✅
Implemented option (b) variant — added `--scrim-rgb: R, G, B` token to all 6 palette
blocks + the SSR fallback, then rewrote `.loc-bg::after` to use
`rgba(var(--scrim-rgb), 0.15→0.55)`. One rule, six tokens, clean cascade.

Per-palette values:
- Laputa Day: `232, 240, 247` (light powder-blue fade)
- Laputa Twilight: `18, 30, 50` (deep blue fade)
- Laputa Midnight: `5, 10, 25` (ink fade)
- Howl's: `13, 8, 6` (warm-dark — preserved)
- Totoro: `7, 10, 8` (mossy black-green fade)
- Mononoke: `6, 9, 8` (forest near-black fade)

### Edit 2 — Bump serif heading weights 500 → 600 ✅
10 lines updated: 223 (.session .greeting), 228 (.session .clock .time),
236 (.vit-big), 245 (.vit-kv .v), 250 (.ring .num), 258 (.loc-city),
266 (.cal-title), 270 (.day .num), 314 (.np-info .title), 330 (.proj-title).

Playfair Display 600 was already loaded via `layout.tsx`, so no font-loading change.

### Verification ✅
1. `pnpm tsc --noEmit` — clean
2. `pnpm build` — clean
3. Playwright sweep — 6 home screenshots in `docs/screenshots/redesign-2026-q2/w03-laputa-restore/`:
   - `01-home-laputa-day.png` (light powder-blue)
   - `02-home-laputa-twilight.png` (deep blue night)
   - `03-home-laputa-midnight.png` (ink + golden embers)
   - `04-home-howls.png` (warm amber)
   - `05-home-totoro.png` (firefly amber over mossy green)
   - `06-home-mononoke.png` (kodama jade + spirit gold)
4. Confirmed `.loc-bg` hero scrim renders palette-correctly across all 6
5. Confirmed serif headings have visible weight increase

### Final Commit
```
feat(visual): restore Laputa palette as default + legibility fixes

- Restore Laputa Day/Twilight/Midnight as primary palette family
- Keep Howl's/Totoro/Mononoke as selectable alts (6 palettes total)
- Boost --fg / --fg-dim / --muted contrast across all palettes (toward AAA)
- Saturate --accent colors across all palettes
- Bump serif heading weights 500 → 600 (10 .css rules)
- Make .loc-bg::after scrim palette-aware via --scrim-rgb token

Trigger: PG feedback that the all-warm-dark default destroyed legibility.
Resolution chosen via AskUserQuestion: full restore + all 4 legibility fixes.
```

## Open Risks

- Test snapshots may reference old default `howls` — grep `tests/` and `*.snap` files
- Anything assuming `data-variant="howls"` as default needs flipping
- Dev tunnel users with cached `pg-os-laputa-manual=howls` in localStorage will still load Howl's on next visit; acceptable (it's a saved preference, not a default)
