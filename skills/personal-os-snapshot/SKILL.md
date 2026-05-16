---
name: personal-os-snapshot
description: Generate a weekly snapshot of PG's personal OS across all dimensions (income, fitness, sleep, creative, projects). Use when PG says "/personal-os-snapshot", "give me my weekly snapshot", "where am I this week", "what's my week look like", "snapshot the OS", or on auto-trigger from a weekly cron. Reads all module markdown + upwork income state + WHOOP cache, writes a dated snapshot to `snapshots/YYYY-WW.md`, and surfaces a short summary inline. Output is markdown narrative — not raw data dump.
---

# Personal OS Snapshot Skill

## When this fires
- PG types `/personal-os-snapshot` or any of: "weekly snapshot", "where am I this week", "what's my week look like", "snapshot the OS"
- Auto-triggered weekly via cron (TODO scheduled task)

## What it does

1. **Read state:**
   - `~/CEREBRUM/personal-os/modules/income.md`
   - `~/CEREBRUM/personal-os/modules/fitness.md`
   - `~/CEREBRUM/personal-os/modules/sleep.md`
   - `~/CEREBRUM/personal-os/modules/creative.md`
   - `~/CEREBRUM/personal-os/modules/projects.md`
   - `~/CEREBRUM/personal-os/tiers.md` (cross-module conditions)
   - `~/CEREBRUM/upwork/income-log.md` (MTD source of truth)
   - `~/CEREBRUM/upwork/revenue-tiers.md` (revenue-only tiers)
   - `~/CEREBRUM/personal-os/data/whoop-cache.json` (if WHOOP CLI mirror has run)

2. **Compute deltas:**
   - Income MTD vs target
   - Tier conditions: which are held, which are at risk
   - Streaks: workout days, creative days, sleep-consistency days
   - Project velocity: anything 30+ days untouched

3. **Write to disk:**
   - `~/CEREBRUM/personal-os/snapshots/YYYY-WW.md` (ISO week)
   - Replaces any existing file for the current week (regenerates fresh)

4. **Surface inline:**
   - Short markdown summary in the conversation, 8-15 lines
   - One headline number + one tension + one next-action
   - Links to the full snapshot file for detail

## Output shape

The snapshot file:

```markdown
# Snapshot — Week WW of YYYY

> Generated: <ISO timestamp>

## Headline
<one-sentence: are we on track or off, by what margin>

## Income
- MTD: $X.XX
- Target by Oct: $15K/mo
- Status: on-track / behind / ahead
- Recent: last 3 entries

## Fitness + Sleep
- Workouts this week: N
- Recovery 30-day avg: X%
- Sleep consistency 30-day: X%
- Held vs C1/C2/C3 conditions: yes/no

## Creative
- Yuriko chapters this month: N
- Voyager TikTok cadence: N posts
- Writer / Alchmy: N pieces

## Projects
- Top 3 by recent commits
- Anything red (30+ days dark): list

## Cross-module tier status
- C1: held / at risk / lost (one-line why)
- C2: held / at risk / lost
- C3: held / at risk / lost
- C4: held / at risk / lost

## Tension of the week
<one paragraph: what's pulling against what>

## Next action
<single concrete next thing, with file path or person>
```

Inline summary in conversation:

```
📊 Week WW snapshot:
- $X.XX MTD ($15K target by Oct — Y% there)
- Tier C2 conditions held: 3 of 5 (sleep + income still down)
- 3 workouts this week; recovery 71%
- Yuriko chapter 14 in flight
- Tension: income up but Yuriko delayed two weeks
- Next: ship Yuriko ch.14 by Friday before adding new Upwork commits
Full snapshot: ~/CEREBRUM/personal-os/snapshots/2026-W20.md
```

## Implementation note

This skill DOES NOT write Python. It instructs Claude to read the listed files,
synthesize, and write the snapshot markdown directly. The dashboard's generate.py
handles the structured numerical extraction; this skill is the narrative layer.

If `dashboard/state.json` exists (recently generated), use it as the data source
instead of re-parsing module files — it's faster and consistent.

## Voice

- Use PG's voice (`~/.claude/Resources/VOICE_PROFILE.md`)
- No AI-tell words (`~/.claude/Resources/AI_WRITING_TELLS.md`)
- Short paragraphs, no hedging, name tensions directly
- Don't congratulate; just report. PG wants signal, not encouragement.
