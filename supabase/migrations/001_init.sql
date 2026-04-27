-- PG OS — initial schema
-- Single-user app. No users table. All access via service role key.
-- RLS is OFF on every table; the Next.js middleware enforces single-user gating.

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists pgcrypto;

-- ── Helper: updated_at trigger fn ────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. ships ─────────────────────────────────────────────────
-- Mirror of ~/.pg-os/ships.db (node:sqlite). Append-only ledger.
create table if not exists public.ships (
  id          bigserial primary key,
  text        text not null,
  context     text,
  source      text not null default 'dashboard',  -- 'dashboard' | 'capture' | 'cli' | 'agent'
  created_at  timestamptz not null default now()
);
create index if not exists idx_ships_created_at on public.ships (created_at desc);
create index if not exists idx_ships_context on public.ships (context) where context is not null;

-- ── 2. queue_items ───────────────────────────────────────────
-- Mirror of ~/.pg-os/queue/*.md. Markdown files remain source of truth for
-- Claude Code's queue-write rule; this table is the cloud-sync mirror.
create table if not exists public.queue_items (
  id           text primary key,            -- matches markdown filename slug
  title        text not null,
  source       text,                        -- project id, e.g. 'heros-chronicle'
  options      jsonb,                       -- array of strings or null
  note         text,                        -- markdown body
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  resolved_at  timestamptz,                 -- null until decided/dismissed
  decision     text                         -- the chosen option, or 'dismissed', or free text
);
create index if not exists idx_queue_unresolved on public.queue_items (created_at) where resolved_at is null;
create index if not exists idx_queue_source on public.queue_items (source) where source is not null;
create trigger queue_items_updated_at before update on public.queue_items
  for each row execute function public.set_updated_at();

-- ── 3. oauth_tokens ──────────────────────────────────────────
-- Encrypted. We store ciphertext only; the app decrypts in memory using the
-- TOKEN_ENC_KEY environment secret (32-byte base64). Never log access_token.
create table if not exists public.oauth_tokens (
  provider          text primary key,         -- 'google' | 'spotify' | 'whoop'
  access_token_enc  text not null,            -- base64(iv || aes-256-gcm-ciphertext || tag)
  refresh_token_enc text,
  expires_at        timestamptz,
  scope             text,
  email             text,                     -- google only; null for others
  updated_at        timestamptz not null default now()
);
create trigger oauth_tokens_updated_at before update on public.oauth_tokens
  for each row execute function public.set_updated_at();

-- ── 4. proposals_log ─────────────────────────────────────────
-- Mirror of ~/.claude/self-improvement/data/pending-proposals.json with action history.
-- Source of truth remains the JSON file (agents write there). This table mirrors so
-- the dashboard can do cross-time queries and the post-mortem loop can reference past proposals.
create table if not exists public.proposals_log (
  id                bigserial primary key,
  proposal_type     text not null,           -- RULE_PROMOTION | CONFIG_FIX | RULE_ADD | SKILL_IMPROVEMENT | etc
  category          text not null,           -- 'rule-promotion' | 'config-fix' | etc
  description       text not null,
  evidence          text,
  source            text,                    -- 'session-review' | 'weekly-meta-audit' | etc
  occurrences       integer default 1,
  proposed_at       timestamptz not null,    -- the date from the JSON file
  action            text,                    -- null | 'approved' | 'dismissed' | 'auto-executed'
  action_at         timestamptz,
  action_by         text,                    -- 'pg' | 'auto-trust' | 'auto-execute'
  outcome           text,                    -- filled in by post-mortem after 14d
  outcome_at        timestamptz,
  created_at        timestamptz not null default now(),
  unique (description, proposed_at)         -- natural key for the upsert mirror
);
create index if not exists idx_proposals_pending on public.proposals_log (proposed_at) where action is null;
create index if not exists idx_proposals_for_postmortem on public.proposals_log (action_at) where action = 'approved' and outcome is null;

-- ── 5. decisions_log ─────────────────────────────────────────
-- Every decision PG (or autonomy) makes — proposal approve/dismiss, calendar decline,
-- queue item resolve, etc. This is the substrate for the post-mortem loop (Item 9).
create table if not exists public.decisions_log (
  id          bigserial primary key,
  kind        text not null,                 -- 'proposal' | 'calendar_decline' | 'queue_resolve' | 'mode_switch' | etc
  ref_id      text,                          -- foreign key into the related table (proposals_log.id, queue_items.id, etc) as text
  detail      jsonb,                         -- free-form structured payload
  taken_at    timestamptz not null default now(),
  taken_by    text not null default 'pg',    -- 'pg' | 'auto-trust' | 'cron-rule' | etc
  followup_at timestamptz,                   -- when post-mortem should ping
  outcome     text,                          -- post-mortem field
  outcome_at  timestamptz
);
create index if not exists idx_decisions_followup on public.decisions_log (followup_at) where outcome is null and followup_at is not null;

-- ── 6. trust_categories ──────────────────────────────────────
-- Mirror of ~/.claude/self-improvement/data/trust-state.json categories.
create table if not exists public.trust_categories (
  category      text primary key,            -- 'rule-promotion' | 'memory-cleanup' | etc
  approvals     integer not null default 0,
  rejections    integer not null default 0,
  threshold     integer not null default 5,
  auto_execute  boolean not null default false,
  history       jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now()
);
create trigger trust_categories_updated_at before update on public.trust_categories
  for each row execute function public.set_updated_at();

-- ── 7. agent_runs ────────────────────────────────────────────
-- Every spawn of an agent — by dashboard, by cron, by autonomy. Includes co-pilot
-- chat completions for cost tracking.
create table if not exists public.agent_runs (
  id            bigserial primary key,
  agent         text not null,               -- 'session-review' | 'morning-briefing' | 'copilot-chat' | etc
  source        text not null,               -- 'dashboard' | 'launchd-cron' | 'vercel-cron' | 'autonomy' | 'user-chat'
  pid           integer,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text,                        -- 'running' | 'ok' | 'error' | 'timeout' | 'aborted'
  cost_usd      numeric(10,4),
  input_tokens  integer,
  output_tokens integer,
  cache_read    integer,
  cache_create  integer,
  log_excerpt   text                         -- last ~2KB of stderr/stdout for quick triage
);
create index if not exists idx_agent_runs_recent on public.agent_runs (started_at desc);
create index if not exists idx_agent_runs_running on public.agent_runs (started_at) where finished_at is null;
create index if not exists idx_agent_runs_by_agent on public.agent_runs (agent, started_at desc);

-- ── 8. push_subscriptions ────────────────────────────────────
-- Web push. Each device that opts in registers an endpoint.
create table if not exists public.push_subscriptions (
  endpoint      text primary key,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  label         text,                        -- user-set: 'iPhone', 'work laptop'
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

-- ── 9. mode_state ────────────────────────────────────────────
-- Brand mode pivot. Single row. Track C builds the picker; this is its persistence.
create table if not exists public.mode_state (
  id            integer primary key default 1 check (id = 1),  -- enforce single row
  current_mode  text,                        -- 'alchmy' | 'voyager' | 'writer' | 'metrasens' | 'recovery' | null
  since         timestamptz not null default now(),
  set_by        text not null default 'pg'   -- 'pg' | 'auto-rule' (cross-tab intelligence)
);
insert into public.mode_state (id, current_mode) values (1, null) on conflict (id) do nothing;
