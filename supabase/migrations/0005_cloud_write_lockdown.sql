-- Additive launch-hardening: Cloud object integrity is server-authorized.
-- Authenticated clients may read their own file/folder metadata; they may not
-- insert, update status, or delete rows directly. All mutations go through
-- service-role routes after membership checks.

drop policy if exists file_access on public.cloud_files;
drop policy if exists folder_access on public.cloud_folders;
drop policy if exists upload_authorization_access on public.cloud_upload_authorizations;

create policy file_read on public.cloud_files
  for select to authenticated
  using (public.is_workspace_member(workspace_id) and owner_id = auth.uid());

create policy folder_read on public.cloud_folders
  for select to authenticated
  using (public.is_workspace_member(workspace_id) and owner_id = auth.uid());

-- cloud_upload_authorizations remains RLS-enabled with no authenticated policy
-- so only the service role can read or write authorization rows.

create index if not exists subscriptions_workspace_status_idx
  on public.subscriptions (workspace_id, status, updated_at desc);
