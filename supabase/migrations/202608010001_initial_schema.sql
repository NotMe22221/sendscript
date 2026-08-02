create extension if not exists pgcrypto;

create type public.mission_status as enum (
  'DRAFT','ANALYZING','SOURCING','POLICY_REVIEW','AWAITING_APPROVAL','AUTHORIZED','PURCHASING','COMPLETED',
  'BLOCKED','REJECTED','FAILED','CANCELLED','EXPIRED'
);
create type public.approval_status as enum ('pending','approved','rejected');
create type public.transaction_status as enum ('pending','blocked','succeeded','failed','cancelled');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin','manager','member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft','active','archived')) default 'draft',
  source_text text not null,
  parsed_rules jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (organization_id, name, version)
);

create table public.approved_merchants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  domain text,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  source_prompt text not null,
  status public.mission_status not null default 'DRAFT',
  owner_id uuid references public.profiles(id),
  policy_id uuid references public.policies(id),
  locked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index missions_org_status_idx on public.missions (organization_id, status, created_at desc);

create table public.mission_requirements (
  mission_id uuid primary key references public.missions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requirements jsonb not null,
  model_name text,
  model_input jsonb,
  model_output jsonb,
  confidence numeric(4,3),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.offers (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  merchant text not null,
  seller text not null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  delivery_date date not null,
  approved_merchant boolean not null default false,
  seller_rating numeric(2,1) not null,
  return_days integer not null default 0,
  requirement_match numeric(4,3) not null,
  source text not null default 'controlled_catalog',
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.policy_evaluations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  offer_id text not null references public.offers(id),
  policy_id uuid references public.policies(id),
  compliant boolean not null,
  requires_approval boolean not null default false,
  violations jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (mission_id, offer_id)
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null unique references public.missions(id) on delete cascade,
  selected_offer_id text not null references public.offers(id),
  total_score numeric(5,2) not null,
  score_breakdown jsonb not null,
  explanation text not null,
  model_input jsonb,
  model_output jsonb,
  created_at timestamptz not null default now()
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  approver_id uuid references public.profiles(id),
  status public.approval_status not null default 'pending',
  note text,
  rejection_reason text,
  amount_cap_cents integer,
  safe_card_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.prava_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  session_id text unique,
  mandate_id text unique,
  response_id text,
  status text not null,
  merchant text not null,
  amount_cap_cents integer not null check (amount_cap_cents > 0),
  allowed_charges integer not null check (allowed_charges > 0),
  safe_card_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete restrict,
  authorization_id uuid references public.prava_authorizations(id),
  merchant text not null,
  amount_cents integer not null check (amount_cents >= 0),
  status public.transaction_status not null,
  idempotency_reference text not null,
  checkout_reference text,
  failure_code text,
  safe_prava_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_reference)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete restrict,
  event_type text not null,
  title text not null,
  detail text not null,
  actor_id uuid references public.profiles(id),
  actor_label text not null default 'SpendScript',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_events_mission_idx on public.activity_events (mission_id, created_at desc);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organization_id = target_org and m.user_id = auth.uid());
$$;

create or replace function public.is_org_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organization_id = target_org and m.user_id = auth.uid() and m.role = 'admin');
$$;

create or replace function public.is_org_manager(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organization_id = target_org and m.user_id = auth.uid() and m.role in ('admin','manager'));
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.policies enable row level security;
alter table public.approved_merchants enable row level security;
alter table public.missions enable row level security;
alter table public.mission_requirements enable row level security;
alter table public.offers enable row level security;
alter table public.policy_evaluations enable row level security;
alter table public.decisions enable row level security;
alter table public.approvals enable row level security;
alter table public.prava_authorizations enable row level security;
alter table public.transactions enable row level security;
alter table public.activity_events enable row level security;

create policy organizations_select on public.organizations for select using (public.is_org_member(id));
create policy profiles_self_or_coworker on public.profiles for select using (id = auth.uid() or exists(select 1 from public.memberships mine join public.memberships theirs on mine.organization_id = theirs.organization_id where mine.user_id = auth.uid() and theirs.user_id = profiles.id));
create policy memberships_select on public.memberships for select using (public.is_org_member(organization_id));
create policy memberships_admin_write on public.memberships for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy policies_select on public.policies for select using (public.is_org_member(organization_id));
create policy policies_admin_insert on public.policies for insert with check (public.is_org_admin(organization_id));
create policy policies_admin_update on public.policies for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy merchants_select on public.approved_merchants for select using (public.is_org_member(organization_id));
create policy merchants_admin_write on public.approved_merchants for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy missions_select on public.missions for select using (public.is_org_member(organization_id));
create policy missions_insert on public.missions for insert with check (public.is_org_member(organization_id) and (owner_id is null or owner_id = auth.uid()));
create policy missions_update on public.missions for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy requirements_all on public.mission_requirements for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy offers_select on public.offers for select using (public.is_org_member(organization_id));
create policy evaluations_select on public.policy_evaluations for select using (public.is_org_member(organization_id));
create policy evaluations_write on public.policy_evaluations for insert with check (public.is_org_member(organization_id));
create policy evaluations_update on public.policy_evaluations for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy decisions_select on public.decisions for select using (public.is_org_member(organization_id));
create policy decisions_write on public.decisions for insert with check (public.is_org_member(organization_id));
create policy approvals_select on public.approvals for select using (public.is_org_member(organization_id));
create policy approvals_write on public.approvals for insert with check (public.is_org_manager(organization_id));
create policy authorizations_select on public.prava_authorizations for select using (public.is_org_member(organization_id));
create policy transactions_select on public.transactions for select using (public.is_org_member(organization_id));
create policy events_select on public.activity_events for select using (public.is_org_member(organization_id));

