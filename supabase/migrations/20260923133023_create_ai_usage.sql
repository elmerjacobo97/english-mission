create table if not exists public.ai_usage (
  user_id uuid primary key references auth.users(id) on delete cascade,
  usage_day date not null,
  successful_responses smallint not null default 0
    check (successful_responses between 0 and 50)
);

alter table public.ai_usage enable row level security;

drop policy if exists "ai usage select own" on public.ai_usage;
create policy "ai usage select own" on public.ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.ai_usage from public, anon, authenticated;
grant select on table public.ai_usage to authenticated;

create or replace function public.record_ai_response()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := (select auth.uid());
  recorded boolean;
begin
  if current_user_id is null then
    return false;
  end if;

  insert into public.ai_usage (user_id, usage_day, successful_responses)
  values (current_user_id, (now() at time zone 'utc')::date, 1)
  on conflict (user_id)
  do update set
    usage_day = excluded.usage_day,
    successful_responses = case
      when public.ai_usage.usage_day = excluded.usage_day
        then public.ai_usage.successful_responses + 1
      else 1
    end
  where public.ai_usage.usage_day <> excluded.usage_day
    or public.ai_usage.successful_responses < 50
  returning true into recorded;

  return coalesce(recorded, false);
end;
$function$;

revoke execute on function public.record_ai_response() from public, anon;
grant execute on function public.record_ai_response() to authenticated;
