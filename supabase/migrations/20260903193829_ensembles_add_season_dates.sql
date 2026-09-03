alter table ensembles
  add column season_start date,
  add column season_end date,
  add constraint ensembles_season_range_check
    check (season_end is null or season_start is null or season_end >= season_start);

update ensembles e
set season_start = r.min_date,
    season_end = r.max_date
from (
  select se.ensemble_id, min(se.session_date) as min_date, max(se.session_date) as max_date
  from session_ensembles se
  where se.session_kind = 'rehearsal'
  group by se.ensemble_id
) r
where r.ensemble_id = e.id;
