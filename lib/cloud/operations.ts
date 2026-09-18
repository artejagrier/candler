import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceContext, type WorkspaceContext } from "@/lib/data/workspace";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function requireCloudActor(): Promise<{ context: WorkspaceContext; admin: SupabaseClient }> {
  const context = await getWorkspaceContext();
  if (!context) throw new Error("Authentication required.");
  return { context, admin: createAdminClient() };
}

export type FolderPathCache = Map<string, string | null>;

export async function primeFolderPathCache(
  admin: SupabaseClient,
  input: { workspaceId: string; ownerId: string; parentId: string | null },
  cache: FolderPathCache,
) {
  const { data } = await admin
    .from("cloud_folders")
    .select("id,name,parent_id")
    .eq("workspace_id", input.workspaceId)
    .eq("owner_id", input.ownerId)
    .is("deleted_at", null);
  const folders = data ?? [];
  const byId = new Map(folders.map((folder) => [folder.id, folder]));

  function walkedPath(id: string): string | null {
    const names: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current) {
      if (seen.has(current.id)) return null;
      seen.add(current.id);
      names.unshift(current.name);
      if (!current.parent_id) return input.parentId ? null : names.join("/");
      if (input.parentId && current.parent_id === input.parentId) return names.join("/");
      current = byId.get(current.parent_id);
    }
    return null;
  }

  for (const folder of folders) {
    const walked = walkedPath(folder.id);
    if (!walked) continue;
    cache.set(`${input.workspaceId}:${input.ownerId}:${input.parentId ?? ""}:${walked}`, folder.id);
  }
}

export async function ensureFolderPath(
  admin: SupabaseClient,
  input: { workspaceId: string; ownerId: string; projectId: string | null; parentId: string | null; relativePath: string | null },
  cache?: FolderPathCache,
): Promise<string | null> {
  const parts = (input.relativePath ?? "").split("/").filter(Boolean);
  parts.pop();
  let parentId = input.parentId;
  const walked: string[] = [];
  for (const name of parts) {
    walked.push(name);
    const cacheKey = `${input.workspaceId}:${input.ownerId}:${input.parentId ?? ""}:${walked.join("/")}`;
    if (cache?.has(cacheKey)) {
      parentId = cache.get(cacheKey) ?? null;
      continue;
    }
    let query = admin
      .from("cloud_folders")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("owner_id", input.ownerId)
      .eq("name", name)
      .is("deleted_at", null);
    query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
    const { data: existing } = await query.maybeSingle();
    if (existing) {
      parentId = existing.id;
      cache?.set(cacheKey, parentId);
      continue;
    }
    const { data, error } = await admin
      .from("cloud_folders")
      .insert({
        workspace_id: input.workspaceId,
        owner_id: input.ownerId,
        project_id: input.projectId,
        parent_id: parentId,
        name,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error("Folder path could not be created.");
    parentId = data.id;
    cache?.set(cacheKey, parentId);
  }
  return parentId;
}

export async function ensureFolderPaths(
  admin: SupabaseClient,
  input: { workspaceId: string; ownerId: string; projectId: string | null; parentId: string | null },
  relativePaths: string[],
  cache: FolderPathCache,
) {
  const prefixes = new Set<string>();
  for (const relativePath of relativePaths) {
    const parts = relativePath.split("/").filter(Boolean);
    parts.pop();
    let walked = "";
    for (const name of parts) {
      walked = walked ? `${walked}/${name}` : name;
      prefixes.add(walked);
    }
  }
  const byDepth = new Map<number, string[]>();
  for (const prefix of prefixes) {
    const depth = prefix.split("/").length;
    const list = byDepth.get(depth) ?? [];
    list.push(prefix);
    byDepth.set(depth, list);
  }
  for (const depth of [...byDepth.keys()].sort((a, b) => a - b)) {
    const missing: Array<{ prefix: string; name: string; parentId: string | null }> = [];
    for (const prefix of byDepth.get(depth) ?? []) {
      const cacheKey = `${input.workspaceId}:${input.ownerId}:${input.parentId ?? ""}:${prefix}`;
      if (cache.has(cacheKey)) continue;
      const segments = prefix.split("/");
      const name = segments.at(-1) ?? prefix;
      const parentPrefix = segments.slice(0, -1).join("/");
      const parentId = parentPrefix
        ? cache.get(`${input.workspaceId}:${input.ownerId}:${input.parentId ?? ""}:${parentPrefix}`) ?? input.parentId
        : input.parentId;
      missing.push({ prefix, name, parentId: parentId ?? null });
    }
    if (!missing.length) continue;
    const { data, error } = await admin
      .from("cloud_folders")
      .insert(missing.map((row) => ({
        workspace_id: input.workspaceId,
        owner_id: input.ownerId,
        project_id: input.projectId,
        parent_id: row.parentId,
        name: row.name,
      })))
      .select("id,name,parent_id");
    if (error || !data) {
      for (const row of missing) {
        await ensureFolderPath(admin, { ...input, relativePath: `${row.prefix}/file` }, cache);
      }
      continue;
    }
    const unused = new Set(data.map((row) => row.id));
    for (const row of missing) {
      const created = data.find((item) => unused.has(item.id) && item.name === row.name && (item.parent_id ?? null) === (row.parentId ?? null));
      if (!created) {
        await ensureFolderPath(admin, { ...input, relativePath: `${row.prefix}/file` }, cache);
        continue;
      }
      unused.delete(created.id);
      cache.set(`${input.workspaceId}:${input.ownerId}:${input.parentId ?? ""}:${row.prefix}`, created.id);
    }
  }
}

export async function descendantFolderIds(
  admin: SupabaseClient,
  folderId: string,
  ownerId: string,
  workspaceId: string,
): Promise<string[]> {
  const ids = [folderId];
  const queue = [folderId];
  const seen = new Set<string>([folderId]);
  while (queue.length) {
    const current = queue.shift()!;
    const { data } = await admin
      .from("cloud_folders")
      .select("id")
      .eq("parent_id", current)
      .eq("owner_id", ownerId)
      .eq("workspace_id", workspaceId);
    for (const row of data ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      ids.push(row.id);
      queue.push(row.id);
    }
  }
  return ids;
}
