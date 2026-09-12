-- 0006 replaces 0003's broad workspaces policy (workspace_access FOR ALL).
-- Split SELECT / INSERT / UPDATE / DELETE so an authenticated user can create
-- their own workspace (owner_id = auth.uid()) while members still SELECT and
-- unrelated tenants stay isolated. Safe to rerun: drops only these named
-- policies, then recreates them. Does not disable RLS or modify data.

drop policy if exists workspace_access on public.workspaces;
drop policy if exists workspace_select on public.workspaces;
drop policy if exists workspace_insert on public.workspaces;
drop policy if exists workspace_update on public.workspaces;
drop policy if exists workspace_delete on public.workspaces;

create policy workspace_select on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

create policy workspace_insert on public.workspaces
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy workspace_update on public.workspaces
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy workspace_delete on public.workspaces
  for delete to authenticated
  using (owner_id = auth.uid());
