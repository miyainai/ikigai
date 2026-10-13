begin;

-- Approved removal of historical personal content; keep content-free analytics.
revoke execute on function public.save_reflection_map(bigint,jsonb,jsonb,text) from public, anon, authenticated;
revoke all on public.reflection_maps from public, anon, authenticated;
delete from public.reflection_maps;

commit;
