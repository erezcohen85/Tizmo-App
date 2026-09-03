alter table ensembles enable row level security;
alter table students enable row level security;
alter table student_ensembles enable row level security;
alter table sessions enable row level security;
alter table session_ensembles enable row level security;
alter table attendance enable row level security;
alter table share_links enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['ensembles','students','student_ensembles','sessions','session_ensembles','attendance']
  loop
    execute format('create policy "anon select" on %I for select to anon using (true)', t);
    execute format('create policy "anon insert" on %I for insert to anon with check (true)', t);
    execute format('create policy "anon update" on %I for update to anon using (true) with check (true)', t);
    execute format('create policy "anon delete" on %I for delete to anon using (true)', t);
    execute format('comment on policy "anon select" on %I is %L', t, 'TEMP: tighten to auth.uid() when multi-user auth added.');
    execute format('comment on policy "anon insert" on %I is %L', t, 'TEMP: tighten to auth.uid() when multi-user auth added.');
    execute format('comment on policy "anon update" on %I is %L', t, 'TEMP: tighten to auth.uid() when multi-user auth added.');
    execute format('comment on policy "anon delete" on %I is %L', t, 'TEMP: tighten to auth.uid() when multi-user auth added.');
  end loop;
end $$;

revoke all on share_links from anon, authenticated;
