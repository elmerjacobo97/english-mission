-- English Mission initial schema. Apply with Supabase CLI migrations.

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

create table if not exists public.video_library (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  url text not null,
  title text not null,
  thumbnail_url text,
  language text not null default 'en' check (language = 'en'),
  segments jsonb not null check (jsonb_typeof(segments) = 'array'),
  position_ms integer not null default 0 check (position_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

create table if not exists public.video_processing_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count smallint not null default 0 check (count between 0 and 10),
  primary key (user_id, day)
);

grant select, insert, update, delete on table
  public.progress_core,
  public.streak_state,
  public.shop_state,
  public.looks_state,
  public.mission_progress,
  public.review_cards
to authenticated;

revoke all on table public.video_library from anon, authenticated;
grant select, insert, update, delete on table public.video_library to authenticated;

revoke all on table public.video_processing_usage from anon, authenticated;

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

alter table public.video_library enable row level security;
drop policy if exists "video library select own" on public.video_library;
create policy "video library select own" on public.video_library
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "video library insert own" on public.video_library;
create policy "video library insert own" on public.video_library
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "video library update own" on public.video_library;
create policy "video library update own" on public.video_library
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "video library delete own" on public.video_library;
create policy "video library delete own" on public.video_library
  for delete to authenticated
  using ((select auth.uid()) = user_id);

alter table public.video_processing_usage enable row level security;
drop policy if exists "video usage select own" on public.video_processing_usage;
create policy "video usage select own" on public.video_processing_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.claim_video_processing_slot(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed boolean := false;
begin
  if (select auth.uid()) is distinct from p_user_id then
    return false;
  end if;

  insert into public.video_processing_usage (user_id, day, count)
  values (p_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = public.video_processing_usage.count + 1
    where public.video_processing_usage.count < 10
  returning true into claimed;

  return claimed;
end;
$$;

revoke execute on function public.claim_video_processing_slot(uuid) from public, anon;
grant execute on function public.claim_video_processing_slot(uuid) to authenticated;
