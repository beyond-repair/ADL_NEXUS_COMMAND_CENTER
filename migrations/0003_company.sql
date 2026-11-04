-- NEXUS company layer. Missions, departments, and the workforce.
-- Scoped by organization. Membership is the only access path.

create table if not exists departments (
  id text primary key,
  organization_id text not null references organizations (id),
  slug text not null,
  name text not null,
  mandate text not null,
  unique (organization_id, slug)
);

create table if not exists agents (
  id text primary key,
  organization_id text not null references organizations (id),
  department_id text not null references departments (id),
  slug text not null,
  name text not null,
  title text not null,
  responsibility text not null,
  reports_to text,
  permission_level integer not null check (permission_level between 0 and 4),
  unique (organization_id, slug)
);

create table if not exists missions (
  id text primary key,
  organization_id text not null references organizations (id),
  title text not null,
  objective text not null,
  status text not null check (status in (
    'PROPOSED',
    'PLANNED',
    'AUTHORIZED',
    'EXECUTING',
    'AWAITING_ACCEPTANCE',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED'
  )),
  strategy text not null default '',
  questions jsonb not null default '[]'::jsonb,
  plan_source text not null default '',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missions_org_idx on missions (organization_id, created_at desc);

create table if not exists assignments (
  id text primary key,
  mission_id text not null references missions (id),
  organization_id text not null,
  agent_slug text not null,
  department_slug text not null,
  title text not null,
  brief text not null,
  position integer not null,
  status text not null check (status in ('QUEUED', 'READY', 'RUNNING', 'DONE', 'FAILED')),
  artifact text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  model text not null default '',
  error text not null default '',
  updated_at timestamptz not null default now(),
  unique (mission_id, position)
);

create index if not exists assignments_mission_idx on assignments (mission_id, position);

create table if not exists knowledge_entries (
  id text primary key,
  organization_id text not null,
  mission_id text,
  kind text not null check (kind in ('decision', 'finding', 'standard')),
  title text not null,
  body text not null,
  source text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_org_idx on knowledge_entries (organization_id, created_at desc);
