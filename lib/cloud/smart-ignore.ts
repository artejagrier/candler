/**
 * Cloud backup eligibility. Default policy is zero exclusions:
 * if the browser exposes a file from the selected folder, it is eligible.
 * .gitignore and generated-directory rules do not apply.
 */

export type SkipRecord = { relativePath: string; reason: string; count?: number };

export function ignoreLabel(reason: string) {
  return reason;
}

export function systemJunkReason(_relativePath: string): string | null {
  return null;
}

export function smartIgnoreReason(_relativePath: string): string | null {
  return null;
}

export function isSmartIgnored(_relativePath: string) {
  return false;
}

export function skippedFileCount(skipped: SkipRecord[]) {
  return skipped.reduce((n, item) => n + (item.count ?? 1), 0);
}

export function classifyBackupPaths(relativePaths: string[]) {
  return {
    keep: [...relativePaths],
    skipped: [] as SkipRecord[],
    scanned: relativePaths.length,
  };
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
