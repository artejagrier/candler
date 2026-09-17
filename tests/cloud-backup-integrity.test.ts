import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyBackupPaths } from "../lib/cloud/smart-ignore";
import { summarizeBackup } from "../lib/cloud/backup-state";
import { canUpload, CLOUD_PLANS } from "../lib/cloud/quota";
import { describeTransferFailure, fetchWithRetry } from "../lib/cloud/transfer";
import { planFolderRestore, sanitizeArchivePath, type RestoreFile, type RestoreFolder } from "../lib/cloud/restore-paths";
import { uploadFileDescriptor } from "../lib/cloud/batch-schema";

const checksum = `${"A".repeat(43)}=`;

function items(statuses: string[]) {
  return statuses.map((status, index) => ({ status, id: String(index) }));
}

test("backup is complete only when every eligible file is verified", () => {
  const incomplete = summarizeBackup(items(["backed_up", "backed_up", "failed"]));
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.outcome, "incomplete");
  assert.equal(incomplete.verified, 2);
  assert.equal(incomplete.failed, 1);
  assert.equal(incomplete.percent < 100, true);
  assert.equal(incomplete.localDeleteSafety, "blocked");

  const pending = summarizeBackup(items(["backed_up", "verifying", "queued"]));
  assert.equal(pending.complete, false);
  assert.equal(pending.outcome, "verifying");
  assert.equal(pending.percent < 100, true);
  assert.equal(pending.localDeleteSafety, "blocked");

  const complete = summarizeBackup(items(["backed_up", "skipped", "backed_up"]));
  assert.equal(complete.complete, true);
  assert.equal(complete.outcome, "complete");
  assert.equal(complete.percent, 100);
  assert.equal(complete.localDeleteSafety, "allowed");
  assert.equal(complete.failed, 0);
  assert.equal(complete.pending, 0);
});

test("folder fixtures keep env, hidden, unicode, spaces, binaries, and lockfiles", () => {
  const discovered = [
    "CameronCarterResume/.DS_Store",
    "CameronCarterResume/Thumbs.db",
    "CameronCarterResume/desktop.ini",
    "CameronCarterResume/.env",
    "CameronCarterResume/.env.local",
    "CameronCarterResume/.gitignore",
    "CameronCarterResume/.npmrc",
    "CameronCarterResume/package.json",
    "CameronCarterResume/package-lock.json",
    "CameronCarterResume/pnpm-lock.yaml",
    "CameronCarterResume/src/app.ts",
    "CameronCarterResume/config/settings.json",
    "CameronCarterResume/docs/Resume 2026.pdf",
    "CameronCarterResume/assets/photo.png",
    "CameronCarterResume/bin/tool.wasm",
    "CameronCarterResume/archive/backup.zip",
    "CameronCarterResume/résumé.txt",
    "CameronCarterResume/nested/deep/notes.md",
    "CameronCarterResume/a/notes.md",
    "CameronCarterResume/b/notes.md",
  ];
  const { keep, skipped, scanned } = classifyBackupPaths(discovered, true);
  assert.equal(scanned, discovered.length);
  assert.equal(skippedFileReasons(skipped).sort().join(","), ".ds_store,desktop.ini,thumbs.db");
  assert.equal(keep.includes("CameronCarterResume/.env"), true);
  assert.equal(keep.includes("CameronCarterResume/.env.local"), true);
  assert.equal(keep.includes("CameronCarterResume/.gitignore"), true);
  assert.equal(keep.includes("CameronCarterResume/docs/Resume 2026.pdf"), true);
  assert.equal(keep.includes("CameronCarterResume/résumé.txt"), true);
  assert.equal(keep.includes("CameronCarterResume/a/notes.md"), true);
  assert.equal(keep.includes("CameronCarterResume/b/notes.md"), true);
  assert.equal(keep.includes("CameronCarterResume/.DS_Store"), false);
  assert.equal(keep.length, 17);
});

test("10 / 100 / 1,000 file folders keep a stable eligible denominator", () => {
  for (const count of [10, 100, 1000]) {
    const paths = Array.from({ length: count }, (_, index) => `proj/src/file-${index}.ts`);
    paths.push("proj/.DS_Store");
    const { keep, skipped, scanned } = classifyBackupPaths(paths, true);
    assert.equal(scanned, count + 1);
    assert.equal(keep.length, count);
    assert.equal(skipped.length, 1);
    const summary = summarizeBackup(keep.map((relativePath, index) => ({
      status: index === count - 1 ? "failed" : "backed_up",
      relativePath,
    })));
    assert.equal(summary.eligible, count);
    assert.equal(summary.verified, count - 1);
    assert.equal(summary.complete, false);
    assert.equal(summary.localDeleteSafety, "blocked");
  }
});

test("quota refuses a backup that cannot fit in remaining storage", () => {
  assert.equal(canUpload(0, CLOUD_PLANS.free.bytes, "free"), true);
  assert.equal(canUpload(1, CLOUD_PLANS.free.bytes, "free"), false);
  assert.equal(canUpload(0, CLOUD_PLANS.pro.bytes + 1, "pro"), false);
  assert.equal(canUpload(0, CLOUD_PLANS.cloud500.bytes, "cloud500"), true);
  assert.equal(canUpload(1, CLOUD_PLANS.cloud1tb.bytes, "cloud1tb"), false);
});

