-- Additive Authenticator sync/organization columns. Seeds remain AES-256-GCM only.
-- Fingerprints are HMAC values and cannot recover the TOTP seed.

alter table public.authenticator_entries
  add column if not exists seed_fingerprint text,
  add column if not exists pinned boolean not null default false,
  add column if not exists last_used_at timestamptz;

create unique index if not exists authenticator_entries_owner_fingerprint_uidx
  on public.authenticator_entries (owner_id, seed_fingerprint)
  where seed_fingerprint is not null;

comment on column public.authenticator_entries.seed_fingerprint is
  'HMAC of the TOTP seed. Used for duplicate detection. Not reversible.';
comment on column public.authenticator_entries.pinned is
  'Follows the owner across signed-in devices.';
comment on column public.authenticator_entries.last_used_at is
  'Set when a code is copied. Never stores the code or seed.';
