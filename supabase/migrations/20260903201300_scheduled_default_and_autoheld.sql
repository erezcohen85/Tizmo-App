alter table sessions alter column status set default 'scheduled';

-- Sessions with no attendance recorded and not canceled go back to 'scheduled'.
update sessions s
set status = 'scheduled'
where s.status = 'held'
  and not exists (select 1 from attendance a where a.session_id = s.id);

-- Taking attendance promotes a scheduled session to 'held'.
create or replace function attendance_marks_session_held()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update sessions
  set status = 'held'
  where id = new.session_id and status = 'scheduled';
  return new;
end;
$$;

drop trigger if exists attendance_sets_session_held on attendance;
create trigger attendance_sets_session_held
  after insert or update on attendance
  for each row execute function attendance_marks_session_held();

create or replace function bulk_create_rehearsals(
  p_ensemble_id uuid,
  p_from date,
  p_to date,
  p_weekdays int[]
)
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_date date;
  v_start_time time;
  v_created int := 0;
  v_session_id uuid;
  v_exists boolean;
begin
  if p_to < p_from then
    raise exception 'p_to must be on or after p_from';
  end if;
  if p_to - p_from > 730 then
    raise exception 'range too large (max 730 days)';
  end if;

  select start_time into v_start_time from ensembles where id = p_ensemble_id;

  v_date := p_from;
  while v_date <= p_to loop
    if extract(dow from v_date)::int = any(p_weekdays) then
      select exists(
        select 1 from session_ensembles
        where ensemble_id = p_ensemble_id and session_date = v_date and session_kind = 'rehearsal'
      ) into v_exists;

      if not v_exists then
        insert into sessions (date, kind, start_time, status)
        values (v_date, 'rehearsal', v_start_time, 'scheduled')
        returning id into v_session_id;

        insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
        values (v_session_id, p_ensemble_id, v_date, 'rehearsal');

        v_created := v_created + 1;
      end if;
    end if;
    v_date := v_date + 1;
  end loop;

  return v_created;
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
  select s.* into v_session
  from sessions s
  join session_ensembles se on se.session_id = s.id
  where se.ensemble_id = p_ensemble_id
    and se.session_date = p_date
    and se.session_kind = 'rehearsal';

  if found then
    return v_session;
  end if;

  select start_time into v_start_time from ensembles where id = p_ensemble_id;

  begin
    insert into sessions (date, kind, start_time, status)
    values (p_date, 'rehearsal', v_start_time, 'scheduled')
    returning * into v_session;

    insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
    values (v_session.id, p_ensemble_id, v_session.date, v_session.kind);

    return v_session;
  exception when unique_violation then
    select s.* into v_session
    from sessions s
    join session_ensembles se on se.session_id = s.id
    where se.ensemble_id = p_ensemble_id
      and se.session_date = p_date
      and se.session_kind = 'rehearsal';
    return v_session;
  end;
end;
$$;

create or replace function create_session(
  p_date date,
  p_kind session_kind,
  p_title text,
  p_start_time time,
  p_ensemble_ids uuid[]
)
returns sessions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session sessions;
  v_id uuid;
begin
  if p_ensemble_ids is null or array_length(p_ensemble_ids, 1) is null then
    raise exception 'ensemble list required';
  end if;
  if p_kind = 'rehearsal' then
    raise exception 'use get_or_create_rehearsal for kind rehearsal';
  end if;

  insert into sessions (date, kind, title, start_time, status)
  values (p_date, p_kind, p_title, p_start_time, 'scheduled')
  returning * into v_session;

  foreach v_id in array (select array_agg(distinct x) from unnest(p_ensemble_ids) x)
  loop
    insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
    values (v_session.id, v_id, v_session.date, v_session.kind);
  end loop;

  return v_session;
end;
$$;
