import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { CLOUD_PLANS } from "../lib/cloud/quota";
import { formatQuotaAmount, formatUsageSummary, formatUsedGb, formatBytes } from "../lib/cloud/display";
import {
  buildCloudLibrary,
  folderCountLabel,
  folderLocalDeleteSafety,
  folderStatus,
  rootListingNames,
  type LibraryFile,
  type LibraryFolder,
} from "../lib/cloud/library";

const folders: LibraryFolder[] = [
  { id: "root", name: "Candler-Cloud-Test", parent_id: null, updated_at: "2026-01-01T00:00:00Z" },
  { id: "src", name: "src", parent_id: "root", updated_at: "2026-01-02T00:00:00Z" },
  { id: "components", name: "components", parent_id: "src", updated_at: "2026-01-03T00:00:00Z" },
  { id: "public", name: "public", parent_id: "root", updated_at: "2026-01-02T00:00:00Z" },
  { id: "other", name: "Project B", parent_id: null, updated_at: "2026-01-04T00:00:00Z" },
];

function file(partial: Partial<LibraryFile> & Pick<LibraryFile, "id" | "original_filename" | "folder_id" | "size_bytes">): LibraryFile {
  return {
    mime_type: "text/plain",
    status: "backed_up",
    updated_at: "2026-01-05T00:00:00Z",
    ...partial,
  };
}

const files: LibraryFile[] = [
  file({ id: "readme", original_filename: "README.md", folder_id: "root", size_bytes: 4200 }),
  file({ id: "pkg", original_filename: "package.json", folder_id: "root", size_bytes: 1800 }),
  file({ id: "index", original_filename: "index.js", folder_id: "src", size_bytes: 7400 }),
  file({ id: "nav", original_filename: "Navbar.tsx", folder_id: "components", size_bytes: Math.round(12.6 * 1024 * 1024) }),
  file({ id: "hero", original_filename: "hero.png", folder_id: "public", size_bytes: Math.round(25.6 * 1024 * 1024) }),
  file({ id: "photo", original_filename: "photo.png", folder_id: null, size_bytes: 842 }),
  file({ id: "notes", original_filename: "notes.txt", folder_id: null, size_bytes: 1200 }),
  file({ id: "b1", original_filename: "only.txt", folder_id: "other", size_bytes: 500 }),
];

test("top-level listing is folders plus loose files, not nested files", () => {
  const index = buildCloudLibrary(folders, files);
  assert.deepEqual(rootListingNames(index), ["Candler-Cloud-Test", "Project B", "notes.txt", "photo.png"]);
  assert.equal(index.rootFiles.some((item) => item.original_filename === "Navbar.tsx"), false);
  assert.equal((index.filesByFolder.get("src") ?? []).map((item) => item.original_filename).includes("index.js"), true);
});

test("folder aggregate size counts only backed-up descendants", () => {
  const mixed: LibraryFile[] = [
    file({ id: "ok", original_filename: "ok.txt", folder_id: "root", size_bytes: 1000, status: "backed_up" }),
    file({ id: "bad", original_filename: "bad.txt", folder_id: "src", size_bytes: 9000, status: "failed" }),
    file({ id: "up", original_filename: "up.txt", folder_id: "public", size_bytes: 8000, status: "uploading" }),
  ];
  const index = buildCloudLibrary(folders, mixed);
  const root = index.summaries.get("root");
  assert.equal(root?.sizeBytes, 1000);
  assert.equal(root?.fileCount, 3);
  assert.equal(root?.backedUp, 1);
  assert.equal(root?.failed, 1);
  assert.equal(root?.uploading, 1);
});

test("nested folder size includes all descendant backed-up files", () => {
  const index = buildCloudLibrary(folders, files);
  const root = index.summaries.get("root");
  const src = index.summaries.get("src");
  const expectedRoot =
    4200 + 1800 + 7400 + Math.round(12.6 * 1024 * 1024) + Math.round(25.6 * 1024 * 1024);
  assert.equal(root?.sizeBytes, expectedRoot);
  assert.equal(src?.fileCount, 2);
  assert.equal(src?.folderCount, 1);
  assert.equal(root?.fileCount, 5);
  assert.equal(root?.folderCount, 3);
  assert.equal(folderCountLabel(root!), "5 files · 3 folders");
  assert.equal(folderStatus(root!).label, "Backed up");
  assert.equal(folderLocalDeleteSafety(root!), "allowed");
});

test("folder status stays partial when a child failed", () => {
  const mixed = files.map((item) => item.id === "nav" ? { ...item, status: "failed" } : item);
  const index = buildCloudLibrary(folders, mixed);
  const status = folderStatus(index.summaries.get("root")!);
  assert.equal(status.label, "Incomplete");
  assert.equal(status.cls, "warning");
  assert.equal(folderLocalDeleteSafety(index.summaries.get("root")!), "blocked");
});

test("uploading summary uses a concise processing status", () => {
  const mixed = [
    file({ id: "a", original_filename: "a.txt", folder_id: "other", size_bytes: 10, status: "backed_up" }),
    file({ id: "b", original_filename: "b.txt", folder_id: "other", size_bytes: 10, status: "uploading" }),
    file({ id: "c", original_filename: "c.txt", folder_id: "other", size_bytes: 10, status: "verifying" }),
  ];
  const index = buildCloudLibrary(folders, mixed);
  assert.equal(folderStatus(index.summaries.get("other")!).label, "Uploading");
});

test("file sizes stay human readable and quota uses the live plan scale", () => {
  assert.equal(formatBytes(842), "842 B");
  assert.equal(formatBytes(12.4 * 1024).startsWith("12.4"), true);
  assert.equal(formatQuotaAmount(CLOUD_PLANS.free.bytes), "10 GB");
  assert.equal(formatQuotaAmount(CLOUD_PLANS.pro.bytes), "50 GB");
  assert.equal(formatQuotaAmount(CLOUD_PLANS.cloud500.bytes), "500 GB");
  assert.equal(formatQuotaAmount(CLOUD_PLANS.cloud1tb.bytes), "1 TB");
  const mid = formatUsageSummary(379 * 1024 ** 2, CLOUD_PLANS.free.bytes);
  assert.equal(mid.usedLabel === "0.00 GB", false);
  assert.equal(mid.usedLabel, "0.37 GB");
  assert.equal(mid.quotaLabel, "10 GB");
  assert.equal(mid.secondary, "379.0 MB used");
  assert.equal(formatUsedGb(2.43 * 1024 ** 3), "2.43 GB");
});

test("cloud library stays collapsed by default and keeps transfer internals", () => {
  const library = readFileSync(new URL("../components/cloud/CloudLibrary.tsx", import.meta.url), "utf8");
  const browser = readFileSync(new URL("../components/cloud/CloudBrowser.tsx", import.meta.url), "utf8");
  assert.equal(library.includes("aria-expanded"), true);
  assert.equal(library.includes("useState<Set<string>>(() => new Set())"), true);
  assert.equal(library.includes("Restore to Device"), true);
  assert.equal(library.includes("CloudActionMenu"), true);
  assert.equal(browser.includes("CloudLibrary"), true);
  assert.equal(browser.includes("CloudTransfer"), true);
  assert.equal(browser.includes("runPipelinedBatches"), true);
  assert.equal(browser.includes("location.reload"), false);
  assert.equal(browser.includes("prompt("), false);
  assert.equal(browser.includes("confirm("), false);
});
