-- Vault Recovery Phrase: one slow password hash per user.
-- This is an authorization/reveal gate, not the secret-at-rest encryption key.
-- Authenticated clients cannot read hashes. Server uses the service role.

create table if not exists public.vault_recovery_phrases (
  user_id uuid primary key references auth.users on delete cascade,
  phrase_hash text not null,
  salt text not null,
  kdf text not null default 'scrypt',
  kdf_n integer not null default 16384,
  kdf_r integer not null default 8,
  kdf_p integer not null default 1,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_recovery_phrases_kdf_check check (kdf = 'scrypt'),
  constraint vault_recovery_phrases_hash_len check (char_length(phrase_hash) = 64),
  constraint vault_recovery_phrases_salt_len check (char_length(salt) = 32)
);

alter table public.vault_recovery_phrases enable row level security;

revoke all on table public.vault_recovery_phrases from anon, authenticated, public;
grant all on table public.vault_recovery_phrases to service_role;

comment on table public.vault_recovery_phrases is
  'Salted scrypt hashes of each user Vault Recovery Phrase. Never plaintext. Not used as the AES key.';

alter table public.authenticator_entries
  add column if not exists notes text;

comment on column public.authenticator_entries.notes is
  'Optional user-provided context. Not a secret and never populated from the TOTP seed.';
