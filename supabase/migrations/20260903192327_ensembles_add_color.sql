alter table ensembles
  add column color text not null default '#0d9488'
  check (color ~ '^#[0-9a-fA-F]{6}$');
