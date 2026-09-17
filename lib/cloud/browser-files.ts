/**
 * Browser-only helpers for Cloud file/folder pickers and drag-drop.
 * Does not talk to R2, quotas, or status — callers still use the
 * authorize → PUT → finalize pipeline.
 * Every browser-exposed file is eligible. Read failures are errors, not exclusions.
 */

import type { SkipRecord } from "@/lib/cloud/smart-ignore";

export type UploadSource = {
  file: File;
  relativePath: string;
};

type DirectoryCapableInput = HTMLInputElement & {
  webkitdirectory?: boolean;
  directory?: boolean;
};

export function bindDirectoryPicker(input: HTMLInputElement | null) {
  if (!input) return;
  input.multiple = true;
  input.setAttribute("webkitdirectory", "");
  input.setAttribute("directory", "");
  input.setAttribute("mozdirectory", "");
  const node = input as DirectoryCapableInput;
  node.webkitdirectory = true;
  node.directory = true;
}

export function relativePathForFile(file: File) {
  const nested = "webkitRelativePath" in file ? file.webkitRelativePath : "";
  return nested && nested.length > 0 ? nested : file.name;
}

export function sourcesFromFileList(list: FileList | File[] | null | undefined): UploadSource[] {
  if (!list) return [];
  return Array.from(list).map((file) => ({ file, relativePath: relativePathForFile(file) }));
}

export function describeReadError(error: unknown, label: string) {
  const raw = error instanceof Error ? error.message : String(error);
  if (/could not be found at the time an operation was processed/i.test(raw)) {
    return `Could not read “${label}”. Chrome cannot treat a folder as a single file — drop the folder onto Cloud, or use Upload Folder and select the directory itself.`;
  }
  return `Could not read “${label}”: ${raw}`;
}

function entryPath(parentPath: string, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

async function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

async function collectEntry(
  entry: FileSystemEntry,
  parentPath: string,
  out: UploadSource[],
  errors: string[],
): Promise<void> {
  const rel = entryPath(parentPath, entry.name);
  if (entry.isDirectory) {
    try {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children = await readAllDirectoryEntries(reader);
      if (!children.length) return;
      for (const child of children) {
        await collectEntry(child, rel, out, errors);
      }
    } catch (error) {
      errors.push(describeReadError(error, rel));
    }
    return;
  }
  try {
    const file = await new Promise<File>((resolve, reject) => {
      (entry as FileSystemFileEntry).file(resolve, reject);
    });
    out.push({ file, relativePath: rel });
  } catch (error) {
    errors.push(describeReadError(error, rel));
  }
}

/**
 * Must be called synchronously from the drop event so Chrome keeps the
 * directory handles alive. Recursion/read may then be async.
 */
export function captureDroppedEntries(dataTransfer: DataTransfer): FileSystemEntry[] {
  const entries: FileSystemEntry[] = [];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.() ?? null;
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function sourcesFromEntries(
  entries: FileSystemEntry[],
): Promise<{ sources: UploadSource[]; errors: string[]; skipped: SkipRecord[] }> {
  const sources: UploadSource[] = [];
  const errors: string[] = [];
  for (const entry of entries) {
    await collectEntry(entry, "", sources, errors);
  }
  return { sources, errors, skipped: [] };
}
