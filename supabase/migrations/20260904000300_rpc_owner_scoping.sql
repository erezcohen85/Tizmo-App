create or replace function import_students(p_ensemble_id uuid, p_joined_on date, p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  r jsonb;
  v_first text;
  v_last text;
  v_instrument text;
  v_grade text;
  v_student_id uuid;
  v_inserted int := 0;
  v_linked int := 0;
  v_skipped int := 0;
  v_invalid int := 0;
  v_inserted_ids uuid[] := '{}';
  v_linked_ids uuid[] := '{}';
begin
  if not exists (select 1 from ensembles where id = p_ensemble_id and owner_id = auth.uid()) then
    raise exception 'ensemble not found';
  end if;

  for r in select * from jsonb_array_elements(p_rows)
  loop
    v_first := nullif(trim(r->>'first_name'), '');
    v_last := nullif(trim(r->>'last_name'), '');
    v_instrument := nullif(trim(r->>'instrument'), '');
    v_grade := nullif(trim(r->>'grade'), '');

    if v_first is null or v_last is null then
      v_invalid := v_invalid + 1;
      continue;
    end if;

    select id into v_student_id
    from students
    where lower(trim(first_name)) = lower(v_first)
      and lower(trim(last_name)) = lower(v_last)
      and owner_id = auth.uid()
    order by created_at asc
    limit 1;

    if v_student_id is null then
      insert into students (first_name, last_name, instrument, grade, owner_id)
      values (v_first, v_last, v_instrument, v_grade, auth.uid())
      returning id into v_student_id;

      insert into student_ensembles (student_id, ensemble_id, joined_on)
      values (v_student_id, p_ensemble_id, p_joined_on);

      v_inserted := v_inserted + 1;
      v_inserted_ids := array_append(v_inserted_ids, v_student_id);
    else
      if exists (select 1 from student_ensembles where student_id = v_student_id and ensemble_id = p_ensemble_id) then
        v_skipped := v_skipped + 1;
      else
        insert into student_ensembles (student_id, ensemble_id, joined_on)
        values (v_student_id, p_ensemble_id, p_joined_on);
        v_linked := v_linked + 1;
        v_linked_ids := array_append(v_linked_ids, v_student_id);
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'linked', v_linked,
    'skipped', v_skipped,
    'invalid', v_invalid,
    'inserted_ids', to_jsonb(v_inserted_ids),
    'linked_ids', to_jsonb(v_linked_ids)
  );
end;
$$;

create or replace function get_or_create_rehearsal(p_ensemble_id uuid, p_date date)
returns sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session sessions;
  v_start_time time;
begin
  if not exists (select 1 from ensembles where id = p_ensemble_id and owner_id = auth.uid()) then
    raise exception 'ensemble not found';
  end if;

  select s.* into v_session
  from sessions s
  join session_ensembles se on se.session_id = s.id
  where se.ensemble_id = p_ensemble_id and se.session_date = p_date and se.session_kind = 'rehearsal';

  if found then
    return v_session;
  end if;

  select start_time into v_start_time from ensembles where id = p_ensemble_id;

  begin
    insert into sessions (date, kind, start_time, status, owner_id)
    values (p_date, 'rehearsal', v_start_time, 'scheduled', auth.uid())
    returning * into v_session;

    insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
    values (v_session.id, p_ensemble_id, p_date, 'rehearsal');

    return v_session;
  exception when unique_violation then
    select s.* into v_session
    from sessions s
    join session_ensembles se on se.session_id = s.id
    where se.ensemble_id = p_ensemble_id and se.session_date = p_date and se.session_kind = 'rehearsal';
    return v_session;
  end;
end;
$$;

create or replace function create_session(p_date date, p_kind session_kind, p_title text, p_start_time time, p_ensemble_ids uuid[])
returns sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session sessions;
  v_ensemble_id uuid;
begin
  if p_ensemble_ids is null or array_length(p_ensemble_ids, 1) is null then
    raise exception 'at least one ensemble is required';
  end if;
  if p_kind = 'rehearsal' then
    raise exception 'use get_or_create_rehearsal for rehearsals';
  end if;
  if exists (
    select 1 from unnest(p_ensemble_ids) eid
    where not exists (select 1 from ensembles where id = eid and owner_id = auth.uid())
  ) then
    raise exception 'ensemble not found';
  end if;

  insert into sessions (date, kind, title, start_time, status, owner_id)
  values (p_date, p_kind, p_title, p_start_time, 'scheduled', auth.uid())
  returning * into v_session;

  foreach v_ensemble_id in array p_ensemble_ids
  loop
    insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
    values (v_session.id, v_ensemble_id, p_date, p_kind);
  end loop;

  return v_session;
end;
$$;

create or replace function bulk_create_rehearsals(p_ensemble_id uuid, p_from date, p_to date, p_weekdays int[])
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_start_time time;
  v_current date;
  v_count int := 0;
  v_session_id uuid;
begin
  if not exists (select 1 from ensembles where id = p_ensemble_id and owner_id = auth.uid()) then
    raise exception 'ensemble not found';
  end if;
  if p_to < p_from then
    raise exception 'p_to must be >= p_from';
  end if;
  if p_to - p_from > 730 then
    raise exception 'range too large';
  end if;

  select start_time into v_start_time from ensembles where id = p_ensemble_id;

  v_current := p_from;
  while v_current <= p_to loop
    if extract(dow from v_current)::int = any(p_weekdays) then
      if not exists (
        select 1 from session_ensembles se
        where se.ensemble_id = p_ensemble_id and se.session_date = v_current and se.session_kind = 'rehearsal'
      ) then
        insert into sessions (date, kind, start_time, status, owner_id)
        values (v_current, 'rehearsal', v_start_time, 'scheduled', auth.uid())
        returning id into v_session_id;

        insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
        values (v_session_id, p_ensemble_id, v_current, 'rehearsal');

        v_count := v_count + 1;
      end if;
    end if;
    v_current := v_current + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function set_session_ensembles(p_session_id uuid, p_ensemble_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session sessions;
  v_ensemble_id uuid;
begin
  select * into v_session from sessions where id = p_session_id and owner_id = auth.uid();
  if not found then
    raise exception 'session not found';
  end if;
  if v_session.kind = 'rehearsal' then
    raise exception 'cannot set ensembles on a rehearsal';
  end if;
  if exists (
    select 1 from unnest(p_ensemble_ids) eid
    where not exists (select 1 from ensembles where id = eid and owner_id = auth.uid())
  ) then
    raise exception 'ensemble not found';
  end if;

  delete from session_ensembles where session_id = p_session_id;

  foreach v_ensemble_id in array p_ensemble_ids
  loop
    insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
    values (p_session_id, v_ensemble_id, v_session.date, v_session.kind);
  end loop;
end;
$$;

create or replace function set_ensemble_weekdays(p_ensemble_id uuid, p_weekdays int[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from ensembles where id = p_ensemble_id and owner_id = auth.uid()) then
    raise exception 'ensemble not found';
  end if;

  delete from ensemble_weekdays where ensemble_id = p_ensemble_id;
  insert into ensemble_weekdays (ensemble_id, weekday)
  select p_ensemble_id, w from unnest(p_weekdays) w;
end;
$$;
