begin;
create table public.results_email_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_hash text not null,
  created_at timestamptz not null default now()
);
create index on public.results_email_attempts(created_at);
alter table public.results_email_attempts enable row level security;
revoke all on public.results_email_attempts from anon, authenticated;

-- Called only by the server-side email function, never by a browser.
create function public.reserve_results_email(owner_id uuid, recipient_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare attempt_id uuid;
begin
  if owner_id is null or recipient_hash is null or recipient_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid request'; end if;
  -- A global lock keeps the global, recipient, and identity quotas atomic.
  perform pg_advisory_xact_lock(910260002);
  delete from public.results_email_attempts where created_at < now() - interval '1 day';
  if (select count(*) from public.results_email_attempts) >= 100
    or (select count(*) from public.results_email_attempts where user_id = owner_id) >= 3
    or (select count(*) from public.results_email_attempts a where a.recipient_hash = reserve_results_email.recipient_hash) >= 3
    or exists(select 1 from public.results_email_attempts where user_id = owner_id and created_at > now() - interval '2 minutes')
  then return null; end if;
  insert into public.results_email_attempts(user_id, recipient_hash) values(owner_id, recipient_hash) returning id into attempt_id;
  return attempt_id;
end;
$$;
revoke all on function public.reserve_results_email(uuid,text) from public, anon, authenticated;
grant execute on function public.reserve_results_email(uuid,text) to service_role;
commit;
