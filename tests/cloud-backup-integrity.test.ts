import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { classifyBackupPaths } from "../lib/cloud/smart-ignore";
import { summarizeBackup } from "../lib/cloud/backup-state";
import { canUpload, CLOUD_PLANS } from "../lib/cloud/quota";
import { describeTransferFailure, fetchWithRetry } from "../lib/cloud/transfer";
import { describeEta, STALL_MS } from "../lib/cloud/stats";
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
  assert.equal(pending.uploaded, 2);
  assert.equal(pending.verified, 1);
  assert.equal(pending.percent < 100, true);
  assert.equal(pending.localDeleteSafety, "blocked");

  const uploadedOnly = summarizeBackup(items(["verifying", "verifying", "verifying"]));
  assert.equal(uploadedOnly.outcome, "verifying");
  assert.equal(uploadedOnly.uploaded, 3);
  assert.equal(uploadedOnly.verified, 0);
  assert.equal(uploadedOnly.complete, false);
  assert.equal(uploadedOnly.percent < 100, true);

  const complete = summarizeBackup(items(["backed_up", "skipped", "backed_up"]));
  assert.equal(complete.complete, true);
  assert.equal(complete.outcome, "complete");
  assert.equal(complete.percent, 100);
  assert.equal(complete.localDeleteSafety, "allowed");
  assert.equal(complete.failed, 0);
  assert.equal(complete.pending, 0);
});

test("folder fixtures keep env, hidden, unicode, spaces, binaries, junk, and lockfiles", () => {
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
  const { keep, skipped, scanned } = classifyBackupPaths(discovered);
  assert.equal(scanned, discovered.length);
  assert.equal(skipped.length, 0);
  assert.equal(keep.length, discovered.length);
  assert.equal(keep.includes("CameronCarterResume/.DS_Store"), true);
  assert.equal(keep.includes("CameronCarterResume/Thumbs.db"), true);
  assert.equal(keep.includes("CameronCarterResume/desktop.ini"), true);
  assert.equal(keep.includes("CameronCarterResume/.env"), true);
  assert.equal(keep.includes("CameronCarterResume/.env.local"), true);
  assert.equal(keep.includes("CameronCarterResume/.gitignore"), true);
  assert.equal(keep.includes("CameronCarterResume/docs/Resume 2026.pdf"), true);
  assert.equal(keep.includes("CameronCarterResume/résumé.txt"), true);
  assert.equal(keep.includes("CameronCarterResume/a/notes.md"), true);
  assert.equal(keep.includes("CameronCarterResume/b/notes.md"), true);
});

