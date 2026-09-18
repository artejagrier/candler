import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  browserSignedPutHeaderNames,
  browserSignedPutHeaders,
  R2_BROWSER_PUT_CORS,
  R2_CORS_ALLOWED_HEADERS,
  R2_SIGNED_PUT_REQUEST_HEADERS,
} from "../lib/cloud/r2-cors";
import { expectedAuthorizeRequestCount } from "../lib/cloud/pipeline";
import {
  AUTHORIZE_BATCH_SIZE,
  AUTHORIZE_CLIENT_TIMEOUT_SAFETY_MS,
  AUTHORIZE_SERVER_MAX_DURATION_SECONDS,
  FIRST_AUTHORIZE_BATCH,
  PUT_CONCURRENCY_DEFAULT,
  PUT_CONCURRENCY_MAX,
  PUT_CONCURRENCY_MIN,
} from "../lib/cloud/limits";
import {
  authorizeClientTimeoutCapMs,
  authorizeServerLimitMs,
  authorizeTimeoutMs,
  classifyCrossOriginFetchError,
  classifyPutBodyHint,
  describeTransferFailure,
  fetchWithRetry,
  isUnresolvedTransferStatus,
  pickReusableAuthorizeFile,
  retryDelayMs,
  shouldReauthorizePut,
  TRANSFER_RETRIES,
  TransferCancelled,
} from "../lib/cloud/transfer";
import { summarizeBackup } from "../lib/cloud/backup-state";

function hungFetch(_input: RequestInfo | URL, init?: RequestInit) {
  return new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    }, { once: true });
  });
}

test("CORS preflight requirements match signed PUT headers", () => {
  const sent = browserSignedPutHeaderNames();
  assert.deepEqual(sent, ["content-type", "x-amz-checksum-sha256"]);
  assert.deepEqual([...R2_SIGNED_PUT_REQUEST_HEADERS].sort(), sent);
  for (const header of sent) {
    assert.equal(R2_CORS_ALLOWED_HEADERS.includes(header as typeof R2_CORS_ALLOWED_HEADERS[number]), true);
  }
  const policy = R2_BROWSER_PUT_CORS[0];
  assert.equal(policy?.AllowedMethods.includes("PUT"), true);
  assert.equal(JSON.stringify(policy).includes("\"*\""), false);
  const headers = browserSignedPutHeaders("text/plain", `${"A".repeat(43)}=`);
  assert.equal(headers["Content-Type"], "text/plain");
  assert.equal(headers["x-amz-checksum-sha256"].endsWith("="), true);
});

test("authorization batches survive transient network failure and retry", async () => {
  let n = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    n += 1;
    if (n < 3) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }) as typeof fetch;
  try {
    const response = await fetchWithRetry("/api/cloud/upload/batch-authorize", { method: "POST" }, { retries: 3 });
    assert.equal(response.status, 200);
    assert.equal(n, 3);
  } finally {
    globalThis.fetch = original;
  }
});

