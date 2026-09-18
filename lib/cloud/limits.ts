/** Shared Cloud transfer ceilings. Not quota math. */

export const MAX_FILES_PER_AUTHORIZE_BATCH = 100;
export const MAX_FILES_PER_FINALIZE_BATCH = 100;
/** Single-file authorize endpoint — burst abuse ceiling. */
export const MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE = 240;
/** Authenticated batch authorize — file rows per minute, still quota-checked. */
export const MAX_BATCH_AUTHORIZED_FILES_PER_MINUTE = 12_000;
export const PUT_CONCURRENCY_MIN = 4;
export const PUT_CONCURRENCY_MAX = 12;
export const PUT_CONCURRENCY_DEFAULT = 6;
export const AUTHORIZE_BATCH_SIZE = 100;
/** First authorize/hash group so PUTs can start before the rest of a large folder is hashed. */
export const FIRST_AUTHORIZE_BATCH = 12;
/**
 * `/api/cloud/upload/batch-authorize` Vercel/Fluid hard stop.
 * Do not raise this to paper over slow authorization — shrink the batch instead.
 *
 * 100-file work is a handful of DB round-trips (rate, quota, existing paths,
 * primed folder cache, batched folder inserts, two inserts) plus Promise.all
 * of local signed URLs. That fits well inside 60s; the client must abort first.
 */
export const AUTHORIZE_SERVER_MAX_DURATION_SECONDS = 60;
/** Client AbortController fires this far before the server hard kill. */
export const AUTHORIZE_CLIENT_TIMEOUT_SAFETY_MS = 15_000;
/** Auth + quota + existing-path + folder-cache floor for a tiny batch. */
export const AUTHORIZE_TIMEOUT_BASE_MS = 10_000;
/**
 * Conservative per-file budget on top of the base. Signing is parallel and
 * local; this mainly covers worst-case folder-cache misses, not 800ms serial PUTs.
 */
export const AUTHORIZE_TIMEOUT_PER_FILE_MS = 350;
export const FINALIZE_BATCH_SIZE = 100;
/** Private-beta Restore to Device ceiling — fail honestly above this. */
export const MAX_RESTORE_FILES = 2_000;
export const MAX_RESTORE_BYTES = 512 * 1024 * 1024;
