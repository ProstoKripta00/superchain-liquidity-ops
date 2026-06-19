-- Superchain Liquidity Ops workspace schema
-- Production target: Supabase Auth + Postgres + private Storage bucket.
-- Run this in the Supabase SQL editor for the project connected to the frontend env keys.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protocol text not null,
  website text,
  network_focus text[] not null default array['OP Mainnet'],
  plan text not null default 'Pilot',
  status text not null default 'Prospect',
  owner_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  email text not null,
  role text not null check (role in ('client', 'operator', 'admin')),
  title text,
  created_at timestamptz not null default now()
);

create table if not exists public.report_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  package_name text not null,
  status text not null default 'New',
  priority text not null default 'Normal',
  protocol text not null,
  network_scope text[] not null default '{}',
  market_scope text,
  budget text,
  deadline date,
  goal text,
  notes text,
  payment_status text not null default 'Unpaid',
  payment_method text not null default 'USDC',
  invoice_url text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.report_requests(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  status text not null default 'Draft',
  period text,
  summary text,
  metrics jsonb not null default '[]'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  size_label text not null default 'Uploaded file',
  storage_path text not null,
  access text not null default 'Client visible',
  created_at timestamptz not null default now()
);

create table if not exists public.workspace_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid references public.report_requests(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  visibility text not null default 'Client',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  label text not null,
  detail text,
  created_at timestamptz not null default now()
);

create table if not exists public.snapshot_runs (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null,
  status text not null default 'ok',
  degraded boolean not null default false,
  market_count integer not null default 0,
  protocol_count integer not null default 0,
  source_issue_count integer not null default 0,
  storage_path text not null,
  manifest jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.snapshot_protocol_scores (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.snapshot_runs(id) on delete cascade,
  protocol_id text not null,
  protocol_name text not null,
  status text not null,
  score integer not null,
  confidence integer not null,
  network_scope text[] not null default '{}',
  market_count integer not null default 0,
  volume_30d_usd numeric,
  fees_30d_usd numeric,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.report_requests enable row level security;
alter table public.reports enable row level security;
alter table public.report_files enable row level security;
alter table public.workspace_messages enable row level security;
alter table public.audit_log enable row level security;
alter table public.snapshot_runs enable row level security;
alter table public.snapshot_protocol_scores enable row level security;

alter table public.organizations
  add column if not exists network_focus text[] not null default array['OP Mainnet'],
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table public.report_requests
  add column if not exists payment_status text not null default 'Unpaid',
  add column if not exists payment_method text not null default 'USDC',
  add column if not exists invoice_url text not null default '';

alter table public.reports
  add column if not exists metrics jsonb not null default '[]'::jsonb;

alter table public.report_files
  add column if not exists size_label text not null default 'Uploaded file';

create index if not exists snapshot_runs_generated_at_idx
on public.snapshot_runs (generated_at desc);

create index if not exists snapshot_protocol_scores_run_id_idx
on public.snapshot_protocol_scores (run_id);

create index if not exists snapshot_protocol_scores_protocol_id_idx
on public.snapshot_protocol_scores (protocol_id);

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_org()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists report_requests_touch_updated_at on public.report_requests;
create trigger report_requests_touch_updated_at
before update on public.report_requests
for each row execute function public.touch_updated_at();

drop policy if exists "operators manage organizations" on public.organizations;
create policy "operators manage organizations"
on public.organizations
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

drop policy if exists "clients read own organization" on public.organizations;
create policy "clients read own organization"
on public.organizations
for select
using (id = public.current_profile_org());

drop policy if exists "profiles read visible users" on public.profiles;
create policy "profiles read visible users"
on public.profiles
for select
using (
  id = auth.uid()
  or organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "profiles self insert client" on public.profiles;
create policy "profiles self insert client"
on public.profiles
for insert
with check (id = auth.uid() and role = 'client');

drop policy if exists "operators manage profiles" on public.profiles;
create policy "operators manage profiles"
on public.profiles
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

drop policy if exists "request read access" on public.report_requests;
create policy "request read access"
on public.report_requests
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "request insert access" on public.report_requests;
create policy "request insert access"
on public.report_requests
for insert
with check (
  (organization_id = public.current_profile_org() and created_by = auth.uid())
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "operators update requests" on public.report_requests;
create policy "operators update requests"
on public.report_requests
for update
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

drop policy if exists "report read access" on public.reports;
create policy "report read access"
on public.reports
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "operators manage reports" on public.reports;
create policy "operators manage reports"
on public.reports
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

drop policy if exists "file read access" on public.report_files;
create policy "file read access"
on public.report_files
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "operators manage files" on public.report_files;
create policy "operators manage files"
on public.report_files
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

drop policy if exists "message access" on public.workspace_messages;
create policy "message access"
on public.workspace_messages
for all
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
)
with check (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "audit read access" on public.audit_log;
create policy "audit read access"
on public.audit_log
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "audit insert access" on public.audit_log;
create policy "audit insert access"
on public.audit_log
for insert
with check (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "snapshot read access" on public.snapshot_runs;
create policy "snapshot read access"
on public.snapshot_runs
for select
using (auth.role() = 'authenticated');

drop policy if exists "snapshot score read access" on public.snapshot_protocol_scores;
create policy "snapshot score read access"
on public.snapshot_protocol_scores
for select
using (auth.role() = 'authenticated');

insert into storage.buckets (id, name, public)
values ('report-files', 'report-files', false)
on conflict (id) do update set public = false;

drop policy if exists "report storage read access" on storage.objects;
create policy "report storage read access"
on storage.objects
for select
using (
  bucket_id = 'report-files'
  and (
    split_part(name, '/', 1) = public.current_profile_org()::text
    or public.current_profile_role() in ('operator', 'admin')
  )
);

drop policy if exists "operators upload report files" on storage.objects;
create policy "operators upload report files"
on storage.objects
for insert
with check (
  bucket_id = 'report-files'
  and public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "operators update report files" on storage.objects;
create policy "operators update report files"
on storage.objects
for update
using (
  bucket_id = 'report-files'
  and public.current_profile_role() in ('operator', 'admin')
)
with check (
  bucket_id = 'report-files'
  and public.current_profile_role() in ('operator', 'admin')
);

drop policy if exists "operators delete report files" on storage.objects;
create policy "operators delete report files"
on storage.objects
for delete
using (
  bucket_id = 'report-files'
  and public.current_profile_role() in ('operator', 'admin')
);

-- Bootstrap note:
-- 1. Create the first owner in Supabase Auth.
-- 2. Copy that user's auth.users.id.
-- 3. Insert one organization and one admin/operator profile with that id using the SQL editor.
--
-- Example:
-- with org as (
--   insert into public.organizations (name, protocol, website, network_focus, plan, status)
--   values (
--     'Superchain Liquidity Ops',
--     'Internal',
--     'https://prostokripta00.github.io/superchain-liquidity-ops/',
--     array['OP Mainnet', 'Base', 'Unichain', 'Mode', 'Zora'],
--     'Enterprise',
--     'Active'
--   )
--   returning id
-- )
-- insert into public.profiles (id, organization_id, name, email, role, title)
-- select
--   'PASTE_AUTH_USER_UUID_HERE'::uuid,
--   org.id,
--   'Workspace Admin',
--   'admin@example.com',
--   'admin',
--   'Platform owner'
-- from org;
