create or replace function public.is_org_admin(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organization_id = target_org and m.user_id = auth.uid() and m.role = 'admin');
$$;

create or replace function public.is_org_manager(target_org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m where m.organization_id = target_org and m.user_id = auth.uid() and m.role in ('admin','manager'));
$$;

drop policy if exists approvals_write on public.approvals;
create policy approvals_write on public.approvals for insert with check (public.is_org_manager(organization_id));

create table if not exists public.organization_integrations (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('openai','prava')),
  encrypted_credentials text not null,
  public_metadata jsonb not null default '{}'::jsonb,
  status text not null check (status in ('connected','disconnected','error')) default 'connected',
  last_tested_at timestamptz,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (organization_id, provider)
);

create table if not exists public.integration_audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null check (provider in ('openai','prava')),
  action text not null check (action in ('connected','updated','disconnected','test_failed')),
  actor_id uuid references public.profiles(id),
  detail text not null,
  created_at timestamptz not null default now()
);
create index if not exists integration_audit_org_idx on public.integration_audit_events (organization_id, created_at desc);

alter table public.organization_integrations enable row level security;
alter table public.integration_audit_events enable row level security;

-- Credential rows intentionally have no browser policy. Only the service-role
-- server client can read the ciphertext or call the write functions below.
revoke all on public.organization_integrations from anon, authenticated;
grant all on public.organization_integrations to service_role;

drop policy if exists integration_audit_select on public.integration_audit_events;
create policy integration_audit_select on public.integration_audit_events
  for select using (public.is_org_member(organization_id));
revoke insert, update, delete on public.integration_audit_events from anon, authenticated;
grant all on public.integration_audit_events to service_role;

drop trigger if exists integration_audit_immutable on public.integration_audit_events;
create trigger integration_audit_immutable
  before update or delete on public.integration_audit_events
  for each row execute function public.prevent_audit_mutation();

create or replace function public.upsert_organization_integration(
  p_organization_id uuid,
  p_provider text,
  p_encrypted_credentials text,
  p_public_metadata jsonb,
  p_actor_id uuid,
  p_detail text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  previous_exists boolean;
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_provider not in ('openai','prava') then raise exception 'INVALID_INTEGRATION_PROVIDER'; end if;
  select exists(
    select 1 from public.organization_integrations
    where organization_id = p_organization_id and provider = p_provider and status = 'connected'
  ) into previous_exists;

  insert into public.organization_integrations (
    organization_id, provider, encrypted_credentials, public_metadata, status,
    last_tested_at, updated_by, updated_at
  ) values (
    p_organization_id, p_provider, p_encrypted_credentials, p_public_metadata,
    'connected', now(), p_actor_id, now()
  )
  on conflict (organization_id, provider) do update set
    encrypted_credentials = excluded.encrypted_credentials,
    public_metadata = excluded.public_metadata,
    status = 'connected',
    last_tested_at = now(),
    updated_by = excluded.updated_by,
    updated_at = now();

  insert into public.integration_audit_events (
    organization_id, provider, action, actor_id, detail
  ) values (
    p_organization_id, p_provider,
    case when previous_exists then 'updated' else 'connected' end,
    p_actor_id, p_detail
  );
end; $$;

create or replace function public.disconnect_organization_integration(
  p_organization_id uuid,
  p_provider text,
  p_actor_id uuid
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if p_provider not in ('openai','prava') then raise exception 'INVALID_INTEGRATION_PROVIDER'; end if;

  insert into public.organization_integrations (
    organization_id, provider, encrypted_credentials, public_metadata, status,
    last_tested_at, updated_by, updated_at
  ) values (
    p_organization_id, p_provider, '', '{}'::jsonb, 'disconnected',
    now(), p_actor_id, now()
  )
  on conflict (organization_id, provider) do update set
    encrypted_credentials = '',
    public_metadata = '{}'::jsonb,
    status = 'disconnected',
    last_tested_at = now(),
    updated_by = excluded.updated_by,
    updated_at = now();

  insert into public.integration_audit_events (
    organization_id, provider, action, actor_id, detail
  ) values (
    p_organization_id, p_provider, 'disconnected', p_actor_id,
    case when p_provider = 'openai' then 'OpenAI connection removed.' else 'Prava sandbox connection removed.' end
  );
end; $$;

revoke all on function public.upsert_organization_integration(uuid,text,text,jsonb,uuid,text) from public;
grant execute on function public.upsert_organization_integration(uuid,text,text,jsonb,uuid,text) to service_role;
revoke all on function public.disconnect_organization_integration(uuid,text,uuid) from public;
grant execute on function public.disconnect_organization_integration(uuid,text,uuid) to service_role;
