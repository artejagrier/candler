-- ─────────────────────────────────────────────────────────────────────────────
-- Contact form submissions
--
-- Public visitors may INSERT a message; nobody can read them via the anon or
-- authenticated roles (reads are for the service role / dashboard only). RLS is
-- enabled with an insert-only public policy.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (anon or signed-in) may submit a message.
drop policy if exists "anyone can submit a contact message"
  on public.contact_messages;
create policy "anyone can submit a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- No SELECT policy is defined, so reads are denied to anon/authenticated and
-- only reachable with the service role.
