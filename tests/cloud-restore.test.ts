import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { finished } from "node:stream/promises";
import { MAX_RESTORE_BYTES, MAX_RESTORE_FILES } from "../lib/cloud/limits";
import {
  RESTORE_TOO_LARGE,
  planFolderRestore,
  sanitizeArchivePath,
  zipFileName,
  type RestoreFile,
  type RestoreFolder,
} from "../lib/cloud/restore-paths";
import { crc32Update, ZipStoreWriter } from "../lib/cloud/zip-store";

const ROOT = "11111111-1111-4111-8111-111111111111";
const APP = "22222222-2222-4222-8222-222222222222";
const COMPONENTS = "33333333-3333-4333-8333-333333333333";
const PUBLIC = "44444444-4444-4444-8444-444444444444";
const OTHER = "55555555-5555-4555-8555-555555555555";

const folders: RestoreFolder[] = [
  { id: ROOT, name: "cyber-vixen-studios copy", parent_id: null },
  { id: APP, name: "app", parent_id: ROOT },
  { id: COMPONENTS, name: "components", parent_id: ROOT },
  { id: PUBLIC, name: "public", parent_id: ROOT },
  { id: OTHER, name: "someone-else", parent_id: null },
];

function file(partial: Partial<RestoreFile> & Pick<RestoreFile, "id" | "original_filename" | "folder_id">): RestoreFile {
  return {
    relative_path: null,
    size_bytes: 12,
    status: "backed_up",
    deleted_at: null,
    ...partial,
  };
}

const projectFiles: RestoreFile[] = [
  file({
    id: "pkg",
    original_filename: "package.json",
    folder_id: ROOT,
    relative_path: "cyber-vixen-studios copy/package.json",
    size_bytes: 80,
  }),
  file({
    id: "readme",
    original_filename: "README.md",
    folder_id: ROOT,
    relative_path: "cyber-vixen-studios copy/README.md",
    size_bytes: 40,
  }),
  file({
    id: "page",
    original_filename: "page.tsx",
    folder_id: APP,
    relative_path: "app/page.tsx",
    size_bytes: 120,
  }),
  file({
    id: "nav",
    original_filename: "Navbar.tsx",
    folder_id: COMPONENTS,
    size_bytes: 200,
  }),
  file({
    id: "logo",
    original_filename: "logo.svg",
    folder_id: PUBLIC,
    relative_path: "cyber-vixen-studios copy/public/logo.svg",
    size_bytes: 64,
  }),
  file({
    id: "secret",
    original_filename: "secret.txt",
    folder_id: OTHER,
    size_bytes: 999,
  }),
];

test("sanitizeArchivePath blocks traversal, absolute, and reserved names", () => {
  assert.equal(sanitizeArchivePath("../../etc/passwd"), null);
  assert.equal(sanitizeArchivePath("cyber-vixen-studios copy/../../etc/passwd"), null);
  assert.equal(sanitizeArchivePath("/etc/passwd"), null);
  assert.equal(sanitizeArchivePath("C:\\Windows\\system.ini"), null);
  assert.equal(sanitizeArchivePath("foo\0bar"), null);
  assert.equal(sanitizeArchivePath("."), null);
  assert.equal(sanitizeArchivePath(".."), null);
  assert.equal(sanitizeArchivePath("app/page.tsx"), "app/page.tsx");
  assert.equal(sanitizeArchivePath("cyber-vixen-studios copy/package.json"), "cyber-vixen-studios copy/package.json");
});

test("zip names stay download-safe", () => {
  assert.equal(zipFileName("cyber-vixen-studios copy"), "cyber-vixen-studios copy.zip");
  assert.equal(zipFileName("foo/bar:baz"), "foo-bar-baz.zip");
  assert.equal(zipFileName(".."), "restore.zip");
});

