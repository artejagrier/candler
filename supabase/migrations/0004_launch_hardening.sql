-- Additive launch-hardening migration. Do not modify 0003 after application.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users on delete cascade,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recovery_code_sets add column if not exists total_count integer not null default 0 check(total_count >= 0);
alter table public.cloud_folders add column if not exists previous_parent_id uuid references public.cloud_folders on delete set null;
alter table public.cloud_files add column if not exists previous_folder_id uuid references public.cloud_folders on delete set null;
alter table public.cloud_files add column if not exists relative_path text;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table if not exists public.cloud_upload_authorizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  file_id uuid not null unique,
  size_bytes bigint not null check(size_bytes >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.cloud_upload_authorizations enable row level security;
create policy upload_authorization_access on public.cloud_upload_authorizations for all to authenticated
  using(public.is_workspace_member(workspace_id) and owner_id = auth.uid())
  with check(public.is_workspace_member(workspace_id) and owner_id = auth.uid());
create index if not exists upload_rate_idx on public.cloud_upload_authorizations(owner_id, created_at desc);

alter table public.subscriptions add column if not exists stripe_price_id text;
alter table public.subscriptions add column if not exists entitlement_pro boolean not null default false;
alter table public.subscriptions add column if not exists cloud_plan text not null default 'free' check(cloud_plan in ('free','cloud500','cloud1tb'));

create table if not exists public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.agent_conversations on delete cascade,
  workspace_id uuid not null references public.workspaces on delete cascade,
  owner_id uuid not null references auth.users on delete cascade,
  role text not null check(role in ('user','assistant')),
  safe_content text not null,
  created_at timestamptz not null default now()
);
alter table public.agent_messages enable row level security;
create policy agent_message_access on public.agent_messages for all to authenticated
  using(public.is_workspace_member(workspace_id) and owner_id = auth.uid())
  with check(public.is_workspace_member(workspace_id) and owner_id = auth.uid());

alter table public.user_preferences enable row level security;
create policy preferences_access on public.user_preferences for all to authenticated
  using(user_id = auth.uid()) with check(user_id = auth.uid());

-- The webhook ledger is service-role only. No authenticated policy is created.
alter table public.stripe_webhook_events enable row level security;

create index if not exists folders_workspace_deleted_idx on public.cloud_folders(workspace_id, deleted_at);
create index if not exists secrets_health_idx on public.secrets(workspace_id, project_id, environment_id, service_id, name);
