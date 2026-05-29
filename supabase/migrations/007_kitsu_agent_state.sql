-- 007_kitsu_agent_state.sql
-- Kitsu's durable cross-session knowledge (Phase 3 of the orchestrator build).
-- Files in ~/.pg-os/kitsu/ are the source of truth; this is a best-effort mirror
-- so learned preferences + the decision log survive a machine swap and can be
-- read by the deployed app. Single-user, RLS off (middleware gates access).

create table if not exists agent_state (
  key        text primary key,             -- e.g. "pref:<iso>", "decision:<iso>"
  value      text not null,                -- the learned fact / correction / summary
  kind       text not null default 'note', -- action | correction | sweep | note
  updated_at timestamptz not null default now()
);

create index if not exists agent_state_kind_idx on agent_state (kind);
create index if not exists agent_state_updated_idx on agent_state (updated_at desc);
