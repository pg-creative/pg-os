# Income Module

> **Source of truth:** `~/CEREBRUM/upwork/income-log.md` + `~/CEREBRUM/upwork/revenue-tiers.md`. This file is a **narrative summary** read by the dashboard + snapshot skill. Numerical state lives in the upwork project.

## Current month
- **MTD:** auto-read from `../upwork/income-log.md`
- **Target this month:** TODO PG fill
- **Goal by October 2026:** $15K/mo

## Tiers
See `../upwork/revenue-tiers.md` for the live tier table. Cross-module tier interactions live in `tiers.md`.

## Sources
- **Upwork:** primary channel, agent-driven (see `~/CEREBRUM/upwork/CLAUDE.md`)
- **Productized services (Alchmy):** AI Opportunity Audit ($2,995-$4,995)
- **Direct deposits:** logged manually via `POST /manual` on stripe_hook
- **Other:** TODO PG list — affiliate, content, consulting, etc.

## Streak
- **Days with income this month:** TODO (computed by `dashboard/generate.py`)
- **Longest streak:** TODO

## Risks to track
- Upwork algorithm trust (need >7 fit score floor, no spraying)
- Client concentration (>40% of MTD from one client = single-point risk)
- Connect spend (Upwork connects cost — monitor weekly)
