import { AUTHORIZE_BATCH_SIZE, FIRST_AUTHORIZE_BATCH, PUT_CONCURRENCY_DEFAULT, PUT_CONCURRENCY_MAX, PUT_CONCURRENCY_MIN } from "@/lib/cloud/limits";
import { chunk, percentile } from "@/lib/cloud/stats";

export function authorizeBatches<T>(items: T[]) {
  if (items.length <= AUTHORIZE_BATCH_SIZE) return chunk(items, AUTHORIZE_BATCH_SIZE);
  return [items.slice(0, FIRST_AUTHORIZE_BATCH), ...chunk(items.slice(FIRST_AUTHORIZE_BATCH), AUTHORIZE_BATCH_SIZE)];
}

export async function runPipelinedBatches<TAuth, TUploaded>(
  batchCount: number,
  ops: {
    authorize: (index: number) => Promise<TAuth>;
    upload: (authorized: TAuth, index: number) => Promise<TUploaded>;
    finalize: (uploaded: TUploaded, index: number) => Promise<void>;
    isCancelled?: () => boolean;
  },
) {
  if (batchCount <= 0) return;
  let pendingFinalize = Promise.resolve();
  let authorized = await ops.authorize(0);
  for (let index = 0; index < batchCount; index++) {
    if (ops.isCancelled?.()) break;
    const nextAuth = index + 1 < batchCount ? ops.authorize(index + 1) : null;
    const uploaded = await ops.upload(authorized, index);
    pendingFinalize = pendingFinalize.then(() => ops.finalize(uploaded, index));
    if (nextAuth) authorized = await nextAuth;
  }
  await pendingFinalize;
}

export function expectedAuthorizeRequestCount(fileCount: number) {
  if (fileCount <= 0) return 0;
  return authorizeBatches(Array.from({ length: fileCount })).length;
}

export function nextPutConcurrency(current: number, recent429: number, recentPutMs: number[]) {
  const next = Math.min(PUT_CONCURRENCY_MAX, Math.max(PUT_CONCURRENCY_MIN, current));
  if (recent429 > 0) return Math.max(PUT_CONCURRENCY_MIN, next - 1);
  const p95 = percentile(recentPutMs, 95);
  if (p95 > 8000) return Math.max(PUT_CONCURRENCY_MIN, next - 1);
  if (recentPutMs.length >= 4 && p95 > 0 && p95 < 1500 && next < PUT_CONCURRENCY_MAX) return next + 1;
  return next;
}

export function initialPutConcurrency() {
  return PUT_CONCURRENCY_DEFAULT;
}
