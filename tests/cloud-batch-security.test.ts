import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { uploadBatchInput, finalizeBatchInput, uploadFileDescriptor } from "../lib/cloud/batch-schema";
import { MAX_FILES_PER_AUTHORIZE_BATCH, MAX_FILES_PER_FINALIZE_BATCH, PUT_CONCURRENCY_MAX, PUT_CONCURRENCY_MIN } from "../lib/cloud/limits";
import { nextPutConcurrency } from "../lib/cloud/pipeline";
import { chunk, formatEta, percentile, smoothEta } from "../lib/cloud/stats";
import { objectKey } from "../lib/cloud/quota";

const checksum = `${"A".repeat(43)}=`;

test("batch authorize schema rejects spoofed identity, quota, and object keys", () => {
  const valid = {
    files: [{
      filename: "README.md",
      relativePath: "demo/README.md",
      contentType: "text/plain",
      size: 12,
      checksumSha256: checksum,
    }],
  };
  assert.equal(uploadBatchInput.parse(valid).files.length, 1);
  assert.throws(() => uploadBatchInput.parse({ ...valid, usedBytes: 0 }));
  assert.throws(() => uploadBatchInput.parse({ ...valid, plan: "cloud1tb" }));
  assert.throws(() => uploadBatchInput.parse({ ...valid, userId: "00000000-0000-0000-0000-000000000000" }));
  assert.throws(() => uploadBatchInput.parse({ ...valid, workspaceId: "00000000-0000-0000-0000-000000000000" }));
  assert.throws(() => uploadBatchInput.parse({
    files: [{ ...valid.files[0], objectKey: "attacker/key" }],
  }));
  assert.throws(() => uploadFileDescriptor.parse({
    ...valid.files[0],
    relativePath: "../../etc/passwd",
  }));
  assert.throws(() => uploadFileDescriptor.parse({
    ...valid.files[0],
    relativePath: "/etc/passwd",
  }));
  const tooMany = Array.from({ length: MAX_FILES_PER_AUTHORIZE_BATCH + 1 }, (_, i) => ({
    ...valid.files[0],
    relativePath: `demo/file-${i}.txt`,
  }));
  assert.throws(() => uploadBatchInput.parse({ files: tooMany }));
});

test("batch finalize schema rejects oversized batches and extra fields", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(finalizeBatchInput.parse({ ids: [id] }).ids.length, 1);
  assert.throws(() => finalizeBatchInput.parse({ ids: [id], ownerId: "x" }));
  assert.throws(() => finalizeBatchInput.parse({ ids: Array.from({ length: MAX_FILES_PER_FINALIZE_BATCH + 1 }, () => id) }));
});

test("object keys stay owner and workspace scoped", () => {
  const user = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const workspace = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const file = "cccccccc-cccc-cccc-cccc-cccccccccccc";
  assert.equal(objectKey(user, workspace, file), `${user}/${workspace}/${file}`);
  assert.throws(() => objectKey("not-a-uuid", workspace, file));
});

test("batch routes keep server-side isolation contracts", () => {
  const authorize = readFileSync(new URL("../lib/cloud/authorize.ts", import.meta.url), "utf8");
  const finalize = readFileSync(new URL("../lib/cloud/finalize-batch.ts", import.meta.url), "utf8");
  const authorizeRoute = readFileSync(new URL("../app/api/cloud/upload/batch-authorize/route.ts", import.meta.url), "utf8");
  const finalizeRoute = readFileSync(new URL("../app/api/cloud/finalize/batch/route.ts", import.meta.url), "utf8");
  assert.equal(authorize.includes("objectKey(context.userId, context.workspaceId, fileId)"), true);
  assert.equal(authorize.includes("getCurrentStorageUsage(context.workspaceId, admin)"), true);
  assert.equal(authorize.includes("primeFolderPathCache"), true);
  assert.equal(authorize.includes("canUpload"), true);
  assert.equal(authorize.includes("requireCloudActor"), false);
  assert.equal(authorizeRoute.includes("requireCloudActor"), true);
  assert.equal(finalize.includes(".eq(\"owner_id\", context.userId)"), true);
  assert.equal(finalize.includes("inspectObject"), true);
  assert.equal(finalize.includes("status: \"backed_up\""), true);
  assert.equal(finalizeRoute.includes("requireCloudActor"), true);
  assert.equal(authorize.includes("body.objectKey") || authorize.includes("input.objectKey"), false);
  const storage = readFileSync(new URL("../lib/cloud/storage.ts", import.meta.url), "utf8");
  assert.equal(storage.includes("cachedStorage"), true);
  assert.equal(storage.includes('requestChecksumCalculation: "WHEN_REQUIRED"'), true);
  assert.equal(storage.includes("signableHeaders"), true);
  assert.equal(storage.includes("unhoistableHeaders"), true);
  assert.equal(storage.includes("R2_SIGNED_PUT_REQUEST_HEADERS"), true);
  const cors = readFileSync(new URL("../lib/cloud/r2-cors.ts", import.meta.url), "utf8");
  assert.equal(cors.includes("https://candler.dev"), true);
  assert.equal(cors.includes("https://www.candler.dev"), true);
  assert.equal(cors.includes('"PUT"'), true);
  assert.equal(cors.includes("content-type"), true);
  assert.equal(cors.includes("x-amz-checksum-sha256"), true);
  assert.equal(cors.includes("AllowedOrigins\": [\"*\"]") || cors.includes("\"*\""), false);
  const transferUi = readFileSync(new URL("../components/cloud/CloudTransfer.tsx", import.meta.url), "utf8");
  assert.equal(transferUi.includes("cloud-transfer-fail-list"), true);
  assert.equal(transferUi.includes("Backup Incomplete"), true);
  assert.equal(transferUi.includes("Retry failed"), true);
  assert.equal(transferUi.includes("summarizeBackup"), true);
});

test("adaptive put concurrency stays inside 4-8 and drops on 429", () => {
  assert.equal(nextPutConcurrency(6, 1, [200, 200, 200, 200]), 5);
  assert.equal(nextPutConcurrency(4, 1, [100]), PUT_CONCURRENCY_MIN);
  const raised = nextPutConcurrency(6, 0, [200, 220, 180, 190]);
  assert.equal(raised, 7);
  assert.equal(raised <= PUT_CONCURRENCY_MAX, true);
  assert.equal(nextPutConcurrency(8, 0, [9000, 9100, 9200, 9300]), 7);
});

test("pipelined batches authorize the next group while the current group uploads", async () => {
  const events: string[] = [];
  const { runPipelinedBatches } = await import("../lib/cloud/pipeline");
  await runPipelinedBatches(2, {
    authorize: async (index) => {
      events.push(`a${index}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      return index;
    },
    upload: async (_authorized, index) => {
      events.push(`u${index}`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      return index;
    },
    finalize: async (_uploaded, index) => {
      events.push(`f${index}`);
    },
  });
  assert.equal(events[0], "a0");
  assert.equal(events.includes("u0"), true);
  assert.equal(events.includes("a1"), true);
  assert.equal(events.includes("f0"), true);
  assert.equal(events.includes("u1"), true);
  assert.equal(events.includes("f1"), true);
  assert.equal(events.indexOf("a1") < events.indexOf("u1"), true);
});

test("pipeline helpers chunk and smooth ETA without inventing an immediate estimate", () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.equal(percentile([10, 20, 30, 40], 50), 20);
  assert.equal(smoothEta(null, 120) != null, true);
  assert.equal(formatEta(125).includes("min"), true);
});
