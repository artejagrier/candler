import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  CANCELED_RESTORE_TTL_MS,
  canCancelRestore,
  claimRestoreSlot,
  isRestoreActive,
  releaseRestoreSlot,
  restoreDownloadAllowed,
  runRestoreToDevice,
  shouldClearCanceledRestore,
  type RestorePhase,
} from "../lib/cloud/restore-client";

const FOLDER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function abortError() {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function waitFor(signal: AbortSignal) {
  return new Promise<never>((_, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    signal.addEventListener("abort", () => reject(abortError()), { once: true });
  });
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

async function until(predicate: () => boolean) {
  for (let i = 0; i < 25; i += 1) {
    if (predicate()) return;
    await flush();
  }
  throw new Error("timed out waiting for restore phase");
}

test("cancel during preparing does not start packaging or download", async () => {
  const controller = new AbortController();
  const downloaded: string[] = [];
  const phases: RestorePhase[] = [];
  let zipCalls = 0;
  const result = runRestoreToDevice({
    folderId: FOLDER,
    folderName: "cyber-vixen-studios copy",
    initialFiles: 20,
    initialBytes: 182,
    signal: controller.signal,
    fetchImpl: async (url, init) => {
      if (String(url).includes("manifest")) return waitFor(init?.signal ?? controller.signal) as Promise<Response>;
      zipCalls += 1;
      throw new Error("zip should not run");
    },
    download: (_blob, name) => downloaded.push(name),
    report: (state) => phases.push(state.phase),
  });
  await until(() => phases[0] === "preparing");
  controller.abort();
  assert.equal(await result, "canceled");
  assert.equal(phases.at(-1), "canceled");
  assert.equal(phases.includes("packaging"), false);
  assert.equal(zipCalls, 0);
  assert.equal(downloaded.length, 0);
});

test("cancel during packaging aborts the zip request and does not trigger download", async () => {
  const controller = new AbortController();
  const downloaded: string[] = [];
  const phases: RestorePhase[] = [];
  const result = runRestoreToDevice({
    folderId: FOLDER,
    folderName: "cyber-vixen-studios copy",
    initialFiles: 20,
    initialBytes: 182,
    signal: controller.signal,
    fetchImpl: async (url, init) => {
      if (String(url).includes("manifest")) {
        return {
          ok: true,
          json: async () => ({ files: 20, bytes: 182, zipName: "cyber-vixen-studios copy.zip" }),
        } as Response;
      }
      return waitFor(init?.signal ?? controller.signal) as Promise<Response>;
    },
    download: (_blob, name) => downloaded.push(name),
    report: (state) => phases.push(state.phase),
  });
  await until(() => phases.includes("packaging"));
  controller.abort();
  assert.equal(await result, "canceled");
  assert.equal(downloaded.length, 0);
  assert.equal(phases.at(-1), "canceled");
  assert.equal(phases.includes("done"), false);
});

test("cancel during download aborts before the browser download is handed off", async () => {
  const controller = new AbortController();
  const downloaded: string[] = [];
  const phases: RestorePhase[] = [];
  const result = runRestoreToDevice({
    folderId: FOLDER,
    folderName: "cyber-vixen-studios copy",
    initialFiles: 20,
    initialBytes: 182,
    signal: controller.signal,
    fetchImpl: async (url, init) => {
      if (String(url).includes("manifest")) {
        return {
          ok: true,
          json: async () => ({ files: 20, bytes: 182, zipName: "cyber-vixen-studios copy.zip" }),
        } as Response;
      }
      return {
        ok: true,
        blob: () => waitFor(init?.signal ?? controller.signal) as Promise<Blob>,
      } as Response;
    },
    download: (_blob, name) => downloaded.push(name),
    report: (state) => phases.push(state.phase),
  });
  await until(() => phases.includes("downloading"));
  controller.abort();
  assert.equal(await result, "canceled");
  assert.equal(downloaded.length, 0);
  assert.equal(restoreDownloadAllowed({ aborted: true, blobReady: true }), false);
});

test("completed restore still triggers a single download", async () => {
  const controller = new AbortController();
  const downloaded: string[] = [];
  const methods: string[] = [];
  const result = await runRestoreToDevice({
    folderId: FOLDER,
    folderName: "cyber-vixen-studios copy",
    initialFiles: 20,
    initialBytes: 182,
    signal: controller.signal,
    fetchImpl: async (url, init) => {
      methods.push((init as { method?: string } | undefined)?.method ?? "GET");
      if (String(url).includes("manifest")) {
        return {
          ok: true,
          json: async () => ({ files: 20, bytes: 182, zipName: "cyber-vixen-studios copy.zip" }),
        } as Response;
      }
      return {
        ok: true,
        blob: async () => new Blob([new Uint8Array(32)]),
      } as Response;
    },
    download: (_blob, name) => downloaded.push(name),
    report: () => undefined,
  });
  assert.equal(result, "done");
  assert.deepEqual(downloaded, ["cyber-vixen-studios copy.zip"]);
  assert.equal(methods.every((method) => method === "GET"), true);
});

test("repeated Restore clicks do not create duplicate jobs", () => {
  const busy = { current: false };
  assert.equal(claimRestoreSlot(busy), true);
  assert.equal(claimRestoreSlot(busy), false);
  assert.equal(claimRestoreSlot(busy), false);
  releaseRestoreSlot(busy);
  assert.equal(claimRestoreSlot(busy), true);
});

test("UI can start a new restore after cancel and clears the canceled banner", () => {
  const busy = { current: false };
  assert.equal(claimRestoreSlot(busy), true);
  releaseRestoreSlot(busy);
  assert.equal(claimRestoreSlot(busy), true);
  assert.equal(canCancelRestore("preparing"), true);
  assert.equal(canCancelRestore("packaging"), true);
  assert.equal(canCancelRestore("downloading"), true);
  assert.equal(canCancelRestore("canceled"), false);
  assert.equal(canCancelRestore("done"), false);
  assert.equal(isRestoreActive("canceled"), false);
  assert.equal(shouldClearCanceledRestore("canceled", CANCELED_RESTORE_TTL_MS), true);
  assert.equal(shouldClearCanceledRestore("canceled", 500), false);
  assert.equal(shouldClearCanceledRestore("done", CANCELED_RESTORE_TTL_MS), false);
});

test("canceled restore does not write Cloud records or delete R2 objects", () => {
  const client = readFileSync(new URL("../lib/cloud/restore-client.ts", import.meta.url), "utf8");
  const restore = readFileSync(new URL("../lib/cloud/restore.ts", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/cloud/restore/folder/[id]/route.ts", import.meta.url), "utf8");
  const browser = readFileSync(new URL("../components/cloud/CloudBrowser.tsx", import.meta.url), "utf8");
  const status = readFileSync(new URL("../components/cloud/CloudRestoreStatus.tsx", import.meta.url), "utf8");
  assert.equal(client.includes("method: \"PATCH\""), false);
  assert.equal(client.includes("method: \"DELETE\""), false);
  assert.equal(client.includes("deleteObject"), false);
  assert.equal(client.includes("/api/cloud/items/"), false);
  assert.equal(restore.includes("deleteObject"), false);
  assert.equal(restore.includes("status: \"backed_up\""), false);
  assert.equal(restore.includes(".update("), false);
  assert.equal(restore.includes("signal?.aborted"), true);
  assert.equal(route.includes("request.signal"), true);
  assert.equal(route.includes("streamRestoreZip(plan, request.signal)"), true);
  assert.equal(browser.includes("cancelRestore"), true);
  assert.equal(browser.includes("AbortController"), true);
  assert.equal(browser.includes("restoreAbortRef"), true);
  assert.equal(status.includes("Cancel restore"), true);
  assert.equal(status.includes("RESTORE_CANCELED_DETAIL"), true);
  assert.equal(client.includes("Your Cloud backup is unchanged."), true);
  assert.equal(status.includes("cloud-restore-cancel"), true);
});