test("infrastructure storage errors stay user-safe", () => {
  const message = describeTransferFailure({
    relativePath: "CameronCarterResume/resume.pdf",
    stage: "authorize",
    error: "Object storage is not configured.",
  });
  assert.match(message, /Cloud backup couldn't start/);
  assert.equal(message.includes("Object storage"), false);
  assert.equal(message.includes("R2"), false);
});

test("path traversal cannot authorize an upload", () => {
  assert.equal(sanitizeArchivePath("../../secret"), null);
  assert.throws(() => uploadFileDescriptor.parse({
    filename: "secret",
    relativePath: "../escape.txt",
    contentType: "text/plain",
    size: 12,
    checksumSha256: checksum,
  }));
});

test("restore plan preserves nested, unicode, env, and duplicate filenames", () => {
  const root: RestoreFolder = { id: "root", name: "CameronCarterResume", parent_id: null };
  const nested: RestoreFolder = { id: "nested", name: "nested", parent_id: "root" };
  const other: RestoreFolder = { id: "other", name: "other", parent_id: "root" };
  const files: RestoreFile[] = [
    restoreFile("env", ".env", "root", "CameronCarterResume/.env", 20),
    restoreFile("json", "package.json", "root", "CameronCarterResume/package.json", 40),
    restoreFile("space", "Resume 2026.pdf", "nested", "CameronCarterResume/nested/Resume 2026.pdf", 80),
    restoreFile("uni", "résumé.txt", "nested", "CameronCarterResume/nested/résumé.txt", 12),
    restoreFile("dup-a", "notes.md", "nested", "CameronCarterResume/nested/notes.md", 8),
    restoreFile("dup-b", "notes.md", "other", "CameronCarterResume/other/notes.md", 9),
    restoreFile("bin", "tool.wasm", "root", "CameronCarterResume/tool.wasm", 64),
    restoreFile("failed", "skip-me.bin", "root", "CameronCarterResume/skip-me.bin", 4, "failed"),
  ];
  const planned = planFolderRestore({
    root,
    folders: [root, nested, other],
    files,
    maxFiles: 10_000,
    maxBytes: 10_000_000,
  });
  assert.equal("error" in planned, false);
  if ("error" in planned) return;
  const paths = planned.entries.map((entry) => entry.archivePath).sort();
  assert.deepEqual(paths, [
    "CameronCarterResume/.env",
    "CameronCarterResume/nested/Resume 2026.pdf",
    "CameronCarterResume/nested/notes.md",
    "CameronCarterResume/nested/résumé.txt",
    "CameronCarterResume/other/notes.md",
    "CameronCarterResume/package.json",
    "CameronCarterResume/tool.wasm",
  ]);
  assert.equal(paths.includes("CameronCarterResume/skip-me.bin"), false);
  assert.equal(planned.entries.length, 7);
});

test("fetchWithRetry does not loop on expired 403 upload URLs", async () => {
  let n = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    n += 1;
    return new Response("expired", { status: 403 });
  }) as typeof fetch;
  try {
    const response = await fetchWithRetry("https://candler.test/put", { method: "PUT" });
    assert.equal(response.status, 403);
    assert.equal(n, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("Cloud UI derives completion from summarizeBackup and keeps the Candler gradient rail", () => {
  const transfer = readFileSync(new URL("../components/cloud/CloudTransfer.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const browser = readFileSync(new URL("../components/cloud/CloudBrowser.tsx", import.meta.url), "utf8");
  const storage = readFileSync(new URL("../lib/cloud/storage.ts", import.meta.url), "utf8");
  const authorize = readFileSync(new URL("../lib/cloud/authorize.ts", import.meta.url), "utf8");
  assert.equal(transfer.includes("summarizeBackup"), true);
  assert.equal(transfer.includes("Backup Complete"), true);
  assert.equal(transfer.includes("Backup Incomplete"), true);
  assert.equal(css.includes("--candler-system-gradient"), true);
  assert.equal(css.includes(".candler-system-rail>i"), true);
  assert.equal(css.includes("conic-gradient(#B7FF2A 0%,#FF3D9A var(--progress)"), true);
  assert.equal(browser.includes("onChange={(event) => {"), true);
  assert.equal(browser.includes("void uploadSources(sources"), true);
  assert.equal(storage.includes("R2_ENDPOINT"), true);
  assert.equal(storage.includes("R2_ACCESS_KEY_ID"), true);
  assert.equal(storage.includes("R2_SECRET_ACCESS_KEY"), true);
  assert.equal(storage.includes("R2_BUCKET"), true);
  assert.equal(authorize.includes("isObjectStorageConfigured"), true);
  assert.equal(authorize.includes("CloudQuotaError"), true);
  assert.equal(authorize.includes("incomingBytes"), true);
});

function skippedFileReasons(skipped: Array<{ reason: string }>) {
  return skipped.map((item) => item.reason);
}

function restoreFile(
  id: string,
  original_filename: string,
  folder_id: string,
  relative_path: string,
  size_bytes: number,
  status = "backed_up",
): RestoreFile {
  return { id, original_filename, folder_id, relative_path, size_bytes, status, deleted_at: null };
}
