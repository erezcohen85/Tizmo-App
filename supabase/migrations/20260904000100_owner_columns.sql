alter table ensembles add column owner_id uuid references auth.users(id) on delete cascade;
alter table students add column owner_id uuid references auth.users(id) on delete cascade;
alter table sessions add column owner_id uuid references auth.users(id) on delete cascade;
alter table share_links add column owner_id uuid references auth.users(id) on delete cascade;

-- backfill: assign all pre-auth data to the first (owner) account
update ensembles set owner_id = '82678f94-4e29-4ac8-89b2-bb6ed064ad96';
update students set owner_id = '82678f94-4e29-4ac8-89b2-bb6ed064ad96';
update sessions set owner_id = '82678f94-4e29-4ac8-89b2-bb6ed064ad96';
update share_links set owner_id = '82678f94-4e29-4ac8-89b2-bb6ed064ad96';

alter table ensembles alter column owner_id set not null;
alter table students alter column owner_id set not null;
alter table sessions alter column owner_id set not null;
alter table share_links alter column owner_id set not null;

alter table ensembles alter column owner_id set default auth.uid();
alter table students alter column owner_id set default auth.uid();
alter table sessions alter column owner_id set default auth.uid();
alter table share_links alter column owner_id set default auth.uid();

create index ensembles_owner_id_idx on ensembles(owner_id);
create index students_owner_id_idx on students(owner_id);
create index sessions_owner_id_idx on sessions(owner_id);
create index share_links_owner_id_idx on share_links(owner_id);
