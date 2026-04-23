# PG OS Design System

**Version 0.1 · 2026-04-21**

A multi-mode design system for a personal operating system dashboard in the Studio Ghibli anime cel-shaded aesthetic. Three swappable modes share one layout, component library, and motion language — only palette and display serif change.

---

## 1. Philosophy

Every UI surface should feel like a **JRPG command center painted by Studio Ghibli at golden hour**. The dashboard is dark, warm, and composed — not a terminal, not a productivity app, not glassmorphism. Information is presented as telemetry in a lived-in world.

**Three operating principles:**
1. **Warmth over precision.** Warm dark backgrounds, soft gradient vignettes, luminous accents. No cool grays, no pure black, no neon.
2. **Type carries the mood.** Serif for display ("Good afternoon, Patrick"), sans for body, mono for telemetry ("01 // OPERATOR"). The serif is what distinguishes each mode.
3. **Imagery is atmosphere, not decoration.** Hero images sit *behind* information (gradient-masked, 55% opacity) — they set tone, they don't compete.

---

## 2. Modes

One design system, three swappable modes. Switching modes updates CSS custom properties via `:root[data-variant="..."]`. Everything else is identical across modes.

| Token | Howl's Golden Hour | Totoro Dusk | Mononoke Forest |
|---|---|---|---|
| **Vibe** | Rolling landscape, golden hour | Lantern-lit forest at dusk | Ancient woodland cathedral |
| **Serif** | Cormorant Garamond | EB Garamond | Playfair Display |
| **Mono** | JetBrains Mono | JetBrains Mono | Space Mono |
| **Body** | Inter | Inter | Inter |
| **Hero** | `assets/hero-howls.png` | `assets/hero-totoro.png` | `assets/hero-mononoke.png` |

Default mode: **Howl's Golden Hour**.

---

## 3. Color Tokens

### 3.1 Howl's Golden Hour
```
--bg-0:        #0D0806   /* app background */
--bg-1:        #1A120C   /* elevated surface */
--bg-2:        #22180F   /* deeper surface / swatch fill */
--fg:          #F4E8D1   /* primary text, high-emphasis */
--fg-dim:      #C9B391   /* secondary text */
--muted:       #8B7355   /* tertiary text, labels */
--accent:      #D6A367   /* primary action, amber gold */
--accent-2:    #E89B6F   /* warning / coral emphasis */
--accent-3:    #6B8CAE   /* cool info accent (rare) */
--panel:       rgba(38,26,18,0.55)
--panel-solid: #201610
--border:      rgba(214,163,103,0.20)
--border-soft: rgba(214,163,103,0.10)
--success:     #7FB069
--danger:      #D0594B
```

### 3.2 Totoro Dusk
```
--bg-0:        #070A08
--bg-1:        #0F1410
--bg-2:        #151C17
--fg:          #E8EDE3
--fg-dim:      #BDC7B4
--muted:       #7A8A78
--accent:      #E0B552   /* firefly amber */
--accent-2:    #D57A5F   /* lantern coral */
--accent-3:    #73A58E   /* mossy teal */
--panel:       rgba(16,26,20,0.55)
--panel-solid: #101A14
--border:      rgba(224,181,82,0.17)
--border-soft: rgba(224,181,82,0.08)
--success:     #8FBD7A
--danger:      #C76A5A
```

### 3.3 Mononoke Forest
```
--bg-0:        #060908
--bg-1:        #0D1311
--bg-2:        #121A17
--fg:          #EFE8DA
--fg-dim:      #C1B89F
--muted:       #6F867F
--accent:      #C9A560   /* spirit gold */
--accent-2:    #B8564F   /* kodama red */
--accent-3:    #87A89A   /* jade stone */
--panel:       rgba(14,22,20,0.58)
--panel-solid: #0E1614
--border:      rgba(201,165,96,0.19)
--border-soft: rgba(201,165,96,0.09)
--success:     #86B08A
--danger:      #B8564F
```

### 3.4 Usage rules
- **`--accent`** is the primary emphasis color — CTAs, numeric highlights, active state dots, hero statistics. Never overuse — one or two per card max.
- **`--accent-2`** is for alert/urgent UI (URGENT badges, due-date warnings, critical inbox items).
- **`--accent-3`** is the rare cool note — stand ring, altitude callouts, passive info. Avoid on CTAs.
- **`--border`** separates cards from background. **`--border-soft`** separates items *within* a card.
- Backgrounds layer: `--bg-0` on body, `--panel` on cards (translucent + backdrop-blur), solid panels only for toolbars/switchers.

---

## 4. Typography

### 4.1 Font stacks
```
--serif:  <mode-specific>, serif
--body:   "Inter", system-ui, sans-serif
--mono:   <mode-specific monospace>, monospace
```

Load via Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400..600;1,500&family=EB+Garamond:ital,wght@0,400..500;1,500&family=Playfair+Display:ital,wght@0,500..600;1,500&family=Inter:wght@300..600&family=JetBrains+Mono:wght@300..500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### 4.2 Type scale

