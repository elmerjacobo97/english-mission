-- The library cap of 20 saved videos is the only limit.
-- Stop counting new processing attempts and remove the daily usage table.

create or replace function public.claim_video_processing(p_video_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
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

  new_claim_token := gen_random_uuid();
  insert into public.video_processing_claims (user_id, video_id, claim_token)
  values (current_user_id, p_video_id, new_claim_token);

  return jsonb_build_object(
    'status', 'claimed',
    'claimToken', new_claim_token::text
  );
end;
$function$;

drop table if exists public.video_processing_usage;
