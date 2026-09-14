/**
 * Restore-to-device path planning. Pure functions — no R2, no quota, no status writes.
 */

export type RestoreFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  deleted_at?: string | null;
};

export type RestoreFile = {
  id: string;
  original_filename: string;
  relative_path: string | null;
  folder_id: string | null;
  size_bytes: number;
  status: string;
  deleted_at?: string | null;
};

export type RestoreEntry = {
  fileId: string;
  archivePath: string;
  sizeBytes: number;
};

export const RESTORE_TOO_LARGE =
  "This project is too large for browser restore right now. Download smaller folders or use Candler Desktop when available.";

export function sanitizeArchivePath(input: string): string | null {
  const normalized = input.replaceAll("\\", "/").replace(/^\.\/+/, "").trim();
  if (!normalized || normalized.startsWith("/") || /[:\0]/.test(normalized)) return null;
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) return null;
  if (parts.some((part) => part === ".." || part === "." || part === "~")) return null;
  return parts.join("/");
}

export function zipFileName(folderName: string) {
  const safe = folderName.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "-").replace(/\.+$/g, "").trim() || "restore";
  return `${safe}.zip`;
}

function folderPathMap(rootId: string, folders: RestoreFolder[]) {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const paths = new Map<string, string>();

  function pathOf(id: string): string | null {
    if (paths.has(id)) return paths.get(id) ?? null;
    const names: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current) {
      if (seen.has(current.id)) return null;
      seen.add(current.id);
      names.unshift(current.name);
      if (current.id === rootId) break;
      if (!current.parent_id) return null;
      current = byId.get(current.parent_id);
    }
    if (!current || current.id !== rootId) return null;
    const sanitized = sanitizeArchivePath(names.join("/"));
    if (sanitized) paths.set(id, sanitized);
    return sanitized;
  }

  for (const folder of folders) pathOf(folder.id);
  return { byId, paths };
}

export function descendantFolderIdsFrom(rootId: string, folders: RestoreFolder[]) {
  const children = new Map<string, string[]>();
  for (const folder of folders) {
    if (folder.deleted_at || !folder.parent_id) continue;
    const list = children.get(folder.parent_id) ?? [];
    list.push(folder.id);
    children.set(folder.parent_id, list);
  }
  const ids = [rootId];
  const queue = [rootId];
  const seen = new Set<string>([rootId]);
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of children.get(current) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      ids.push(child);
      queue.push(child);
    }
  }
  return ids;
}

export function planFolderRestore(input: {
  root: RestoreFolder;
  folders: RestoreFolder[];
  files: RestoreFile[];
  maxFiles: number;
  maxBytes: number;
}): { entries: RestoreEntry[]; totalBytes: number; zipName: string } | { error: string; status: number } {
  if (input.root.deleted_at) return { error: "Folder is unavailable.", status: 404 };
  const liveFolders = [input.root, ...input.folders.filter((folder) => folder.id !== input.root.id)]
    .filter((folder) => !folder.deleted_at);
  if (!liveFolders.some((folder) => folder.id === input.root.id)) {
    return { error: "Folder is unavailable.", status: 404 };
  }
  const folderIds = new Set(descendantFolderIdsFrom(input.root.id, liveFolders));
  if (!folderIds.has(input.root.id)) folderIds.add(input.root.id);
  const { paths } = folderPathMap(input.root.id, liveFolders);
  paths.set(input.root.id, sanitizeArchivePath(input.root.name) ?? "restore");

  const entries: RestoreEntry[] = [];
  let totalBytes = 0;
  for (const file of input.files) {
    if (file.deleted_at || file.status !== "backed_up") continue;
    if (!file.folder_id || !folderIds.has(file.folder_id)) continue;
    const fromRelative = file.relative_path ? sanitizeArchivePath(file.relative_path) : null;
    const folderPath = paths.get(file.folder_id);
    const fromTree = folderPath
      ? sanitizeArchivePath(`${folderPath}/${file.original_filename}`)
      : sanitizeArchivePath(`${input.root.name}/${file.original_filename}`);
    const archivePath = fromRelative && fromRelative.split("/").filter(Boolean)[0] === (sanitizeArchivePath(input.root.name) ?? "restore")
      ? fromRelative
      : fromTree;
    if (!archivePath) continue;
    const sizeBytes = Math.max(0, Number(file.size_bytes) || 0);
    entries.push({ fileId: file.id, archivePath, sizeBytes });
    totalBytes += sizeBytes;
  }

  if (!entries.length) return { error: "No backed-up files are available to restore.", status: 404 };
  if (entries.length > input.maxFiles || totalBytes > input.maxBytes) {
    return { error: RESTORE_TOO_LARGE, status: 413 };
  }

  const unique = new Map<string, RestoreEntry>();
  for (const entry of entries) {
    let name = entry.archivePath;
    let n = 1;
    while (unique.has(name)) {
      const dot = entry.archivePath.lastIndexOf(".");
      const stem = dot > 0 ? entry.archivePath.slice(0, dot) : entry.archivePath;
      const ext = dot > 0 ? entry.archivePath.slice(dot) : "";
      n += 1;
      name = `${stem}-${n}${ext}`;
    }
    unique.set(name, { ...entry, archivePath: name });
  }

  return {
    entries: [...unique.values()],
    totalBytes,
    zipName: zipFileName(input.root.name),
  };
}
