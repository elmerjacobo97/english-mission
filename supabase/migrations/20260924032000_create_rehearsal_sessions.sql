-- Rehearsal sessions: scenario practice conversations owned by one account.

create table if not exists public.rehearsal_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  situation text not null,
  objective text not null,
  character_role text not null,
  course_band text not null
    check (course_band in ('basic', 'intermediate', 'advanced')),
  status text not null default 'ready'
    check (status in ('ready', 'in_progress', 'completed')),
  messages jsonb not null default '[]'::jsonb
    check (jsonb_typeof(messages) = 'array'),
  feedback jsonb
    check (feedback is null or jsonb_typeof(feedback) = 'object'),
  source_session_id uuid
    references public.rehearsal_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rehearsal_sessions_user_updated_idx
  on public.rehearsal_sessions (user_id, updated_at desc);

alter table public.rehearsal_sessions enable row level security;

drop policy if exists "rehearsal sessions select own" on public.rehearsal_sessions;
create policy "rehearsal sessions select own" on public.rehearsal_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "rehearsal sessions insert own" on public.rehearsal_sessions;
create policy "rehearsal sessions insert own" on public.rehearsal_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "rehearsal sessions update own" on public.rehearsal_sessions;
create policy "rehearsal sessions update own" on public.rehearsal_sessions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "rehearsal sessions delete own" on public.rehearsal_sessions;
create policy "rehearsal sessions delete own" on public.rehearsal_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.rehearsal_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.rehearsal_sessions to authenticated;
