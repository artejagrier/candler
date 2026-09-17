import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyBackupPaths,
  isSmartIgnored,
  skipReasonSummary,
  skippedFileCount,
  smartIgnoreReason,
} from "../lib/cloud/smart-ignore";
import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { retryDelayMs, runPool, fetchWithRetry, TRANSFER_CONCURRENCY, describeTransferFailure, sanitizeErrorText, isUsableUploadUrl, classifyPutBodyHint, classifyCrossOriginFetchError, TransferCancelled } from "../lib/cloud/transfer";

const tree = [
  "demo/package.json",
  "demo/package-lock.json",
  "demo/pnpm-lock.yaml",
  "demo/yarn.lock",
  "demo/bun.lockb",
  "demo/README.md",
  "demo/src/app/page.tsx",
  "demo/src/components/Navbar.tsx",
  "demo/app/layout.tsx",
  "demo/components/hero.tsx",
  "demo/public/hero.png",
  "demo/config/example.json",
  "demo/node_modules/locate-path/index.js",
  "demo/node_modules/locate-path/package.json",
  "demo/.next/cache/webpack/file",
  "demo/.next/static/chunks/main.js",
  "demo/dist/index.js",
  "demo/build/out.js",
  "demo/out/index.html",
  "demo/coverage/lcov.info",
  "demo/.cache/tmp",
  "demo/.turbo/cache/x",
  "demo/.vercel/project.json",
  "demo/.git/config",
  "demo/.DS_Store",
  "demo/src/.DS_Store",
];

test("Smart Backup skips generated directories and keeps source", () => {
  const { keep, skipped, scanned } = classifyBackupPaths(tree, true);
  assert.equal(scanned, tree.length);
  assert.equal(keep.includes("demo/package.json"), true);
  assert.equal(keep.includes("demo/package-lock.json"), true);
  assert.equal(keep.includes("demo/src/app/page.tsx"), true);
  assert.equal(keep.includes("demo/public/hero.png"), true);
  assert.equal(keep.includes("demo/README.md"), true);
  assert.equal(keep.includes("demo/config/example.json"), true);
  assert.equal(keep.some((path) => path.includes("node_modules")), false);
  assert.equal(keep.some((path) => path.includes(".next")), false);
  assert.equal(keep.some((path) => path.includes(".git")), false);
  assert.equal(isSmartIgnored("demo/node_modules/locate-path/index.js"), true);
  assert.equal(smartIgnoreReason("demo/.next/cache/webpack/file"), ".next");
  assert.equal(smartIgnoreReason("demo/.git/config"), ".git");
  assert.equal(skippedFileCount(skipped) > 0, true);
  const labels = skipReasonSummary(skipped).map((item) => item.label);
  assert.equal(labels.includes("node_modules"), true);
  assert.equal(labels.includes(".next"), true);
  assert.equal(labels.includes(".git cache"), true);
  assert.equal(labels.includes(".DS_Store"), true);
});

test("Smart Backup can be disabled to include generated files, but OS junk stays excluded", () => {
  const { keep, skipped } = classifyBackupPaths(tree, false);
  assert.equal(keep.includes("demo/node_modules/locate-path/index.js"), true);
  assert.equal(keep.includes("demo/.DS_Store"), false);
  assert.equal(keep.includes("demo/src/.DS_Store"), false);
  assert.equal(skipped.every((item) => item.reason === ".ds_store"), true);
});

test("retry delay honors Retry-After seconds and exponential fallback", () => {
  assert.equal(retryDelayMs(1, "5"), 5000);
  assert.equal(retryDelayMs(1, null), 500);
  assert.equal(retryDelayMs(2, null), 1000);
  assert.equal(retryDelayMs(3, null), 2000);
});