test("10 / 100 / 1,000 file folders keep a stable eligible denominator", () => {
  for (const count of [10, 100, 1000]) {
    const paths = Array.from({ length: count }, (_, index) => `proj/src/file-${index}.ts`);
    paths.push("proj/.DS_Store");
    const { keep, skipped, scanned } = classifyBackupPaths(paths);
    assert.equal(scanned, count + 1);
    assert.equal(keep.length, count + 1);
    assert.equal(skipped.length, 0);
    const summary = summarizeBackup(keep.map((relativePath, index) => ({
      status: index === keep.length - 1 ? "failed" : "backed_up",
      relativePath,
    })));
    assert.equal(summary.eligible, count + 1);
    assert.equal(summary.verified, count);
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

test("20,000+ file folders keep every discovered path including OS junk", () => {
  const discovered: string[] = [];
  for (let index = 0; index < 20_000; index += 1) {
    const bucket = index % 5;
    if (bucket === 0) discovered.push(`cyber-vixen-studios copy/node_modules/pkg-${index}/index.js`);
    else if (bucket === 1) discovered.push(`cyber-vixen-studios copy/.next/cache/file-${index}`);
    else if (bucket === 2) discovered.push(`cyber-vixen-studios copy/.git/objects/${index}`);
    else discovered.push(`cyber-vixen-studios copy/src/file-${index}.ts`);
  }
  discovered.push("cyber-vixen-studios copy/.DS_Store");
  discovered.push("cyber-vixen-studios copy/.env");
  const { keep, skipped, scanned } = classifyBackupPaths(discovered);
  assert.equal(scanned, 20_002);
  assert.equal(skipped.length, 0);
  assert.equal(keep.length, 20_002);
  assert.equal(keep.includes("cyber-vixen-studios copy/.DS_Store"), true);
  assert.equal(keep.includes("cyber-vixen-studios copy/.env"), true);
  assert.equal(keep.some((path) => path.includes("node_modules")), true);
  assert.equal(keep.some((path) => path.includes(".next")), true);
  assert.equal(keep.some((path) => path.includes(".git")), true);
});

test("20651 / 20652 is incomplete; 20652 / 20652 is complete", () => {
  const almost = Array.from({ length: 20_652 }, (_, index) => ({
    status: index === 20_651 ? "verifying" : "backed_up",
    size: 100,
  }));
  const incomplete = summarizeBackup(almost);
  assert.equal(incomplete.eligible, 20_652);
  assert.equal(incomplete.verified, 20_651);
  assert.equal(incomplete.uploaded, 20_652);
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.percent < 100, true);
  assert.equal(incomplete.outcome, "verifying");

  const done = summarizeBackup(almost.map((item) => ({ ...item, status: "backed_up" })));
  assert.equal(done.verified, 20_652);
  assert.equal(done.failed, 0);
  assert.equal(done.pending, 0);
  assert.equal(done.complete, true);
  assert.equal(done.percent, 100);
  assert.equal(done.outcome, "complete");
});

test("20,652-file on-disk fixture keeps every discovered file eligible", { timeout: 180_000 }, async () => {
  const { mkdtemp, mkdir, writeFile, readdir, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = await mkdtemp(join(tmpdir(), "candler-cloud-20k-"));
  const folder = join(root, "cyber-vixen-studios copy");
  try {
    await mkdir(join(folder, ".git", "objects"), { recursive: true });
    await mkdir(join(folder, "node_modules", "pkg"), { recursive: true });
    await mkdir(join(folder, ".next", "cache"), { recursive: true });
    await mkdir(join(folder, "src"), { recursive: true });
    const specials = [
      [".DS_Store", "ds"],
      ["Thumbs.db", "thumbs"],
      ["desktop.ini", "[.ShellClassInfo]"],
      [".env", "SECRET=1"],
      [".env.local", "SECRET=2"],
      [".gitignore", "node_modules"],
      ["photo.png", "\u0089PNG"],
      ["archive.zip", "PK"],
    ] as const;
    for (const [name, body] of specials) {
      await writeFile(join(folder, name), body);
    }
    const remaining = 20_652 - specials.length;
    const pending: Promise<void>[] = [];
    for (let index = 0; index < remaining; index += 1) {
      const bucket = index % 4;
      const path = bucket === 0
        ? join(folder, "node_modules", "pkg", `m-${index}.js`)
        : bucket === 1
          ? join(folder, ".next", "cache", `c-${index}`)
          : bucket === 2
            ? join(folder, ".git", "objects", `o-${index}`)
            : join(folder, "src", `f-${index}.ts`);
      pending.push(writeFile(path, "x"));
      if (pending.length >= 400) {
        await Promise.all(pending);
        pending.length = 0;
      }
    }
    await Promise.all(pending);

    async function walk(dir: string, prefix: string): Promise<string[]> {
      const entries = await readdir(dir, { withFileTypes: true });
      const paths: string[] = [];
      for (const entry of entries) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) paths.push(...await walk(join(dir, entry.name), relativePath));
        else if (entry.isFile()) paths.push(relativePath);
      }
      return paths;
    }

    const discovered = await walk(folder, "cyber-vixen-studios copy");
    const { keep, skipped, scanned } = classifyBackupPaths(discovered);
    assert.equal(discovered.length, 20_652);
    assert.equal(scanned, 20_652);
    assert.equal(keep.length, 20_652);
    assert.equal(skipped.length, 0);
    assert.equal(keep.includes("cyber-vixen-studios copy/.DS_Store"), true);
    assert.equal(keep.includes("cyber-vixen-studios copy/.env"), true);
    assert.equal(keep.includes("cyber-vixen-studios copy/.env.local"), true);
    assert.equal(keep.includes("cyber-vixen-studios copy/Thumbs.db"), true);
    assert.equal(keep.includes("cyber-vixen-studios copy/desktop.ini"), true);
    assert.equal(keep.includes("cyber-vixen-studios copy/photo.png"), true);
    assert.equal(keep.includes("cyber-vixen-studios copy/archive.zip"), true);
    assert.equal(keep.some((path) => path.includes("/.git/")), true);
    assert.equal(keep.some((path) => path.includes("/node_modules/")), true);
    assert.equal(keep.some((path) => path.includes("/.next/")), true);
    assert.equal(keep.some((path) => path.split("/").some((part) => part.startsWith("."))), true);

    const complete = summarizeBackup(keep.map(() => ({ status: "backed_up", size: 1 })));
    assert.equal(complete.eligible, 20_652);
    assert.equal(complete.verified, 20_652);
    assert.equal(complete.failed, 0);
    assert.equal(complete.complete, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ETA stays calculating until real throughput exists and stalls without progress", () => {
  const early = describeEta({
    wallMs: 2_000,
    now: 2_000,
    lastProgressAt: 1_000,
    bytesUploaded: 0,
    bytesVerified: 0,
    bytesTotal: 12_000,
    filesUploaded: 0,
    filesVerified: 0,
    filesEligible: 20,
    completedPuts: 0,
    previousSeconds: null,
  });
  assert.equal(early.state, "calculating");
  assert.match(early.label, /Calculating time remaining/);
  assert.equal(early.label.includes("20 sec"), false);

  const ready = describeEta({
    wallMs: 30_000,
    now: 30_000,
    lastProgressAt: 29_000,
    bytesUploaded: 6_000_000,
    bytesVerified: 3_000_000,
    bytesTotal: 12_000_000,
    filesUploaded: 10,
    filesVerified: 5,
    filesEligible: 20,
    completedPuts: 10,
    previousSeconds: null,
  });
  assert.equal(ready.state, "ready");
  assert.equal(ready.seconds != null && ready.seconds > 5, true);
  assert.equal(ready.label.includes("About 20 sec remaining") && ready.seconds! > 60, false);

  const stalled = describeEta({
    wallMs: STALL_MS + 5_000,
    now: STALL_MS + 5_000,
    lastProgressAt: 1_000,
    bytesUploaded: 100,
    bytesVerified: 0,
    bytesTotal: 12_000,
    filesUploaded: 3,
    filesVerified: 0,
    filesEligible: 20,
    completedPuts: 3,
    previousSeconds: 20,
  });
  assert.equal(stalled.state, "stalled");
  assert.match(stalled.label, /stalled/);
  assert.equal(stalled.label.includes("20 sec"), false);

  const finishing = describeEta({
    wallMs: 40_000,
    now: 40_000,
    lastProgressAt: 39_000,
    bytesUploaded: 12_000_000,
    bytesVerified: 9_000_000,
    bytesTotal: 12_000_000,
    filesUploaded: 20,
    filesVerified: 15,
    filesEligible: 20,
    completedPuts: 20,
    previousSeconds: 12,
  });
  assert.equal(finishing.state, "finishing");
  assert.match(finishing.label, /Finishing verification/);
  assert.equal(finishing.label.includes("sec remaining"), false);

  const slow = describeEta({
    wallMs: 30_000,
    now: 30_000,
    lastProgressAt: 29_000,
    bytesUploaded: 600_000,
    bytesVerified: 300_000,
    bytesTotal: 3_000_000,
    filesUploaded: 4,
    filesVerified: 2,
    filesEligible: 20,
    completedPuts: 4,
    previousSeconds: 20,
  });
  assert.equal(slow.state, "slow");
  assert.match(slow.label, /slower than usual/);
  assert.equal(slow.label.includes("sec remaining"), false);
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
  assert.equal(transfer.includes("system files excluded"), false);
  assert.equal(transfer.includes("View excluded files"), false);
  assert.equal(transfer.includes("generated files skipped"), false);
  assert.equal(css.includes("--candler-system-gradient"), true);
  assert.equal(css.includes(".candler-system-rail>i"), true);
  assert.equal(css.includes("conic-gradient(#B7FF2A 0%,#FF3D9A var(--progress)"), true);
  assert.equal(browser.includes("onChange={(event) => {"), true);
  assert.equal(browser.includes("void uploadSources(sources"), true);
  assert.equal(browser.includes("authorizeBatches"), true);
  assert.equal(storage.includes("R2_ENDPOINT"), true);
  assert.equal(storage.includes("R2_ACCESS_KEY_ID"), true);
  assert.equal(storage.includes("R2_SECRET_ACCESS_KEY"), true);
  assert.equal(storage.includes("R2_BUCKET"), true);
  assert.equal(authorize.includes("isObjectStorageConfigured"), true);
  assert.equal(authorize.includes("CloudQuotaError"), true);
  assert.equal(authorize.includes("incomingBytes"), true);
});

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
