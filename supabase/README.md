# PG OS — Supabase setup

This is the cloud-state layer for Personal OS (Track A of the Recursive Fox plan).

## What lives here

- `migrations/001_init.sql` — all 9 tables for ships, queue mirror, OAuth tokens (encrypted), proposals/decisions log, trust state, agent runs, push subscriptions, brand mode state.

## Setup steps (one-time, by PG)

### 1. Create a dedicated Supabase project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Name: `pg-os` (or `personal-os`)
4. Region: `us-east-2` (or whichever is closest to where you live + Vercel)
5. Database password: generate a strong one and save it to 1Password
6. Plan: free tier is fine to start

### 2. Apply the migration

Option A — Supabase CLI (recommended once you do it more than once):
```bash
brew install supabase/tap/supabase
cd ~/CEREBRUM/personal-os
supabase login
supabase link --project-ref <project-ref-from-dashboard-url>
supabase db push
```

Option B — Manual paste in dashboard:
1. Open the new project's SQL Editor (left rail)
2. Paste the entire contents of `migrations/001_init.sql`
3. Run

### 3. Grab the credentials

In the project dashboard:
- **Project Settings → API → Project URL** — this is `PGOS_SUPABASE_URL`
- **Project Settings → API → `service_role` key** (NOT the anon key) — this is `PGOS_SUPABASE_SERVICE_ROLE_KEY`

Add to `.env.local`:
```
PGOS_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
PGOS_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...   # service_role, ~250 chars
TOKEN_ENC_KEY=<32-byte-base64-secret>           # generate with: openssl rand -base64 32
PGOS_SHARED_SECRET=<long-random-string>         # for the single-user middleware cookie
```

Add the same to Vercel project settings later (Track A step 8).

### 4. Sanity check

```bash
pnpm dev
curl http://127.0.0.1:3030/api/db-health   # endpoint added by Track A
```

Should return `{ "ok": true, "tables": 9 }`.

## Why a dedicated project (not HC's)

Hero's Chronicle has 14 active migrations driving a real product. Mixing schemas
would entangle two systems with different lifecycles, different RLS needs (HC has
multi-user; PG OS is single-user), and different backup/uptime expectations.

Separation costs nothing on free tier and keeps each system independently
deployable + deprecatable.
