-- drop old anon-only policies
do $$
declare
  t text;
begin
  foreach t in array array['ensembles','students','student_ensembles','sessions','session_ensembles','attendance','ensemble_weekdays']
  loop
    execute format('drop policy if exists "anon select" on %I', t);
    execute format('drop policy if exists "anon insert" on %I', t);
    execute format('drop policy if exists "anon update" on %I', t);
    execute format('drop policy if exists "anon delete" on %I', t);
  end loop;
end $$;

revoke all on ensembles, students, student_ensembles, sessions, session_ensembles, attendance, ensemble_weekdays, share_links from anon;

-- root tables: owner_id = auth.uid()
create policy "owner select" on ensembles for select to authenticated using (owner_id = auth.uid());
create policy "owner insert" on ensembles for insert to authenticated with check (owner_id = auth.uid());
create policy "owner update" on ensembles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete" on ensembles for delete to authenticated using (owner_id = auth.uid());

create policy "owner select" on students for select to authenticated using (owner_id = auth.uid());
create policy "owner insert" on students for insert to authenticated with check (owner_id = auth.uid());
create policy "owner update" on students for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete" on students for delete to authenticated using (owner_id = auth.uid());

create policy "owner select" on sessions for select to authenticated using (owner_id = auth.uid());
create policy "owner insert" on sessions for insert to authenticated with check (owner_id = auth.uid());
create policy "owner update" on sessions for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete" on sessions for delete to authenticated using (owner_id = auth.uid());

create policy "owner select" on share_links for select to authenticated using (owner_id = auth.uid());
create policy "owner insert" on share_links for insert to authenticated with check (owner_id = auth.uid());
create policy "owner update" on share_links for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner delete" on share_links for delete to authenticated using (owner_id = auth.uid());

-- child tables: scope via parent(s)
create policy "owner select" on student_ensembles for select to authenticated using (
  exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
);
create policy "owner insert" on student_ensembles for insert to authenticated with check (
  exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
  and exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner update" on student_ensembles for update to authenticated using (
  exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
) with check (
  exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
  and exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner delete" on student_ensembles for delete to authenticated using (
  exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
);

create policy "owner select" on session_ensembles for select to authenticated using (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
);
create policy "owner insert" on session_ensembles for insert to authenticated with check (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
  and exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner update" on session_ensembles for update to authenticated using (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
) with check (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
  and exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner delete" on session_ensembles for delete to authenticated using (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
);

create policy "owner select" on attendance for select to authenticated using (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
);
create policy "owner insert" on attendance for insert to authenticated with check (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
  and exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
);
create policy "owner update" on attendance for update to authenticated using (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
) with check (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
  and exists (select 1 from students s where s.id = student_id and s.owner_id = auth.uid())
);
create policy "owner delete" on attendance for delete to authenticated using (
  exists (select 1 from sessions ss where ss.id = session_id and ss.owner_id = auth.uid())
);

create policy "owner select" on ensemble_weekdays for select to authenticated using (
  exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner insert" on ensemble_weekdays for insert to authenticated with check (
  exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner update" on ensemble_weekdays for update to authenticated using (
  exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
) with check (
  exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);
create policy "owner delete" on ensemble_weekdays for delete to authenticated using (
  exists (select 1 from ensembles e where e.id = ensemble_id and e.owner_id = auth.uid())
);

-- RPC grants
revoke execute on function get_or_create_rehearsal(uuid, date) from anon;
revoke execute on function create_session(date, session_kind, text, time, uuid[]) from anon;
revoke execute on function bulk_create_rehearsals(uuid, date, date, int[]) from anon;
revoke execute on function set_session_ensembles(uuid, uuid[]) from anon;
revoke execute on function session_roster(uuid) from anon;
revoke execute on function import_students(uuid, date, jsonb) from anon;
revoke execute on function set_ensemble_weekdays(uuid, int[]) from anon;

grant execute on function get_or_create_rehearsal(uuid, date) to authenticated;
grant execute on function create_session(date, session_kind, text, time, uuid[]) to authenticated;
grant execute on function bulk_create_rehearsals(uuid, date, date, int[]) to authenticated;
grant execute on function set_session_ensembles(uuid, uuid[]) to authenticated;
grant execute on function session_roster(uuid) to authenticated;
grant execute on function import_students(uuid, date, jsonb) to authenticated;
grant execute on function set_ensemble_weekdays(uuid, int[]) to authenticated;
