create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  terms_version text,
  terms_accepted_at timestamptz,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "own profile select" on profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create function handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, terms_version, terms_accepted_at, marketing_opt_in, marketing_opt_in_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'terms_version',
    case when new.raw_user_meta_data->>'terms_version' is not null then now() end,
    coalesce((new.raw_user_meta_data->>'marketing_opt_in')::boolean, false),
    case when (new.raw_user_meta_data->>'marketing_opt_in')::boolean then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();
