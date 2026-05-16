# Cross-Module Tiers — Multi-Dimensional Rewards

> Tiers that require **simultaneous progress across modules** to unlock. These are the rewards that gamify the *system*, not any single number. The whole point: $15K MTD with broken sleep and zero workouts is a worse outcome than $10K MTD with high recovery and weekly Yuriko chapters.
>
> Single-axis tier rewards (just income) live in `../upwork/revenue-tiers.md`.

## How this works
- Tier is **unlocked** when ALL conditions held in the same calendar month
- Tier is **earned** when held for 2+ consecutive months
- Tier is **lost** if any condition drops for a full month (re-earn from scratch)

## Tier C1 (Compound 1): "The Setup Works"
**Conditions:**
- $5K MTD income
- 3+ workouts/week (4 of 4 weeks)
- 1+ creative piece shipped on any brand
- Sleep consistency > 70%

**Reward:** TODO PG fill (e.g. "Buy [tool/gear PG wants]")

## Tier C2 (Compound 2): "Sustained Operator"
**Conditions:**
- $10K MTD
- 3+ workouts/week (4 of 4)
- 1+ Yuriko chapter OR 2+ essays/posts on any brand
- Sleep consistency > 75%
- Recovery > 70% on 5+ days/week

**Reward:** TODO PG fill (e.g. "Hire VA / contractor for X hrs/wk")

## Tier C3 (Compound 3): "Free Agent"
**Conditions:**
- $15K MTD (GOAL)
- 4+ workouts/week sustained
- 1 deep creative piece + 4+ micro-pieces
- Sleep consistency > 80%
- Recovery > 75% on 5+ days/week

**Reward:** TODO PG fill (e.g. "W2 quit conversation w/ Metrasens — exact terms TBD")

## Tier C4 (Compound 4): "October Mission"
**Conditions:**
- C3 held for 2 consecutive months by end of September 2026
- Free agency conversation initiated
- Heros Chronicle live (Oct 2 launch)

**Reward:** TODO PG fill (e.g. "30th birthday celebration — specific thing")

## Stretch tier C5+
Defined when C3 sustains. Open-ended.

## Notes on tier design
- Rewards must be **specific and reachable** — no "celebrate" or "decide later"
- The dashboard surfaces current standing on each condition daily
- `dashboard/generate.py` auto-checks the conditions and reports `held/lost` per month
- Cross-module tiers are visible in PG OS Next.js app as a special "Tiers" widget (TODO)
