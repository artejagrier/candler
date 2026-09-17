/**
 * Client-side Cloud library tree. Aggregates folder size/count/status from
 * existing file metadata. Does not talk to R2 or change backup authority.
 */

export type LibraryFile = {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  folder_id: string | null;
  project_id?: string | null;
  relative_path?: string | null;
  created_at?: string;
  updated_at: string;
};

export type LibraryFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  project_id?: string | null;
  created_at?: string;
  updated_at: string;
};

export type FolderSummary = {
  fileCount: number;
  folderCount: number;
  directFileCount: number;
  directFolderCount: number;
  sizeBytes: number;
  backedUp: number;
  uploading: number;
  verifying: number;
  failed: number;
  latestUpdated: string;
};

export type LibraryIndex = {
  rootFolders: LibraryFolder[];
  rootFiles: LibraryFile[];
  foldersByParent: Map<string, LibraryFolder[]>;
  filesByFolder: Map<string, LibraryFile[]>;
  summaries: Map<string, FolderSummary>;
};

function byFolderName(a: LibraryFolder, b: LibraryFolder) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function byFileName(a: LibraryFile, b: LibraryFile) {
  return a.original_filename.localeCompare(b.original_filename, undefined, { sensitivity: "base" });
}

function emptySummary(updatedAt: string): FolderSummary {
  return {
    fileCount: 0,
    folderCount: 0,
    directFileCount: 0,
    directFolderCount: 0,
    sizeBytes: 0,
    backedUp: 0,
    uploading: 0,
    verifying: 0,
    failed: 0,
    latestUpdated: updatedAt,
  };
}

function later(a: string, b: string) {
  return a > b ? a : b;
}

export function buildCloudLibrary(folders: LibraryFolder[], files: LibraryFile[]): LibraryIndex {
  const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
  const foldersByParent = new Map<string, LibraryFolder[]>();
  const filesByFolder = new Map<string, LibraryFile[]>();
  const rootFolders: LibraryFolder[] = [];
  const rootFiles: LibraryFile[] = [];
  const summaries = new Map<string, FolderSummary>();

  for (const folder of folders) {
    summaries.set(folder.id, emptySummary(folder.updated_at));
    const parentOk = folder.parent_id && foldersById.has(folder.parent_id);
    if (parentOk && folder.parent_id) {
      const list = foldersByParent.get(folder.parent_id) ?? [];
      list.push(folder);
      foldersByParent.set(folder.parent_id, list);
    } else {
      rootFolders.push(folder);
    }
  }

  for (const file of files) {
    const parentOk = file.folder_id && foldersById.has(file.folder_id);
    if (parentOk && file.folder_id) {
      const list = filesByFolder.get(file.folder_id) ?? [];
      list.push(file);
      filesByFolder.set(file.folder_id, list);
    } else {
      rootFiles.push(file);
    }
  }

  for (const [id, list] of foldersByParent) foldersByParent.set(id, list.slice().sort(byFolderName));
  for (const [id, list] of filesByFolder) filesByFolder.set(id, list.slice().sort(byFileName));
  rootFolders.sort(byFolderName);
  rootFiles.sort(byFileName);

  for (const folder of folders) {
    const summary = summaries.get(folder.id);
    if (!summary) continue;
    summary.directFolderCount = (foldersByParent.get(folder.id) ?? []).length;
    summary.directFileCount = (filesByFolder.get(folder.id) ?? []).length;
  }

  function visitAncestors(startId: string, visit: (summary: FolderSummary) => void) {
    const seen = new Set<string>();
    let current: string | null = startId;
    while (current && !seen.has(current)) {
      seen.add(current);
      const summary = summaries.get(current);
      if (summary) visit(summary);
      current = foldersById.get(current)?.parent_id ?? null;
    }
  }

  for (const file of files) {
    if (!file.folder_id || !foldersById.has(file.folder_id)) continue;
    visitAncestors(file.folder_id, (summary) => {
      summary.fileCount += 1;
      if (file.status === "backed_up") {
        summary.backedUp += 1;
        summary.sizeBytes += Math.max(0, Number(file.size_bytes) || 0);
      } else if (file.status === "failed") {
        summary.failed += 1;
      } else if (file.status === "verifying") {
        summary.verifying += 1;
      } else {
        summary.uploading += 1;
      }
      summary.latestUpdated = later(summary.latestUpdated, file.updated_at);
    });
  }

  for (const folder of folders) {
    if (!folder.parent_id || !foldersById.has(folder.parent_id)) continue;
    visitAncestors(folder.parent_id, (summary) => {
      summary.folderCount += 1;
      summary.latestUpdated = later(summary.latestUpdated, folder.updated_at);
    });
  }

  return { rootFolders, rootFiles, foldersByParent, filesByFolder, summaries };
}

export function folderCountLabel(summary: FolderSummary) {
  const files = summary.fileCount === 1 ? "1 file" : `${summary.fileCount} files`;
  if (summary.folderCount <= 0) return files;
  const folders = summary.folderCount === 1 ? "1 folder" : `${summary.folderCount} folders`;
  return `${files} · ${folders}`;
}

export function folderStatus(summary: FolderSummary): { label: string; cls: string } {
  if (summary.fileCount === 0) return { label: "Empty", cls: "" };
  if (summary.failed > 0 && summary.backedUp === 0 && summary.uploading === 0 && summary.verifying === 0) {
    return { label: "Needs attention", cls: "failed" };
  }
  if (summary.failed > 0) return { label: "Incomplete", cls: "warning" };
  if (summary.uploading > 0) return { label: "Uploading", cls: "progress" };
  if (summary.verifying > 0) return { label: "Verifying", cls: "progress" };
  if (summary.backedUp === summary.fileCount) return { label: "Backed up", cls: "verified" };
  return { label: "Incomplete", cls: "warning" };
}

export function folderLocalDeleteSafety(summary: FolderSummary) {
  return summary.fileCount > 0
    && summary.backedUp === summary.fileCount
    && summary.failed === 0
    && summary.uploading === 0
    && summary.verifying === 0
    ? "allowed" as const
    : "blocked" as const;
}

export function rootListingNames(index: LibraryIndex) {
  return [...index.rootFolders.map((folder) => folder.name), ...index.rootFiles.map((file) => file.original_filename)];
}