| Token | Size | Line-height | Family | Example use |
|---|---|---|---|---|
| `display-xl` | 44px / 2.75rem | 1.1 | serif 500, italic accent | Greeting ("Good afternoon, Patrick.") |
| `display-lg` | 38px / 2.4rem | 1.0 | serif 500 | Big numbers (8,347 steps) |
| `display-md` | 34px / 2.1rem | 1.1 | serif 500 italic | Location city name |
| `display-sm` | 28px / 1.75rem | 1.2 | serif 500 | Card titles (Tuesday, *April 21*) |
| `title-lg` | 24px / 1.5rem | 1.15 | serif 500 | Now playing track name |
| `title-md` | 22px / 1.4rem | 1.15 | serif 500 | Operator name, project name |
| `title-sm` | 20px / 1.25rem | 1.2 | serif 500 | Vitals sub-values |
| `clock` | 54px / 3.4rem | 1.0 | serif 500 | Running time display |
| `body` | 14px / 0.875rem | 1.45 | body 400 | Default text |
| `body-sm` | 13px / 0.81rem | 1.35 | body 400 | Inbox preview, checklist |
| `body-xs` | 12px / 0.75rem | 1.35 | body 400 | Inline sub-text |
| `mono-lg` | 11px | 1.4 | mono 500, 0.18em tracking, uppercase | Card label ("04 // CALENDAR") |
| `mono-md` | 10px | 1.4 | mono 500, 0.14em tracking, uppercase | Metadata ("UTC -05:00 · CDT") |
| `mono-sm` | 9.5px | 1.4 | mono 400, 0.18em tracking, uppercase | Telemetry band |

### 4.3 Type patterns
- **Card label** (every card top): mono-lg, muted, tracking 0.18em, uppercase. Format: `NN // SECTION · SUBSECTION`.
- **Italic accent word**: display serif sentences almost always italicize ONE word in accent color — "Good *afternoon*, Patrick.", "Tuesday, *April 21*", "Chicago, *Illinois*", "Hero's Chronicle · *v1.0*". This is the signature flourish.
- **Mixed figure + unit**: serif number with small mono unit ("68 bpm", "7.2 hrs"). Numbers serif, units mono.

---

## 5. Spacing, Radius, Shadow (shared across modes)

```
--space-1: 4px     --space-2: 8px    --space-3: 12px   --space-4: 16px
--space-5: 20px    --space-6: 24px   --space-7: 32px   --space-8: 44px

--radius-sm: 4px       /* inputs, tiny chips */
--radius-md: 6-8px     /* day tabs, buttons, inline badges */
--radius-lg: 10px      /* cards (primary) */
--radius-pill: 999px   /* chips, switcher, status pills */

--shadow-card:   0 0 30px rgba(0,0,0,0.15), inset 0 1px 0 var(--border)
--shadow-accent: 0 0 12px var(--accent)       /* on live dots */
--shadow-switcher: 0 12px 40px rgba(0,0,0,0.4)  /* floating controls */
--backdrop-blur: blur(12px)    /* on card, switcher, floating overlays */
```

**Card gutter:** 14px between cards. **Card inner padding:** 20-22px. **Section gap inside card:** 14-18px.

---

## 6. Layout

### 6.1 Top telemetry bar
Full-width, height auto (~24px). Left side: brand lockup (pulsing dot + "PG OS" + version + current mode label). Right side: telemetry stats (city/temp, battery, network, timestamp) — all in mono-sm uppercase muted, with `b` tags on values in `--fg-dim`.

### 6.2 Main grid (≥1200px desktop)
CSS Grid: 3 columns `1fr 2.2fr 1fr`, 3 rows auto. Areas:
```
"operator  session      vitals"
"location  calendar     inbox"
"location  now-playing  project"
```
14px gap. Location spans 2 rows (tall card for hero imagery). All other cells are single-row.

### 6.3 Collapse (<1200px)
Simple 2-column fallback. Operator + Session stack, Vitals goes full-width, Location + Calendar side by side, Inbox below, Now Playing + Project side by side. This is the minimum viable responsive behavior — not polished, just functional.

### 6.4 Floating palette switcher
Fixed bottom-center. Pill container. Three chips (one per mode) + a "PALETTE" label. Active chip has `--fg` background, `--bg-0` text. Click swaps `data-variant` on `<html>`.

---

## 7. Components

### 7.1 Card
```
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 22px;
  backdrop-filter: var(--backdrop-blur);
  position: relative;
  overflow: hidden;
}
.card::before {
  /* thin luminous top-edge highlight */
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--border), transparent);
}
```

### 7.2 Card label (top meta row)
```html
<div class="card-label">
  <span>04 // CALENDAR</span>
  <span class="tag live">LIVE</span>  <!-- optional right-side tag -->
</div>
```
`.tag.live` renders a pulsing success-colored dot before the text.

### 7.3 Day tab strip (calendar)
7 equal-width cells. Each cell: `MON` (mono, small, muted) over `14` (serif, 18px, fg-dim). Today tab inverts: `--fg` background, `--bg-0` text.