test("folder restore keeps nested descendants and ignores other trees", () => {
  const planned = planFolderRestore({
    root: folders[0]!,
    folders,
    files: [
      ...projectFiles,
      file({ id: "failed", original_filename: "bad.txt", folder_id: ROOT, status: "failed", size_bytes: 50 }),
      file({ id: "trash", original_filename: "gone.txt", folder_id: APP, deleted_at: "2026-01-01T00:00:00Z", size_bytes: 50 }),
      file({ id: "up", original_filename: "wip.txt", folder_id: ROOT, status: "uploading", size_bytes: 50 }),
      file({ id: "trav", original_filename: "../../etc/passwd", folder_id: ROOT, size_bytes: 50 }),
    ],
    maxFiles: MAX_RESTORE_FILES,
    maxBytes: MAX_RESTORE_BYTES,
  });
  assert.equal("error" in planned, false);
  if ("error" in planned) return;
  const paths = planned.entries.map((entry) => entry.archivePath).sort();
  assert.deepEqual(paths, [
    "cyber-vixen-studios copy/README.md",
    "cyber-vixen-studios copy/app/page.tsx",
    "cyber-vixen-studios copy/components/Navbar.tsx",
    "cyber-vixen-studios copy/package.json",
    "cyber-vixen-studios copy/public/logo.svg",
  ]);
  assert.equal(paths.some((path) => path.includes("secret.txt")), false);
  assert.equal(paths.some((path) => path.includes("bad.txt") || path.includes("gone.txt") || path.includes("wip.txt") || path.includes("passwd")), false);
  assert.equal(planned.zipName, "cyber-vixen-studios copy.zip");
  assert.equal(planned.totalBytes, 80 + 40 + 120 + 200 + 64);
});

test("restore refuses oversized archives honestly", () => {
  const many = Array.from({ length: MAX_RESTORE_FILES + 1 }, (_, index) => file({
    id: `f${index}`,
    original_filename: `file-${index}.txt`,
    folder_id: ROOT,
  }));
  const tooMany = planFolderRestore({
    root: folders[0]!,
    folders,
    files: many,
    maxFiles: MAX_RESTORE_FILES,
    maxBytes: MAX_RESTORE_BYTES,
  });
  assert.deepEqual(tooMany, { error: RESTORE_TOO_LARGE, status: 413 });

  const tooBig = planFolderRestore({
    root: folders[0]!,
    folders,
    files: [file({ id: "huge", original_filename: "movie.mp4", folder_id: ROOT, size_bytes: MAX_RESTORE_BYTES + 1 })],
    maxFiles: MAX_RESTORE_FILES,
    maxBytes: MAX_RESTORE_BYTES,
  });
  assert.deepEqual(tooBig, { error: RESTORE_TOO_LARGE, status: 413 });
});

test("zip store writes nested paths without loading the whole archive first", async () => {
  assert.equal(crc32Update(Buffer.from("123456789")).toString(16), "cbf43926");
  const pass = new PassThrough();
  const chunks: Buffer[] = [];
  pass.on("data", (chunk: Buffer) => chunks.push(chunk));
  const zip = new ZipStoreWriter(pass);
  await zip.addFile("cyber-vixen-studios copy/package.json", async function* () {
    yield Buffer.from('{"name":"demo"}');
  }());
  await zip.addFile("cyber-vixen-studios copy/app/page.tsx", async function* () {
    yield Buffer.from("export default function Page() { return null }");
  }());
  await zip.finish();
  pass.end();
  await finished(pass);
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])), true);
  const names = storeZipNames(bytes);
  assert.deepEqual(names, [
    "cyber-vixen-studios copy/package.json",
    "cyber-vixen-studios copy/app/page.tsx",
  ]);
  assert.equal(storeZipFile(bytes, "cyber-vixen-studios copy/package.json").toString(), '{"name":"demo"}');
});

