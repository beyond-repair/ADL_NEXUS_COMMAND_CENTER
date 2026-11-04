create table if not exists defects (
  id text primary key,
  organization_id text not null,
  mission_id text not null,
  check_name text not null,
  detail text not null,
  status text not null check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists defects_mission_idx on defects (mission_id, status);