test("persistent CORS does not retry forever", async () => {
  let n = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    n += 1;
    throw new TypeError("CORS preflight blocked");
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => fetchWithRetry("https://r2.example/object", { method: "PUT" }, { retries: 5 }),
      /CORS preflight blocked/,
    );
    assert.equal(n, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("PUT retries 5xx and expired URL is reauthorized", async () => {
  let n = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async () => {
    n += 1;
    if (n < 3) return new Response("no", { status: 503 });
    return new Response("ok", { status: 200 });
  }) as typeof fetch;
  try {
    const response = await fetchWithRetry("https://r2.example/object", { method: "PUT" });
    assert.equal(response.status, 200);
    assert.equal(n, 3);
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(shouldReauthorizePut(403, "expired signed URL"), true);
  assert.equal(shouldReauthorizePut(403, "signature mismatch"), true);
  assert.equal(shouldReauthorizePut(400, "invalid request"), false);
  assert.equal(classifyPutBodyHint("<Error><Code>ExpiredToken</Code></Error>"), "expired signed URL");
});

test("successful files are not unresolved after verify", () => {
  assert.equal(isUnresolvedTransferStatus("backed_up"), false);
  assert.equal(isUnresolvedTransferStatus("skipped"), false);
  assert.equal(isUnresolvedTransferStatus("failed"), true);
  assert.equal(isUnresolvedTransferStatus("uploading"), true);
  const cancelled = summarizeBackup(
    [{ status: "backed_up" }, { status: "uploading" }, { status: "failed" }],
    true,
  );
  assert.equal(cancelled.complete, false);
  assert.equal(cancelled.outcome, "cancelled");
  assert.equal(cancelled.verified, 1);
  assert.equal(cancelled.percent < 100, true);
});

test("authorize client timeout sits below the server hard stop with a safety margin", () => {
  const route = readFileSync(new URL("../app/api/cloud/upload/batch-authorize/route.ts", import.meta.url), "utf8");
  assert.match(route, /export const maxDuration = 60/);
  assert.equal(AUTHORIZE_SERVER_MAX_DURATION_SECONDS, 60);
  assert.equal(authorizeServerLimitMs(), 60_000);
  assert.equal(AUTHORIZE_BATCH_SIZE, 100);

  const full = authorizeTimeoutMs(AUTHORIZE_BATCH_SIZE);
  const first = authorizeTimeoutMs(FIRST_AUTHORIZE_BATCH);
  const cap = authorizeClientTimeoutCapMs();
  assert.equal(full < authorizeServerLimitMs(), true);
  assert.equal(full <= cap, true);
  assert.equal(cap, authorizeServerLimitMs() - AUTHORIZE_CLIENT_TIMEOUT_SAFETY_MS);
  assert.equal(AUTHORIZE_CLIENT_TIMEOUT_SAFETY_MS >= 10_000, true);
  assert.equal(full, 45_000);
  assert.equal(first < full, true);
  assert.equal(first >= 10_000, true);
  assert.equal(authorizeTimeoutMs(10_000) <= cap, true);
});

test("27,704-file authorization stays batched", () => {
  const requests = expectedAuthorizeRequestCount(27_704);
  assert.equal(requests, 1 + Math.ceil((27_704 - FIRST_AUTHORIZE_BATCH) / AUTHORIZE_BATCH_SIZE));
  assert.equal(requests, 278);
  assert.equal(requests < 27_704, true);
});

test("authorization timeout aborts the request, retries with bounded backoff, then recovers", async () => {
  let n = 0;
  let aborted = 0;
  const retries: number[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    n += 1;
    if (n < 3) {
      return hungFetch(_input, init).catch((error) => {
        if (init?.signal?.aborted) aborted += 1;
        throw error;
      });
    }
    return new Response(JSON.stringify({ results: [] }), { status: 200 });
  }) as typeof fetch;
  try {
    const response = await fetchWithRetry("/api/cloud/upload/batch-authorize", { method: "POST" }, {
      retries: TRANSFER_RETRIES,
      timeoutMs: 40,
      onRetry: () => retries.push(Date.now()),
    });
    assert.equal(response.status, 200);
    assert.equal(n, 3);
    assert.equal(aborted, 2);
    assert.equal(retries.length, 2);
  } finally {
    globalThis.fetch = original;
  }
  assert.equal(retryDelayMs(1, null), 500);
  assert.equal(retryDelayMs(2, null), 1_000);
  assert.equal(retryDelayMs(3, null), 2_000);
  assert.equal(retryDelayMs(20, null), 8_000);
  assert.match(
    describeTransferFailure({ relativePath: "src/a.ts", stage: "authorize", error: new Error("Upload timed out.") }),
    /authorization timed out \(network\)/,
  );
});

test("Cancel Backup aborts authorization without retrying", async () => {
  let n = 0;
  const original = globalThis.fetch;
  const controller = new AbortController();
  globalThis.fetch = (async (_input, init) => {
    n += 1;
    setTimeout(() => controller.abort(), 5);
    return hungFetch(_input, init);
  }) as typeof fetch;
  try {
    await assert.rejects(
      () => fetchWithRetry("/api/cloud/upload/batch-authorize", { method: "POST" }, {
        signal: controller.signal,
        retries: 5,
        timeoutMs: 45_000,
      }),
      (error) => error instanceof TransferCancelled,
    );
    assert.equal(n, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("failed authorize batches stay recoverable and do not redo successful work", () => {
  assert.equal(isUnresolvedTransferStatus("failed"), true);
  assert.equal(isUnresolvedTransferStatus("queued"), true);
  assert.equal(isUnresolvedTransferStatus("authorizing"), true);
  assert.equal(isUnresolvedTransferStatus("backed_up"), false);
  assert.equal(isUnresolvedTransferStatus("skipped"), false);

  const skip = pickReusableAuthorizeFile([
    { id: "done", status: "backed_up", size_bytes: 10, checksum_sha256: "abc", object_key: "k1" },
  ], { size: 10, checksumSha256: "abc" });
  assert.equal(skip.action, "skip");
  if (skip.action === "skip") assert.equal(skip.file.id, "done");

  const resign = pickReusableAuthorizeFile([
    { id: "wip", status: "uploading", size_bytes: 10, checksum_sha256: "abc", object_key: "k2" },
  ], { size: 10, checksumSha256: "abc" });
  assert.equal(resign.action, "resign");
  if (resign.action === "resign") assert.equal(resign.file.id, "wip");

  const create = pickReusableAuthorizeFile([
    { id: "old", status: "backed_up", size_bytes: 10, checksum_sha256: "old", object_key: "k3" },
  ], { size: 10, checksumSha256: "new" });
  assert.equal(create.action, "create");

  const authorize = readFileSync(new URL("../lib/cloud/authorize.ts", import.meta.url), "utf8");
  assert.equal(authorize.includes("pickReusableAuthorizeFile"), true);
  assert.equal(authorize.includes("uploading"), true);
});

test("zero exclusions and all-files-verified remain required", () => {
  const complete = summarizeBackup(Array.from({ length: 27_704 }, () => ({ status: "backed_up" })));
  assert.equal(complete.complete, true);
  assert.equal(complete.verified, 27_704);
  const almost = summarizeBackup([
    ...Array.from({ length: 27_703 }, () => ({ status: "backed_up" })),
    { status: "failed" },
  ]);
  assert.equal(almost.complete, false);
  assert.equal(almost.verified, 27_703);
  assert.equal(almost.percent < 100, true);
});

test("Cloud browser resumes unresolved files and reauthorizes expired PUTs", () => {
  const browser = readFileSync(new URL("../components/cloud/CloudBrowser.tsx", import.meta.url), "utf8");
  const transfer = readFileSync(new URL("../components/cloud/CloudTransfer.tsx", import.meta.url), "utf8");
  assert.equal(browser.includes("isUnresolvedTransferStatus"), true);
  assert.equal(browser.includes("shouldReauthorizePut"), true);
  assert.equal(browser.includes("browserSignedPutHeaders"), true);
  assert.equal(browser.includes("authorizeTimeoutMs"), true);
  assert.equal(browser.includes("AbortController"), true);
  assert.equal(browser.includes("live.status === \"backed_up\" || live.status === \"skipped\""), true);
  assert.equal(PUT_CONCURRENCY_MIN, 4);
  assert.equal(PUT_CONCURRENCY_MAX, 12);
  assert.equal(PUT_CONCURRENCY_DEFAULT, 6);
  assert.equal(transfer.includes("Cancel Backup"), true);
  assert.equal(transfer.includes("Keep Backing Up"), true);
  assert.equal(transfer.includes("Files already verified by Candler"), true);
  assert.equal(transfer.includes("candler-system-rail"), true);
  assert.equal(classifyCrossOriginFetchError(new Error("Failed to fetch")), "network");
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", error: new Error("Failed to fetch") }), /network failure/);
  assert.match(describeTransferFailure({ relativePath: "a.ts", stage: "put", kind: "cors" }), /CORS preflight/);
});
