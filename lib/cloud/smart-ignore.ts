/**
 * Candler Smart Backup ignore rules.
 * Centralized so picker, drag-drop, and the transfer UI share one definition.
 */

export const SMART_IGNORE_DIRECTORIES = [
  "node_modules",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".cache",
  ".turbo",
  ".vercel",
  ".git",
] as const;

export const SMART_IGNORE_FILES = [".ds_store", "thumbs.db", "desktop.ini"] as const;

const IGNORE_LABELS: Record<string, string> = {
  node_modules: "node_modules",
  ".next": ".next",
  dist: "dist",
  build: "build",
  out: "out",
  coverage: "coverage",
  ".cache": ".cache",
  ".turbo": ".turbo",
  ".vercel": ".vercel",
  ".git": ".git cache",
  ".ds_store": ".DS_Store",
  "thumbs.db": "Thumbs.db",
  "desktop.ini": "desktop.ini",
};

function normalizeSegment(name: string) {
  return name.replace(/\/+$/, "").toLowerCase();
}

export function ignoreLabel(reason: string) {
  return IGNORE_LABELS[reason] ?? reason;
}

export function systemJunkReason(relativePath: string): string | null {
  const leaf = relativePath.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  if ((SMART_IGNORE_FILES as readonly string[]).includes(leaf)) return leaf;
  return null;
}

/** Returns the ignore reason for a relative path, or null if it should be backed up. */
export function smartIgnoreReason(relativePath: string, options?: { includeGenerated?: boolean }): string | null {
  const junk = systemJunkReason(relativePath);
  if (junk) return junk;
  if (options?.includeGenerated) return null;
  const parts = relativePath.split("/").filter(Boolean);
  for (const part of parts) {
    const key = normalizeSegment(part);
    if ((SMART_IGNORE_DIRECTORIES as readonly string[]).includes(key)) return key;
  }
  return null;
}

export function isSmartIgnored(relativePath: string, options?: { includeGenerated?: boolean }) {
  return smartIgnoreReason(relativePath, options) !== null;
}

export type SkipRecord = { relativePath: string; reason: string; count?: number };

export function skippedFileCount(skipped: SkipRecord[]) {
  return skipped.reduce((n, item) => n + (item.count ?? 1), 0);
}

export function classifyBackupPaths(relativePaths: string[], smart: boolean) {
  const keep: string[] = [];
  const skipped: SkipRecord[] = [];
  for (const relativePath of relativePaths) {
    const reason = smartIgnoreReason(relativePath, { includeGenerated: !smart });
    if (reason) skipped.push({ relativePath, reason });
    else keep.push(relativePath);
  }
  return { keep, skipped, scanned: relativePaths.length };
}

export function skipReasonSummary(skipped: SkipRecord[]) {
  const counts = new Map<string, number>();
  for (const item of skipped) {
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + (item.count ?? 1));
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, label: ignoreLabel(reason), count }));
}

export function rootLabel(relativePaths: string[]) {
  const first = relativePaths[0]?.split("/").filter(Boolean)[0];
  if (!first || relativePaths.every((path) => !path.includes("/"))) return first || "Upload";
  return first;
}
