-- 006_activity_stream.sql — Unified activity stream backbone
--
-- Goal: PG OS becomes the canonical surface for agent activity, replacing Notion
-- "Agent Runs" database over time. The Claude tab gets a clickable timeline
-- that joins agent_runs ↔ queue_items ↔ decisions_log ↔ telegram_events so
-- every artifact in the workflow is traceable from any other.

-- ── extend agent_runs to carry the run body, not just exit metadata ──
alter table public.agent_runs
  add column if not exists summary    text,           -- one-line headline rendered in stream
  add column if not exists body_md    text,           -- full markdown body of the run output
  add column if not exists notion_url text,           -- legacy mirror; will phase out
  add column if not exists model      text,           -- 'sonnet' | 'haiku' | 'opus' | 'claude-haiku-4-5' etc
  add column if not exists brief_date date;           -- for joining to date-keyed artifacts

create index if not exists idx_agent_runs_brief_date
  on public.agent_runs (brief_date desc) where brief_date is not null;

-- ── queue_items.run_id — links an item to the run that generated it ──
alter table public.queue_items
  add column if not exists run_id bigint references public.agent_runs(id) on delete set null;

create index if not exists idx_queue_items_run on public.queue_items (run_id) where run_id is not null;

-- ── telegram_events — every webhook callback + outbound message logged ──
-- Lets the activity view show "Telegram tap at 2:42pm → resolved queue-item-X"
-- and PG OS to render a per-item Telegram thread inline.
create table if not exists public.telegram_events (
  id          bigserial primary key,
  direction   text not null,                          -- 'in' | 'out'
  kind        text not null,                          -- 'callback' | 'message_in' | 'brief' | 'action_button' | 'reply'
  ref_kind    text,                                   -- 'queue_item' | 'agent_run' | 'proposal' | null
  ref_id      text,                                   -- FK target as text (queue_id or agent_run id-as-string)
  chat_id     text,                                   -- Telegram chat id
  message_id  bigint,                                 -- Telegram message id (for thread reconstruction)
  payload     jsonb,                                  -- raw Telegram payload OR our outbound body
  created_at  timestamptz not null default now()
);

create index if not exists idx_tg_events_recent
  on public.telegram_events (created_at desc);

create index if not exists idx_tg_events_ref
  on public.telegram_events (ref_kind, ref_id) where ref_id is not null;

alter table public.telegram_events disable row level security;