create or replace function public.prevent_audit_mutation()
returns trigger language plpgsql as $$ begin raise exception 'AUDIT_EVENTS_ARE_IMMUTABLE'; end; $$;
create trigger activity_events_immutable before update or delete on public.activity_events for each row execute function public.prevent_audit_mutation();

create or replace function public.create_mission_with_requirements(
  p_organization_id uuid, p_title text, p_source_prompt text, p_requirements jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  if not public.is_org_member(p_organization_id) then raise exception 'ORG_ACCESS_REQUIRED'; end if;
  insert into public.missions (organization_id, title, source_prompt, status, owner_id)
  values (p_organization_id, p_title, p_source_prompt, 'ANALYZING', auth.uid()) returning id into new_id;
  insert into public.mission_requirements (mission_id, organization_id, requirements, confidence)
  values (new_id, p_organization_id, p_requirements, nullif(p_requirements->>'confidence','')::numeric);
  insert into public.activity_events (organization_id, mission_id, event_type, title, detail, actor_id, actor_label)
  values (p_organization_id, new_id, 'mission.created', 'Mission created', 'Natural-language request received and structured.', auth.uid(), 'Requester');
  return new_id;
end; $$;

create or replace function public.transition_mission(
  p_mission_id uuid, p_new_status public.mission_status, p_event_type text, p_title text, p_detail text
) returns public.missions language plpgsql security definer set search_path = '' as $$
declare current_row public.missions; allowed boolean := false;
begin
  select * into current_row from public.missions where id = p_mission_id for update;
  if current_row.id is null or not public.is_org_member(current_row.organization_id) then raise exception 'MISSION_ACCESS_REQUIRED'; end if;
  allowed := case current_row.status
    when 'DRAFT' then p_new_status = any(array['ANALYZING','CANCELLED']::public.mission_status[])
    when 'ANALYZING' then p_new_status = any(array['SOURCING','FAILED','CANCELLED']::public.mission_status[])
    when 'SOURCING' then p_new_status = any(array['POLICY_REVIEW','FAILED','CANCELLED']::public.mission_status[])
    when 'POLICY_REVIEW' then p_new_status = any(array['AWAITING_APPROVAL','BLOCKED','FAILED','CANCELLED']::public.mission_status[])
    when 'AWAITING_APPROVAL' then p_new_status = any(array['AUTHORIZED','REJECTED','EXPIRED','CANCELLED']::public.mission_status[])
    when 'AUTHORIZED' then p_new_status = any(array['PURCHASING','EXPIRED','CANCELLED']::public.mission_status[])
    when 'PURCHASING' then p_new_status = any(array['COMPLETED','BLOCKED','FAILED']::public.mission_status[])
    when 'BLOCKED' then p_new_status = any(array['AUTHORIZED','CANCELLED']::public.mission_status[])
    when 'FAILED' then p_new_status = any(array['ANALYZING','SOURCING','AUTHORIZED','CANCELLED']::public.mission_status[])
    when 'EXPIRED' then p_new_status = any(array['AWAITING_APPROVAL','CANCELLED']::public.mission_status[])
    else false end;
  if not allowed then raise exception 'INVALID_STATE_TRANSITION:%:%', current_row.status, p_new_status; end if;
  update public.missions set status = p_new_status, updated_at = now(), locked_at = case when p_new_status = 'PURCHASING' then now() else locked_at end where id = p_mission_id returning * into current_row;
  insert into public.activity_events (organization_id, mission_id, event_type, title, detail, actor_id, actor_label)
  values (current_row.organization_id, p_mission_id, p_event_type, p_title, p_detail, auth.uid(), coalesce((select full_name from public.profiles where id = auth.uid()), 'SpendScript'));
  return current_row;
end; $$;

revoke all on function public.create_mission_with_requirements(uuid,text,text,jsonb) from public;
grant execute on function public.create_mission_with_requirements(uuid,text,text,jsonb) to authenticated;
revoke all on function public.transition_mission(uuid,public.mission_status,text,text,text) from public;
grant execute on function public.transition_mission(uuid,public.mission_status,text,text,text) to authenticated;