### 7.4 Event row (calendar)
Grid: `70px 1fr auto`. Time column (mono, uppercase, "4:00 PM" or "NOW · 2:30" with `.now` class in accent). Body column (serif-ish title + mono sub). End dot (6px circle, default `--border`, active items `--accent` + glow).

### 7.5 Inbox item
Grid: `36px 1fr auto`. Avatar (32x32 rounded 7px, initials in mono, border-soft). Body (name in 13px fg + optional URGENT badge in accent-2, preview in 12px fg-dim). Timestamp (mono-sm, muted, right-aligned top).

### 7.6 URGENT badge
Pill. `--accent-2` background, `--bg-0` text, mono 8.5px, 0.14em tracking, uppercase, padding 2px 6px, radius 3px.

### 7.7 Vitals big statistic
Serif 38px number + inline small mono unit. Below: `▲ 12% VS AVG` in success color + context line in mono muted.

### 7.8 Sparkline
Inline SVG, ~56px tall, full width. Gradient fill below the line (accent @ 0.4 → transparent), stroke in `--accent` at 1.5px. Points deterministic (no random jitter).

### 7.9 Ring (Apple Health style)
44x44 SVG. Track circle in `--border-soft`, filled arc in mode-specific ring color (Move: `--accent-2`, Exercise: `--success`, Stand: `--accent-3`). Stroke 3px, rounded. Label below in mono, numeric value above label in serif 13px.

### 7.10 Location card (special)
Background image (`--hero-url`) at 55% opacity with dark gradient overlay bottom-up. Content stacks bottom-aligned: city name (display-md italic with accent word), meta line, list of distances (each with `--accent`-colored number), coords footer.

### 7.11 Now Playing
Album-art "vinyl" (64x64, gradient fill, pseudo-elements for record + label hole + center pin). Title + artist. Waveform (80 bars, 3 states: `played`/`active`/default). Transport: two chevron buttons + central round play button (fg background).

### 7.12 Progress bar (project card)
3px height, full-width. Track: `--border-soft`. Fill: `linear-gradient(90deg, var(--accent), var(--accent-2))` + subtle glow. Width matches the progress percentage.

### 7.13 Checklist
Each row: 15x15 box + label. Unchecked: border only. Checked: `--accent` filled box with white checkmark, label strikethrough + muted color.

### 7.14 Palette switcher (floating)
Pill container fixed bottom-center. Z-index 100. Inside: "PALETTE" label + 3 clickable chips. Each chip shows a circular gradient swatch + mode name in mono. Active chip: inverted colors.

---

## 8. Motion

- **Pulse** — 2.4s ease-in-out infinite, opacity 1 → 0.45 → 1. Used on live indicators (brand dot, live tags).
- **Blink** — 1.2s ease-in-out infinite, opacity 1 → 0.2 → 1. Used on clock colon only.
- **Card fade-in** — 0.5s ease-out on first render, translateY(4px) + opacity 0 → settled.
- **Hover states** — 0.2s ease on all interactive elements. Chips lift slightly (`translateY(-2px)` optional) + border brightens to `--accent`.
- **No page transitions.** The dashboard is a live panel; no route changes needed for v0.
- **Mode switching** — 0.6s ease on `background` only. All other properties swap instantly (feels crisp, not laggy).

---

## 9. Voice / Content

- **Greetings** reference actual time ("Good afternoon," "Good morning," "Good evening," "Working late,"). One italic accent word in the greeting.
- **Labels** follow `NN // SECTION` format (section number, double-slash, uppercase name). Numbers `01`-`07` for the seven default widgets.
- **Timestamps** always show mode: `UTC -05:00 · CDT`. Military-style timestamp in top bar: `20260421·1430`.
- **Stats** include a directional arrow + comparison: `▲ 12% VS AVG`, `▼ 3% VS YESTERDAY`.
- **"URGENT"** is the only capitalized badge word. Others ("LIVE", "ONLINE", "DND") are meta, not alarms.

---

## 10. Accessibility

- All text meets WCAG AA contrast on its background (verified: fg on bg-0, fg-dim on bg-1, muted on bg-1).
- Live elements respect `prefers-reduced-motion` — pulse/blink animations should halve duration or stop when user prefers reduced motion.
- Keyboard focus ring: 2px outline in `--accent`, offset 2px. Always visible on chips, buttons, inputs.
- All SVG icons have aria-hidden or title text where they carry semantic meaning.

---

## 11. Implementation (reference)

**Canonical reference:** `reference.html` in this folder. Single-file HTML implementing all 3 modes with a working palette switcher, live clock, deterministic waveform, and every component listed above. Use it as ground truth when generating new screens in Claude Design.

**Technology target for production app:** Next.js 15 + TypeScript + Tailwind + shadcn. CSS custom properties carry the mode tokens (not Tailwind classes), since dynamic theme swapping via Tailwind requires extra plumbing.

**State:** Mode selection persists via `localStorage.getItem('pg-os-variant')`. Default: Howl's Golden Hour.