test("transfer errors stay specific without leaking signed URLs", () => {
  const leaked = describeTransferFailure({
    relativePath: "cyber-vixen-studios copy/README.md",
    stage: "put",
    error: new Error("Failed to fetch https://bucket.r2.cloudflarestorage.com/key?X-Amz-Signature=SECRETVALUE&X-Amz-Credential=AKIEXAMPLE"),
  });
  assert.match(leaked, /README\.md/);
  assert.equal(leaked.includes("SECRETVALUE"), false);
  assert.equal(leaked.includes("X-Amz-Signature"), false);
  assert.equal(leaked.includes("cloudflarestorage"), false);
  assert.match(leaked, /CORS preflight/);
  assert.equal(classifyCrossOriginFetchError(new Error("Failed to fetch")), "cors");
  assert.equal(classifyCrossOriginFetchError(new TransferCancelled()), "aborted");
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", kind: "network" }), /network failure/);
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", kind: "aborted" }), /PUT aborted/);
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", status: 403 }), /PUT HTTP 403/);
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", status: 400 }), /PUT HTTP 400/);
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", status: 500 }), /PUT HTTP 500/);
  assert.match(describeTransferFailure({
    relativePath: "package.json",
    stage: "authorize",
    uploadUrlMissing: true,
  }), /no upload URL/);
  assert.equal(isUsableUploadUrl("https://example.r2.cloudflarestorage.com/object"), true);
  assert.equal(isUsableUploadUrl("not-a-url"), false);
  assert.equal(classifyPutBodyHint("<Error><Code>SignatureDoesNotMatch</Code></Error>"), "signature mismatch");
  assert.equal(sanitizeErrorText("https://x.example/?X-Amz-Signature=abc").includes("abc"), false);
});

test("worker pool runs with bounded concurrency", async () => {
  let peak = 0;
  let live = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);
  await runPool(items, TRANSFER_CONCURRENCY, async () => {
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((resolve) => setTimeout(resolve, 10));
    live -= 1;
  });
  assert.equal(peak <= TRANSFER_CONCURRENCY, true);
  assert.equal(peak >= 1, true);
});

test("fetchWithRetry honors 429 Retry-After then succeeds", async () => {
  let n = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    n += 1;
    if (n < 3) return new Response("{}", { status: 429, headers: { "Retry-After": "0" } });
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const response = await fetchWithRetry("https://candler.test/retry", { method: "POST" });
    assert.equal(response.status, 200);
    assert.equal(n, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test("cloud browser keeps per-file authorize and finalize without page reloads", () => {
  const source = readFileSync(new URL("../components/cloud/CloudBrowser.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("/api/cloud/upload/batch-authorize"), true);
  assert.equal(source.includes("/api/cloud/finalize/batch"), true);
  assert.equal(source.includes("location.reload"), false);
  assert.equal(source.includes("runPipelinedBatches"), true);
  assert.equal(source.includes("router.refresh()"), true);
  assert.equal(source.includes("body: entry.source.file"), true);
  assert.equal(source.includes("body: entry.bytes"), false);
  assert.equal(source.includes("Upload Folder"), true);
  assert.equal(source.includes("<Upload />Upload"), false);
  assert.equal(source.includes("retryFailed"), true);
  assert.equal(source.includes("describeTransferFailure"), true);
});

test("demo fixture skips node_modules and .next while keeping source", async () => {
  const root = new URL("../fixtures/cloud-smart-backup-demo", import.meta.url);
  async function walk(dir: string, prefix: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) paths.push(...await walk(join(dir, entry.name), relativePath));
      else paths.push(relativePath);
    }
    return paths;
  }
  const relativePaths = await walk(root.pathname, "candler-cloud-test");
  const { keep, skipped } = classifyBackupPaths(relativePaths, true);
  assert.equal(keep.includes("candler-cloud-test/package.json"), true);
  assert.equal(keep.includes("candler-cloud-test/src/app/page.tsx"), true);
  assert.equal(keep.includes("candler-cloud-test/src/components/Navbar.tsx"), true);
  assert.equal(keep.includes("candler-cloud-test/public/hero.txt"), true);
  assert.equal(keep.includes("candler-cloud-test/README.md"), true);
  assert.equal(keep.some((path) => path.includes("node_modules")), false);
  assert.equal(keep.some((path) => path.includes(".next")), false);
  assert.equal(skipped.some((item) => item.reason === "node_modules"), true);
  assert.equal(skipped.some((item) => item.reason === ".next"), true);
});
