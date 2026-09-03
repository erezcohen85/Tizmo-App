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
    order by created_at asc
    limit 1;

    if v_student_id is null then
      insert into students (first_name, last_name, instrument, grade)
      values (v_first, v_last, v_instrument, v_grade)
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

grant execute on function import_students(uuid, date, jsonb) to anon;
