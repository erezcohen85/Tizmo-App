alter table ensembles add column sort_order int not null default 0;

with ordered as (
  select id, row_number() over (order by name) as rn
  from ensembles
)
update ensembles e
set sort_order = ordered.rn
from ordered
where ordered.id = e.id;
