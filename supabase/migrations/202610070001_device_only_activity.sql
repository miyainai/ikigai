begin;

-- Preserve existing maps, but stop old browser builds from uploading new content.
revoke execute on function public.save_reflection_map(bigint,jsonb,jsonb,text) from public, anon, authenticated;

create table public.activity_events (
  event_id uuid primary key,
  session_id uuid not null,
  action text not null check (action in ('exercise_started','field_opened','reflection_added','reflection_edited','reflection_deleted','field_cleared','map_cleared','results_viewed','pdf_generated')),
  field text check (field in ('love','ability','meaning','paid')),
  created_at timestamptz not null default now(),
  check ((action in ('field_opened','reflection_added','reflection_edited','reflection_deleted','field_cleared') and field is not null)
    or (action in ('exercise_started','map_cleared','results_viewed','pdf_generated') and field is null))
);
create index activity_events_time on public.activity_events(created_at);
create index activity_events_session_time on public.activity_events(session_id, created_at);
alter table public.activity_events enable row level security;
revoke all on public.activity_events from anon, authenticated;

create function public.record_activity(p_event_id uuid, p_session_id uuid, p_action text, p_field text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  -- Serialize limits to avoid parallel requests exceeding the daily cap.
  perform pg_advisory_xact_lock(70100701);
  if exists(select 1 from public.activity_events where event_id = p_event_id) then return true; end if;
  if (select count(*) from public.activity_events where created_at > now() - interval '1 day') >= 10000
    or (select count(*) from public.activity_events where session_id = p_session_id and created_at > now() - interval '1 day') >= 300
    or (select count(*) from public.activity_events where session_id = p_session_id and created_at > now() - interval '1 minute') >= 30
    then return false; end if;
  insert into public.activity_events(event_id, session_id, action, field)
    values (p_event_id, p_session_id, p_action, p_field);
  return true;
end;
$$;
revoke all on function public.record_activity(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.record_activity(uuid,uuid,text,text) to service_role;

create view public.activity_daily as
  select (created_at at time zone 'UTC')::date as day, action, field,
    count(*) as events, count(distinct session_id) as sessions
  from public.activity_events group by 1,2,3;
revoke all on public.activity_daily from anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('locus-activity-retention', '31 * * * *',
  $$delete from public.activity_events where created_at < now() - interval '30 days'$$);
commit;
