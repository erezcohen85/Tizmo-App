create table ensemble_weekdays (
  ensemble_id uuid not null references ensembles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  primary key (ensemble_id, weekday)
);

insert into ensemble_weekdays (ensemble_id, weekday)
select id, weekly_day from ensembles;

alter table ensembles drop column weekly_day;

alter table ensemble_weekdays enable row level security;

create policy "anon select" on ensemble_weekdays for select to anon using (true);
create policy "anon insert" on ensemble_weekdays for insert to anon with check (true);
create policy "anon update" on ensemble_weekdays for update to anon using (true) with check (true);
create policy "anon delete" on ensemble_weekdays for delete to anon using (true);
comment on policy "anon select" on ensemble_weekdays is 'TEMP: tighten to auth.uid() when multi-user auth added.';
comment on policy "anon insert" on ensemble_weekdays is 'TEMP: tighten to auth.uid() when multi-user auth added.';
comment on policy "anon update" on ensemble_weekdays is 'TEMP: tighten to auth.uid() when multi-user auth added.';
comment on policy "anon delete" on ensemble_weekdays is 'TEMP: tighten to auth.uid() when multi-user auth added.';

create index on ensemble_weekdays (ensemble_id);

create or replace function set_ensemble_weekdays(p_ensemble_id uuid, p_weekdays int[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_weekdays is null or array_length(p_weekdays, 1) is null then
    raise exception 'at least one weekday required';
  end if;
  delete from ensemble_weekdays where ensemble_id = p_ensemble_id and weekday <> all(p_weekdays);
  insert into ensemble_weekdays (ensemble_id, weekday)
  select p_ensemble_id, w from unnest(p_weekdays) w
  on conflict (ensemble_id, weekday) do nothing;
end;
$$;

grant execute on function set_ensemble_weekdays(uuid, int[]) to anon;

-- bulk_create_rehearsals is redefined in a later migration (scheduled status).
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
        values (v_date, 'rehearsal', v_start_time, 'held')
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

grant execute on function bulk_create_rehearsals(uuid, date, date, int[]) to anon;
