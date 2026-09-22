-- Keep authenticated RPC callers from writing malformed library rows.

create or replace function public.validate_video_library_row()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  segment jsonb;
begin
  if NEW.video_id !~ '^[A-Za-z0-9_-]{11}$'
    or NEW.url !~* '^https?://(www\.)?youtube\.com/(watch\?|shorts/)|^https?://youtu\.be/'
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

drop trigger if exists validate_video_library_payload on public.video_library;
create trigger validate_video_library_payload
before insert or update on public.video_library
for each row execute function public.validate_video_library_row();
