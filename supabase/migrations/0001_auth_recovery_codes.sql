-- ─────────────────────────────────────────────────────────────────────────────
-- MFA recovery (backup) codes
--
-- Supabase's native MFA is TOTP-only with no backup codes. This table stores
-- salted scrypt hashes of one-time recovery codes (never the plain codes),
-- protected by Row Level Security so each user can only ever access their own.
--
-- Apply with the Supabase CLI:  supabase db push
-- or paste into the SQL editor of your project.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.auth_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  code_hash  text not null,
  salt       text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists auth_recovery_codes_user_id_idx
  on public.auth_recovery_codes (user_id);

-- Only unused codes are queried during verification.
create index if not exists auth_recovery_codes_user_unused_idx
  on public.auth_recovery_codes (user_id)
  where used_at is null;

alter table public.auth_recovery_codes enable row level security;

-- A user may read, create, update (consume), and delete only their own codes.
drop policy if exists "recovery codes are self-owned (select)"
  on public.auth_recovery_codes;
create policy "recovery codes are self-owned (select)"
  on public.auth_recovery_codes for select
  using (auth.uid() = user_id);

drop policy if exists "recovery codes are self-owned (insert)"
  on public.auth_recovery_codes;
create policy "recovery codes are self-owned (insert)"
  on public.auth_recovery_codes for insert
  with check (auth.uid() = user_id);

drop policy if exists "recovery codes are self-owned (update)"
  on public.auth_recovery_codes;
create policy "recovery codes are self-owned (update)"
  on public.auth_recovery_codes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "recovery codes are self-owned (delete)"
  on public.auth_recovery_codes;
create policy "recovery codes are self-owned (delete)"
  on public.auth_recovery_codes for delete
  using (auth.uid() = user_id);
