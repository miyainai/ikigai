begin;

create table public.reflection_maps (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0,
  reflections jsonb not null default '{"love":[],"ability":[],"meaning":[],"paid":[]}'::jsonb,
  insight_output jsonb,
  engine_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.reflection_maps enable row level security;
revoke all on public.reflection_maps from anon, authenticated;
grant select on public.reflection_maps to authenticated;
create policy "Read own map" on public.reflection_maps for select to authenticated
  using ((select auth.uid()) = user_id);

-- One atomic write stores the inputs and matching output. Compare-and-swap
-- prevents an old tab or delayed retry from overwriting a newer revision.
create function public.save_reflection_map(expected_revision bigint, new_reflections jsonb, new_output jsonb, new_engine_version text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint;
  field text;
  item jsonb;
  total integer := 0;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if expected_revision is null or expected_revision < 0 then raise exception 'Invalid revision'; end if;
  if new_engine_version is null or length(new_engine_version) > 80 then raise exception 'Invalid engine version'; end if;
  if jsonb_typeof(new_reflections) is distinct from 'object' or octet_length(new_reflections::text) > 1048576 then raise exception 'Invalid map'; end if;
  if new_reflections - array['love','ability','meaning','paid'] <> '{}'::jsonb then raise exception 'Unknown field'; end if;
  foreach field in array array['love','ability','meaning','paid'] loop
    if jsonb_typeof(new_reflections->field) is distinct from 'array' then raise exception 'Invalid field'; end if;
    total := total + jsonb_array_length(new_reflections->field);
    for item in select value from jsonb_array_elements(new_reflections->field) loop
      if jsonb_typeof(item) is distinct from 'object'
        or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 128
        or item->>'fieldId' is distinct from field
        or jsonb_typeof(item->'label') is distinct from 'string' or length(trim(item->>'label')) not between 1 and 40
        or (item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes') > 600))
        or jsonb_typeof(item->'createdAt') is distinct from 'number'
        or jsonb_typeof(item->'positionSeed') is distinct from 'number'
      then raise exception 'Invalid reflection'; end if;
    end loop;
  end loop;
  if total > 1000 then raise exception 'Map limit reached'; end if;
  if new_output is not null and (jsonb_typeof(new_output) <> 'object' or octet_length(new_output::text) > 2097152) then raise exception 'Invalid output'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select revision into current_revision from public.reflection_maps where user_id = owner_id;
  if coalesce(current_revision, 0) <> expected_revision then return null; end if;
  insert into public.reflection_maps(user_id, revision, reflections, insight_output, engine_version)
    values (owner_id, expected_revision + 1, new_reflections, case when total = 0 then null else new_output end, new_engine_version)
    on conflict (user_id) do update set revision = excluded.revision, reflections = excluded.reflections,
      insight_output = excluded.insight_output, engine_version = excluded.engine_version, updated_at = now();
  return expected_revision + 1;
end;
$$;
revoke all on function public.save_reflection_map(bigint,jsonb,jsonb,text) from public, anon;
grant execute on function public.save_reflection_map(bigint,jsonb,jsonb,text) to authenticated;
commit;
