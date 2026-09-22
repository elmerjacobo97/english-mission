-- Ignore delayed client writes and accept mobile YouTube URLs already parsed by the app.

create or replace function public.validate_video_library_row()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  segment jsonb;
begin
  if NEW.video_id !~ '^[A-Za-z0-9_-]{11}$'
    or NEW.url !~* '^https?://([^/]+\.)?youtube\.com/(watch\?|shorts/)|^https?://youtu\.be/'
    or char_length(btrim(NEW.title)) = 0
    or char_length(NEW.title) > 500
    or NEW.language <> 'en'
    or jsonb_typeof(NEW.segments) <> 'array'
    or jsonb_array_length(NEW.segments) = 0
    or jsonb_array_length(NEW.segments) > 10000
  then
    raise exception using errcode = 'P0001', message = 'invalid_video_payload';
  end if;

  if NEW.thumbnail_url is not null
    and NEW.thumbnail_url !~* '^https?://'
  then
    raise exception using errcode = 'P0001', message = 'invalid_video_payload';
  end if;

  for segment in select value from jsonb_array_elements(NEW.segments)
  loop
    if jsonb_typeof(segment) <> 'object'
      or jsonb_typeof(segment->'text') <> 'string'
      or char_length(btrim(segment->>'text')) = 0
      or jsonb_typeof(segment->'startMs') <> 'number'
      or jsonb_typeof(segment->'durationMs') <> 'number'
      or (segment->>'startMs')::numeric < 0
      or (segment->>'durationMs')::numeric <= 0
      or mod((segment->>'startMs')::numeric, 1) <> 0
      or mod((segment->>'durationMs')::numeric, 1) <> 0
    then
      raise exception using errcode = 'P0001', message = 'invalid_video_payload';
    end if;
  end loop;

  return NEW;
end;
$function$;

drop function if exists public.update_video_position(text, integer, timestamptz);

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
  effective_updated_at timestamptz;
begin
  if p_position_ms is null or p_position_ms < 0 or p_client_updated_at is null then
    raise exception using errcode = 'P0001', message = 'invalid_position';
  end if;

  effective_updated_at := least(p_client_updated_at, clock_timestamp());

  update public.video_library
  set position_ms = p_position_ms, updated_at = effective_updated_at
  where user_id = (select auth.uid())
    and video_id = p_video_id
    and updated_at < effective_updated_at
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
