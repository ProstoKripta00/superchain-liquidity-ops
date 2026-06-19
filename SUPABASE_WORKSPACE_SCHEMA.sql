-- Superchain Liquidity Ops workspace schema
-- Production target: Supabase Auth + Postgres + private Storage bucket.

create extension if not exists "pgcrypto";

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protocol text not null,
  website text,
  plan text not null default 'Pilot',
  status text not null default 'Prospect',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  name text not null,
  email text not null,
  role text not null check (role in ('client', 'operator', 'admin')),
  title text,
  created_at timestamptz not null default now()
);

create table public.report_requests (
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
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.report_requests(id) on delete set null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  status text not null default 'Draft',
  period text,
  summary text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  storage_path text not null,
  access text not null default 'Client visible',
  created_at timestamptz not null default now()
);

create table public.workspace_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  request_id uuid references public.report_requests(id) on delete set null,
  author_id uuid references public.profiles(id) on delete set null,
  visibility text not null default 'Client',
  body text not null,
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  label text not null,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.report_requests enable row level security;
alter table public.reports enable row level security;
alter table public.report_files enable row level security;
alter table public.workspace_messages enable row level security;
alter table public.audit_log enable row level security;

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

-- Operators and admins can manage the full workspace.
create policy "operators manage organizations"
on public.organizations
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

-- Clients can read their own organization.
create policy "clients read own organization"
on public.organizations
for select
using (id = public.current_profile_org());

create policy "profiles read own org"
on public.profiles
for select
using (
  id = auth.uid()
  or organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

create policy "request access"
on public.report_requests
for all
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
)
with check (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

create policy "report access"
on public.reports
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

create policy "operators manage reports"
on public.reports
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

create policy "file access"
on public.report_files
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

create policy "operators manage files"
on public.report_files
for all
using (public.current_profile_role() in ('operator', 'admin'))
with check (public.current_profile_role() in ('operator', 'admin'));

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

create policy "audit visible to operators"
on public.audit_log
for select
using (
  organization_id = public.current_profile_org()
  or public.current_profile_role() in ('operator', 'admin')
);

-- Create a private Supabase Storage bucket named:
-- report-files
-- Store file paths as: {organization_id}/{report_id}/{filename}
