-- NEXUS 2.0 milestone 1. Identity lives in 0001_auth.sql.
-- Rows are scoped by organization; membership is the only access path.

create table if not exists organizations (
  id text primary key,
  name text not null,
  owner_user_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id text primary key,
  organization_id text not null references organizations (id),
  user_id text not null,
  role text not null check (role in ('owner', 'operator', 'reviewer')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists service_identities (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into service_identities (id, name)
values ('svc:nexus-worker', 'NEXUS bounded worker')
on conflict (id) do nothing;

create table if not exists projects (
  id text primary key,
  organization_id text not null references organizations (id),
  name text not null,
  summary text not null default '',
  created_by text not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_org_idx on projects (organization_id, created_at desc);

create table if not exists tasks (
  id text primary key,
  organization_id text not null references organizations (id),
  project_id text not null references projects (id),
  objective text not null,
  scope_exclusions text not null default '',
  deliverable text not null default '',
  acceptance_criteria jsonb not null default '[]'::jsonb,
  require_review boolean not null default true,
  max_attempts integer not null default 3,
  attempt_baseline integer not null default 0,
  state text not null check (state in (
    'DRAFT',
    'READY',
    'AUTHORIZED',
    'RUNNING',
    'VALIDATING',
    'WAITING_FOR_APPROVAL',
    'RETRY_PENDING',
    'FAILED',
    'REJECTED',
    'COMPLETED',
    'CANCELLED'
  )),
  created_by text not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_idx on tasks (project_id, created_at desc);
create index if not exists tasks_org_state_idx on tasks (organization_id, state);

create table if not exists task_runs (
  id text primary key,
  task_id text not null references tasks (id),
  organization_id text not null,
  attempt integer not null,
  idempotency_key text not null unique,
  status text not null check (status in ('running', 'succeeded', 'failed', 'interrupted')),
  executor text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text
);

create index if not exists task_runs_task_idx on task_runs (task_id, attempt desc);

create table if not exists artifacts (
  id text primary key,
  organization_id text not null,
  project_id text not null,
  task_id text not null,
  run_id text not null references task_runs (id),
  kind text not null check (kind in ('deliverable', 'test_report')),
  media_type text not null,
  body text not null,
  sha256 text not null,
  byte_length integer not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  unique (run_id, kind)
);

create table if not exists test_results (
  id text primary key,
  run_id text not null references task_runs (id),
  organization_id text not null,
  name text not null,
  passed boolean not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists test_results_run_idx on test_results (run_id);

create table if not exists approvals (
  id text primary key,
  organization_id text not null,
  task_id text not null,
  run_id text not null unique references task_runs (id),
  decision text not null check (decision in ('approved', 'rejected')),
  decided_by text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id text primary key,
  organization_id text not null,
  project_id text,
  task_id text,
  actor_id text not null,
  actor_kind text not null check (actor_kind in ('human', 'service')),
  action text not null,
  target text not null,
  from_state text,
  to_state text,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_org_idx on audit_events (organization_id, created_at desc);
create index if not exists audit_task_idx on audit_events (task_id, created_at desc);
