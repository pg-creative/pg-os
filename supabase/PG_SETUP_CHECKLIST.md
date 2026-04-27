# PG OS — Manual setup checklist (Track A finalization)

The code for Track A is committed. These steps require your hands on a browser /
DNS provider / Supabase dashboard. Do them in order. After step 9 the dashboard
runs as a real cloud-backed app at `https://os.pgsmith.com` (or whatever domain
you pick). Until then it keeps working locally in sqlite-fallback mode — no
behavior change.

## 1. Create the Supabase project

1. https://supabase.com/dashboard → **New Project**
2. Name: `pg-os` (or `personal-os`)
3. Region: `us-east-2` (or closest to where you live + your eventual Vercel region)
4. DB password: generate strong, save in 1Password
5. Wait ~60s for provisioning

## 2. Apply the migration

In the new project's SQL Editor (left rail):
- Paste the entire contents of `supabase/migrations/001_init.sql`
- Run

Should report 9 tables created.

## 3. Generate secrets locally

```bash
# In ~/CEREBRUM/personal-os
openssl rand -base64 32 > /tmp/token-key.txt
openssl rand -base64 48 > /tmp/shared-secret.txt
cat /tmp/token-key.txt /tmp/shared-secret.txt
```

## 4. Add to `.env.local`

```
# Supabase (Project Settings → API in the dashboard)
PGOS_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
PGOS_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...     # service_role key, ~250 chars

# Token encryption (32 bytes base64) and single-user gate
TOKEN_ENC_KEY=<paste from /tmp/token-key.txt>
PGOS_SHARED_SECRET=<paste from /tmp/shared-secret.txt>

# Anthropic (for the in-dashboard co-pilot — Track B)
ANTHROPIC_API_KEY=sk-ant-...

# Existing (already there, leave as-is for now):
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:3030/api/auth/google/callback
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3030/api/auth/spotify/callback
WHOOP_CLIENT_ID=...
WHOOP_CLIENT_SECRET=...
WHOOP_REDIRECT_URI=http://127.0.0.1:3030/api/auth/whoop/callback
SESSION_PASSWORD=...
HC_SUPABASE_URL=...
HC_SUPABASE_SERVICE_ROLE_KEY=...
```

## 5. Verify locally

```bash
pnpm dev
curl http://127.0.0.1:3030/api/db-health
```

Expected: `{ "ok": true, "configured": true, "tables": 9, "checks": [...] }` —
all 9 tables responding with `rows: 0`.

If `ok: false`, check that `PGOS_SUPABASE_URL` doesn't have a trailing slash and
the service role key is the long one (NOT anon).

## 6. Migrate existing ship log

```bash
# Dry run first
node --env-file=.env.local scripts/migrate-ships-to-supabase.mjs

# Once it looks right
node --env-file=.env.local scripts/migrate-ships-to-supabase.mjs --apply
```

Idempotent — safe to run multiple times.

## 7. Set up the Vercel project

```bash
cd ~/CEREBRUM/personal-os
vercel link        # link to your Vercel team
vercel env pull    # see what's currently set (probably empty)
```

Then in the Vercel dashboard for this project:

**Settings → Environment Variables** — add:

```
PGOS_SUPABASE_URL                 (same as local)
PGOS_SUPABASE_SERVICE_ROLE_KEY    (same as local)
TOKEN_ENC_KEY                     (same as local)
PGOS_SHARED_SECRET                (same as local)
ANTHROPIC_API_KEY                 (same as local)

# Production-only: change redirect URIs to the prod domain
GOOGLE_REDIRECT_URI               https://os.pgsmith.com/api/auth/google/callback
SPOTIFY_REDIRECT_URI              https://os.pgsmith.com/api/auth/spotify/callback
WHOOP_REDIRECT_URI                https://os.pgsmith.com/api/auth/whoop/callback
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc — copy from .env.local
SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, etc
WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, etc
SESSION_PASSWORD                  (any random string — needed by legacy logout route)
HC_SUPABASE_URL                   (existing)
HC_SUPABASE_SERVICE_ROLE_KEY      (existing)
```

## 8. Domain — `os.pgsmith.com`

In Vercel project → Settings → Domains:
- Add `os.pgsmith.com`
- Vercel shows you a CNAME or A record to add in your DNS provider (Cloudflare/Namecheap/etc)
- Add it. Wait ~2 min for DNS propagation.

## 9. Update OAuth redirect URIs (each provider's console)

You can keep BOTH the local and production redirect URIs registered — most
OAuth consoles allow a list.

### Google
https://console.cloud.google.com/ → Credentials → your OAuth 2.0 client
- Add: `https://os.pgsmith.com/api/auth/google/callback`
- Keep: `http://127.0.0.1:3030/api/auth/google/callback` (for local dev)

### Spotify
https://developer.spotify.com/dashboard → your app → Settings → Redirect URIs
- Add: `https://os.pgsmith.com/api/auth/spotify/callback`

### Whoop
https://developer.whoop.com/ → your app → Redirect URIs
- Add: `https://os.pgsmith.com/api/auth/whoop/callback`

## 10. Deploy

```bash
vercel --prod
```

First load: visit `https://os.pgsmith.com/?key=<PGOS_SHARED_SECRET>` — sets the
auth cookie, redirects to `/`. Subsequent visits don't need the key.

On phone: same URL, same flow. The cookie persists 90 days per device.

## 11. Verify the round-trip

1. Open laptop dashboard, log a ship
2. Open phone dashboard (`https://os.pgsmith.com`), confirm ship appears
3. Resolve a queue item from phone, check it disappears from laptop on refresh

Once #3 passes, Track A is fully shipped. Tracks A2 / A3 / A4 / A5 / A6 unlock.

## Rollback

If anything breaks the deploy:
- Unset `PGOS_SUPABASE_URL` env var → app reverts to sqlite-fallback (still works locally)
- Or `git revert` the offending Track A wave commit

## What's still local (intentional)

- `~/.pg-os/queue/*.md` — Claude Code's queue-write rule still drops files here.
  They mirror to Supabase on next OS read.
- `~/.claude/self-improvement/data/*` — the agents (session-review, weekly-meta-audit,
  memory-hygiene) keep writing files. The OS mirrors proposals/trust changes
  to Supabase.
- `~/.pg-os/ships.db` — kept as a fallback if Supabase env disappears. Safe to
  delete after migration if you want.
