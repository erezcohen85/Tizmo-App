create extension if not exists pgcrypto with schema extensions;
create extension if not exists moddatetime with schema extensions;

create type session_kind as enum ('rehearsal','special_rehearsal','field_trip','exam','concert','other');
create type session_status as enum ('held','canceled');
create type cancel_reason as enum ('holiday','sickness','other');
create type attendance_status as enum ('present','absent','late','excused');
create type share_scope as enum ('all','single_ensemble');

create table ensembles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  weekly_day int not null check (weekly_day between 0 and 6),
  start_time time not null,
  duration_minutes int not null check (duration_minutes > 0),
  location text,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  instrument text,
  grade text,
  created_at timestamptz not null default now()
);

create table student_ensembles (
  student_id uuid not null references students(id) on delete cascade,
  ensemble_id uuid not null references ensembles(id) on delete cascade,
  joined_on date not null,
  terminated_on date,
  primary key (student_id, ensemble_id),
  check (terminated_on is null or terminated_on >= joined_on)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time,
  kind session_kind not null,
  title text,
  status session_status not null default 'held',
  cancel_reason cancel_reason,
  cancel_note text,
  rehearsal_note text,
  created_at timestamptz not null default now(),
  check ((status = 'canceled') or (cancel_reason is null and cancel_note is null)),
  check ((status <> 'canceled') or (cancel_reason is not null)),
  unique (id, date, kind)
);

create table session_ensembles (
  session_id uuid not null,
  ensemble_id uuid not null references ensembles(id) on delete cascade,
  session_date date not null,
  session_kind session_kind not null,
  primary key (session_id, ensemble_id),
  foreign key (session_id, session_date, session_kind)
    references sessions(id, date, kind) on delete cascade on update cascade
);

create unique index uq_rehearsal_per_ensemble_day
  on session_ensembles (ensemble_id, session_date)
  where session_kind = 'rehearsal';

create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status attendance_status not null,
  note text,
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create trigger attendance_set_updated_at
  before update on attendance
  for each row execute function extensions.moddatetime(updated_at);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  scope share_scope not null,
  ensemble_id uuid references ensembles(id) on delete cascade,
  label text,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  check ((scope = 'single_ensemble') = (ensemble_id is not null))
);

create index on student_ensembles (ensemble_id);
create index on session_ensembles (ensemble_id, session_date);
create index on sessions (date);
create index on attendance (student_id);
create index on attendance (session_id);
