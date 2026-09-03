-- Superseded in later migrations; kept for history.
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
    values (p_date, 'rehearsal', v_start_time, 'held')
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

grant execute on function get_or_create_rehearsal(uuid, date) to anon;

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
  values (p_date, p_kind, p_title, p_start_time, 'held')
  returning * into v_session;

  foreach v_id in array (select array_agg(distinct x) from unnest(p_ensemble_ids) x)
  loop
    insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
    values (v_session.id, v_id, v_session.date, v_session.kind);
  end loop;

  return v_session;
end;
$$;

grant execute on function create_session(date, session_kind, text, time, uuid[]) to anon;

create or replace function set_session_ensembles(p_session_id uuid, p_ensemble_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_kind session_kind;
  v_date date;
begin
  if p_ensemble_ids is null or array_length(p_ensemble_ids, 1) is null then
    raise exception 'ensemble list required';
  end if;

  select kind, date into v_kind, v_date from sessions where id = p_session_id;
  if v_kind = 'rehearsal' then
    raise exception 'cannot change ensembles of a rehearsal session';
  end if;

  delete from session_ensembles
  where session_id = p_session_id
    and ensemble_id <> all (p_ensemble_ids);

  insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
  select p_session_id, x, v_date, v_kind
  from unnest(p_ensemble_ids) x
  on conflict (session_id, ensemble_id) do nothing;
end;
$$;

grant execute on function set_session_ensembles(uuid, uuid[]) to anon;

create or replace function session_roster(p_session_id uuid)
returns setof students
language sql
stable
set search_path = public
as $$
  select distinct s.*
  from students s
  join student_ensembles se on se.student_id = s.id
  join session_ensembles sese on sese.ensemble_id = se.ensemble_id
  join sessions sess on sess.id = sese.session_id
  where sese.session_id = p_session_id
    and se.joined_on <= sess.date
    and (se.terminated_on is null or se.terminated_on >= sess.date)
  order by s.last_name, s.first_name;
$$;

grant execute on function session_roster(uuid) to anon;
