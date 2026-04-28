-- PG OS — tasks table (005)
-- True todo system, separate from ships/queue/proposals.
-- Single-user; RLS off (gated by middleware shared-secret cookie).

create type task_status as enum ('todo','doing','done','archived');
create type task_priority as enum ('low','med','high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  project_id text,           -- matches projects.ts canonical IDs (heros-chronicle, alchmy, etc.) or null
  status task_status not null default 'todo',
  priority task_priority,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text                -- 'capture-fab' | 'projects-view' | 'claude-proposal' | etc.
);
create index tasks_project_status_idx on public.tasks (project_id, status, created_at desc);
create index tasks_status_due_idx on public.tasks (status, due_at);

-- Single-user; RLS off (gated by middleware shared-secret cookie)
alter table public.tasks disable row level security;

-- Auto-update updated_at on every change
-- Note: set_updated_at() function already exists from 001_init.sql
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
