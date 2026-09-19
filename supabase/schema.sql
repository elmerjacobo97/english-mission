-- English Mission progress schema. Safe to run repeatedly in Supabase SQL Editor.

create table if not exists public.progress_core (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.streak_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current integer not null default 0 check (current >= 0),
  best integer not null default 0 check (best >= 0),
  last_day date,
  pending_milestone smallint check (pending_milestone in (3, 7, 30))
);

create table if not exists public.shop_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day date,
  count integer not null default 0 check (count >= 0)
);

create table if not exists public.looks_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipped text not null default 'classic'
    check (equipped in ('classic', 'ocean', 'sunset', 'night', 'party')),
  owned text[] not null default '{}'::text[]
    check (owned <@ array['ocean', 'sunset', 'night', 'party']::text[])
);

create table if not exists public.mission_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  completed boolean not null default false,
  stars smallint not null default 0 check (stars between 0 and 3),
  best_coins integer not null default 0 check (best_coins >= 0),
  primary key (user_id, slug)
);

create table if not exists public.review_cards (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null,
  box smallint not null default 1 check (box between 1 and 3),
  due_at bigint not null,
  last_reviewed_at bigint,
  primary key (user_id, word_key)
);

grant select, insert, update, delete on table
  public.progress_core,
  public.streak_state,
  public.shop_state,
  public.looks_state,
  public.mission_progress,
  public.review_cards
to authenticated;

alter table public.progress_core enable row level security;
drop policy if exists "own rows" on public.progress_core;
create policy "own rows" on public.progress_core
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.streak_state enable row level security;
drop policy if exists "own rows" on public.streak_state;
create policy "own rows" on public.streak_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.shop_state enable row level security;
drop policy if exists "own rows" on public.shop_state;
create policy "own rows" on public.shop_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.looks_state enable row level security;
drop policy if exists "own rows" on public.looks_state;
create policy "own rows" on public.looks_state
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.mission_progress enable row level security;
drop policy if exists "own rows" on public.mission_progress;
create policy "own rows" on public.mission_progress
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.review_cards enable row level security;
drop policy if exists "own rows" on public.review_cards;
create policy "own rows" on public.review_cards
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
