drop function if exists bulk_create_rehearsals(uuid, date, date, int[]);

create or replace function bulk_create_rehearsals(
  p_ensemble_id uuid,
  p_from date,
  p_to date,
  p_weekdays int[],
  p_kind session_kind default 'rehearsal',
  p_title text default null
)
returns int
language plpgsql
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
        where se.ensemble_id = p_ensemble_id and se.session_date = v_current and se.session_kind = p_kind
      ) then
        insert into sessions (date, kind, title, start_time, status, owner_id)
        values (v_current, p_kind, p_title, v_start_time, 'scheduled', auth.uid())
        returning id into v_session_id;

        insert into session_ensembles (session_id, ensemble_id, session_date, session_kind)
        values (v_session_id, p_ensemble_id, v_current, p_kind);

        v_count := v_count + 1;
      end if;
    end if;
    v_current := v_current + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function bulk_create_rehearsals(uuid, date, date, int[], session_kind, text) to authenticated;
