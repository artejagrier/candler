-- 0007: INSERT ... RETURNING was denied even though workspace_insert passed.
-- PostgreSQL applies SELECT RLS to RETURNING. workspace_select used only
-- is_workspace_member(id), which nested-queries workspaces and cannot see the
-- in-flight INSERT row. After commit the owner can SELECT and the function
-- returns true. Adding owner_id = auth.uid() evaluates the new row directly
-- so onboarding and test:rls (.insert().select().single()) succeed.
-- Does not weaken tenant isolation: unrelated users still fail both clauses.
-- Idempotent: drops and recreates only workspace_select.

drop policy if exists workspace_select on public.workspaces;

create policy workspace_select on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id) or owner_id = auth.uid());
