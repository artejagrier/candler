-- Versioned legal consent. Additive. Do not rewrite prior migrations.
-- Writes are service-role only. Authenticated users may read their own rows.

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  terms_version text not null,
  privacy_version text not null,
  aup_version text,
  consent_source text not null default 'signup'
    check (consent_source in ('signup', 'reconsent')),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists legal_consents_user_versions_uidx
  on public.legal_consents (user_id, terms_version, privacy_version);

create index if not exists legal_consents_user_accepted_idx
  on public.legal_consents (user_id, accepted_at desc);

comment on table public.legal_consents is
  'Append-only legal acceptance history. accepted_at is server time. No IP or user-agent.';
comment on column public.legal_consents.consent_source is
  'signup or reconsent. Historical rows are immutable.';

alter table public.legal_consents enable row level security;

drop policy if exists legal_consents_select_own on public.legal_consents;
create policy legal_consents_select_own
  on public.legal_consents
  for select
  to authenticated
  using (user_id = auth.uid());

-- No insert / update / delete policies for authenticated or anon.
-- Trusted server actions persist rows with the service role.

revoke all on table public.legal_consents from anon;
revoke insert, update, delete on table public.legal_consents from authenticated;
grant select on table public.legal_consents to authenticated;
