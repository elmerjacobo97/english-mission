-- Keep video-library writes behind authenticated, atomic server functions.

create table if not exists public.video_processing_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, video_id)
);

revoke insert, update, delete on table public.video_library from authenticated;
grant select on table public.video_library to authenticated;
revoke all on table public.video_processing_claims from anon, authenticated;

alter table public.video_processing_claims enable row level security;

drop function if exists public.claim_video_processing_slot(uuid);

create or replace function public.claim_video_processing(p_video_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  claimed_count smallint;
begin
  if current_user_id is null then
    return 'unauthorized';
  end if;

  if p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    return 'invalid-video-id';
  end if;

  -- Serialize duplicate, capacity, and quota decisions per user.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if exists (
    select 1
    from public.video_library
    where user_id = current_user_id and video_id = p_video_id
  ) then
    return 'existing';
  end if;

  if exists (
    select 1
    from public.video_processing_claims
    where user_id = current_user_id and video_id = p_video_id
  ) then
    return 'processing';
  end if;

  if (
    select count(*)
    from public.video_library
    where user_id = current_user_id
  ) >= 20 then
    return 'library-full';
  end if;

  insert into public.video_processing_usage (user_id, day, count)
  values (current_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = public.video_processing_usage.count + 1
    where public.video_processing_usage.count < 10
  returning count into claimed_count;

  if claimed_count is null then
    return 'daily-limit';
  end if;

  insert into public.video_processing_claims (user_id, video_id)
  values (current_user_id, p_video_id);

  return 'claimed';
end;
$function$;

create or replace function public.release_video_processing(p_video_id text)
returns void
language sql
security definer
set search_path = ''
as $function$
  delete from public.video_processing_claims
  where user_id = (select auth.uid()) and video_id = p_video_id;
$function$;

create or replace function public.save_video_library(
  p_video_id text,
  p_url text,
  p_title text,
  p_thumbnail_url text,
  p_language text,
  p_segments jsonb,
  p_position_ms integer,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
returns public.video_library
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  saved public.video_library;
begin
  if current_user_id is null then
    raise exception using errcode = 'P0001', message = 'unauthorized';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if not exists (
    select 1
    from public.video_processing_claims
    where user_id = current_user_id and video_id = p_video_id
  ) then
    raise exception using
      errcode = 'P0001', message = 'processing_claim_required';
  end if;

  if exists (
    select 1
    from public.video_library
    where user_id = current_user_id and video_id = p_video_id
  ) then
    select * into saved
    from public.video_library
    where user_id = current_user_id and video_id = p_video_id;
    delete from public.video_processing_claims
    where user_id = current_user_id and video_id = p_video_id;
    return saved;
  end if;

  if (
    select count(*)
    from public.video_library
    where user_id = current_user_id
  ) >= 20 then
    raise exception using errcode = 'P0001', message = 'video_library_full';
  end if;

  insert into public.video_library (
    user_id,
    video_id,
    url,
    title,
    thumbnail_url,
    language,
    segments,
    position_ms,
    created_at,
    updated_at
  )
  values (
    current_user_id,
    p_video_id,
    p_url,
    p_title,
    p_thumbnail_url,
    p_language,
    p_segments,
    p_position_ms,
    p_created_at,
    p_updated_at
  )
  returning * into saved;

  delete from public.video_processing_claims
  where user_id = current_user_id and video_id = p_video_id;

  return saved;
end;
$function$;

create or replace function public.delete_video_library(p_video_id text)
returns public.video_library
language plpgsql
security definer
set search_path = ''
as $function$
declare
  deleted public.video_library;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended((select auth.uid())::text, 0)
  );

  delete from public.video_library
  where user_id = (select auth.uid()) and video_id = p_video_id
  returning * into deleted;

  delete from public.video_processing_claims
  where user_id = (select auth.uid()) and video_id = p_video_id;

  return deleted;
end;
$function$;

create or replace function public.update_video_position(
  p_video_id text,
  p_position_ms integer
)
returns public.video_library
language plpgsql
security definer
set search_path = ''
as $function$
declare
  updated public.video_library;
begin
  if p_position_ms is null or p_position_ms < 0 then
    raise exception using errcode = 'P0001', message = 'invalid_position';
  end if;

  update public.video_library
  set position_ms = p_position_ms, updated_at = now()
  where user_id = (select auth.uid()) and video_id = p_video_id
  returning * into updated;

  return updated;
end;
$function$;

revoke execute on function public.claim_video_processing(text) from public, anon;
revoke execute on function public.release_video_processing(text) from public, anon;
revoke execute on function public.save_video_library(
  text, text, text, text, text, jsonb, integer, timestamptz, timestamptz
) from public, anon;
revoke execute on function public.delete_video_library(text) from public, anon;
revoke execute on function public.update_video_position(text, integer) from public, anon;

grant execute on function public.claim_video_processing(text) to authenticated;
grant execute on function public.release_video_processing(text) to authenticated;
grant execute on function public.save_video_library(
  text, text, text, text, text, jsonb, integer, timestamptz, timestamptz
) to authenticated;
grant execute on function public.delete_video_library(text) to authenticated;
grant execute on function public.update_video_position(text, integer) to authenticated;