test("restore API keeps ownership on the server and never returns object keys", () => {
  const restore = readFileSync(new URL("../lib/cloud/restore.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/cloud/restore/folder/[id]/route.ts", import.meta.url), "utf8");
  const browser = readFileSync(new URL("../components/cloud/CloudBrowser.tsx", import.meta.url), "utf8");
  const library = readFileSync(new URL("../components/cloud/CloudLibrary.tsx", import.meta.url), "utf8");
  const details = readFileSync(new URL("../components/cloud/CloudDetails.tsx", import.meta.url), "utf8");
  const menu = readFileSync(new URL("../components/cloud/CloudActionMenu.tsx", import.meta.url), "utf8");
  const storage = readFileSync(new URL("../lib/cloud/storage.ts", import.meta.url), "utf8");

  assert.equal(restore.includes('.eq("workspace_id", context.workspaceId)'), true);
  assert.equal(restore.includes('.eq("owner_id", context.userId)'), true);
  assert.equal(restore.includes('.eq("status", "backed_up")'), true);
  assert.equal(restore.includes(".is(\"deleted_at\", null)"), true);
  assert.equal(restore.includes("getObjectBody"), true);
  assert.equal(restore.includes("signedDownloadUrl"), false);
  assert.equal(restore.includes("streamRestoreZip"), true);
  assert.equal(restore.includes("deleteObject"), false);
  assert.equal(restore.includes("signal?.aborted"), true);

  assert.equal(route.includes("requireCloudActor"), true);
  assert.equal(route.includes("folderName: plan.folderName"), true);
  assert.equal(route.includes("objectKey"), false);
  assert.equal(route.includes("object_key"), false);
  assert.equal(route.includes("application/zip"), true);
  assert.equal(route.includes("cloud.restored_to_device"), true);

  assert.equal(storage.includes("GetObjectCommand"), true);
  assert.equal(storage.includes("getObjectBody"), true);

  assert.equal(browser.includes("prompt("), false);
  assert.equal(browser.includes("confirm("), false);
  assert.equal(browser.includes("Destination folder id"), false);
  assert.equal(browser.includes("Move to folder"), true);
  assert.equal(browser.includes("Restore to Device"), true);
  assert.equal(browser.includes("runRestoreToDevice"), true);
  assert.equal(browser.includes("cancelRestore"), true);
  assert.equal(readFileSync(new URL("../lib/cloud/restore-client.ts", import.meta.url), "utf8").includes("/api/cloud/restore/folder/"), true);
  assert.equal(library.includes("Restore to Device"), true);
  assert.equal(library.includes("Restore to Cloud"), true);
  assert.equal(library.includes("Delete permanently"), true);
  assert.equal(menu.includes('aria-haspopup="menu"'), true);
  assert.equal(menu.includes('role="menu"'), true);
  assert.equal(details.includes("object_key"), false);
  assert.equal(details.includes("downloadUrl"), false);
});

function storeZipNames(bytes: Buffer) {
  const names: string[] = [];
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const sig = bytes.readUInt32LE(offset);
    if (sig === 0x02014b50 || sig === 0x06054b50) break;
    if (sig !== 0x04034b50) throw new Error(`Unexpected zip signature at ${offset}`);
    const nameLen = bytes.readUInt16LE(offset + 26);
    const extraLen = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    names.push(name);
    const dataStart = offset + 30 + nameLen + extraLen;
    const descriptor = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]), dataStart);
    if (descriptor < 0) throw new Error(`Missing data descriptor for ${name}`);
    const size = bytes.readUInt32LE(descriptor + 8);
    offset = descriptor + 16;
    assert.equal(descriptor, dataStart + size);
  }
  return names;
}

function storeZipFile(bytes: Buffer, wanted: string) {
  let offset = 0;
  while (offset + 30 <= bytes.length) {
    const sig = bytes.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const nameLen = bytes.readUInt16LE(offset + 26);
    const extraLen = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLen).toString("utf8");
    const dataStart = offset + 30 + nameLen + extraLen;
    const descriptor = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x07, 0x08]), dataStart);
    const size = bytes.readUInt32LE(descriptor + 8);
    if (name === wanted) return bytes.subarray(dataStart, dataStart + size);
    offset = descriptor + 16;
  }
  throw new Error(`Missing ${wanted}`);
}
