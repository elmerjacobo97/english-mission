-- Expire abandoned processing requests and prevent old requests from saving later.

alter table public.video_processing_claims
  add column if not exists claim_token uuid not null default gen_random_uuid();

drop function if exists public.claim_video_processing(text);
drop function if exists public.release_video_processing(text);
drop function if exists public.save_video_library(
  text, text, text, text, text, jsonb, integer, timestamptz, timestamptz
);

create or replace function public.claim_video_processing(p_video_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  claimed_count smallint;
  new_claim_token uuid;
begin
  if current_user_id is null then
    return jsonb_build_object('status', 'unauthorized', 'claimToken', null);
  end if;

  if p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    return jsonb_build_object('status', 'invalid-video-id', 'claimToken', null);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  delete from public.video_processing_claims
  where user_id = current_user_id
    and created_at < now() - interval '10 minutes';

  if exists (
    select 1
    from public.video_library
    where user_id = current_user_id and video_id = p_video_id
  ) then
    return jsonb_build_object('status', 'existing', 'claimToken', null);
  end if;

  if exists (
    select 1
    from public.video_processing_claims
    where user_id = current_user_id and video_id = p_video_id
  ) then
    return jsonb_build_object('status', 'processing', 'claimToken', null);
  end if;

  if (
    select count(*)
    from public.video_library
    where user_id = current_user_id
  ) >= 20 then
    return jsonb_build_object('status', 'library-full', 'claimToken', null);
  end if;

  insert into public.video_processing_usage (user_id, day, count)
  values (current_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, day)
  do update set count = public.video_processing_usage.count + 1
    where public.video_processing_usage.count < 10
  returning count into claimed_count;

  if claimed_count is null then
    return jsonb_build_object('status', 'daily-limit', 'claimToken', null);
  end if;

  new_claim_token := gen_random_uuid();
  insert into public.video_processing_claims (user_id, video_id, claim_token)
  values (current_user_id, p_video_id, new_claim_token);

  return jsonb_build_object(
    'status', 'claimed',
    'claimToken', new_claim_token::text
  );
end;
$function$;

create or replace function public.release_video_processing(
  p_video_id text,
  p_claim_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  delete from public.video_processing_claims
  where user_id = (select auth.uid())
    and video_id = p_video_id
    and claim_token = p_claim_token;
end;
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
  p_updated_at timestamptz,
  p_claim_token uuid
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
  if current_user_id is null or p_claim_token is null then
    raise exception using errcode = 'P0001', message = 'processing_claim_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(current_user_id::text, 0)
  );

  if not exists (
    select 1
    from public.video_processing_claims
    where user_id = current_user_id
      and video_id = p_video_id
      and claim_token = p_claim_token
  ) then
    raise exception using errcode = 'P0001', message = 'processing_claim_invalid';
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

revoke execute on function public.claim_video_processing(text) from public, anon;
revoke execute on function public.release_video_processing(text, uuid) from public, anon;
revoke execute on function public.save_video_library(
  text, text, text, text, text, jsonb, integer, timestamptz, timestamptz, uuid
) from public, anon;

grant execute on function public.claim_video_processing(text) to authenticated;
grant execute on function public.release_video_processing(text, uuid) to authenticated;
grant execute on function public.save_video_library(
  text, text, text, text, text, jsonb, integer, timestamptz, timestamptz, uuid
) to authenticated;

drop function if exists public.update_video_position(text, integer);

create or replace function public.update_video_position(
  p_video_id text,
  p_position_ms integer,
  p_client_updated_at timestamptz
)
returns public.video_library
language plpgsql
security definer
set search_path = ''
as $function$
declare
  updated public.video_library;
begin
  if p_position_ms is null or p_position_ms < 0 or p_client_updated_at is null then
    raise exception using errcode = 'P0001', message = 'invalid_position';
  end if;

  update public.video_library
  set position_ms = p_position_ms, updated_at = p_client_updated_at
  where user_id = (select auth.uid())
    and video_id = p_video_id
    and updated_at <= p_client_updated_at
  returning * into updated;

  if updated.video_id is null then
    select * into updated
    from public.video_library
    where user_id = (select auth.uid()) and video_id = p_video_id;
  end if;

  return updated;
end;
$function$;

revoke execute on function public.update_video_position(text, integer, timestamptz)
  from public, anon;
grant execute on function public.update_video_position(text, integer, timestamptz)
  to authenticated;
