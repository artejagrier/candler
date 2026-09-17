/** Shared Cloud transfer ceilings. Not quota math. */

export const MAX_FILES_PER_AUTHORIZE_BATCH = 64;
export const MAX_FILES_PER_FINALIZE_BATCH = 64;
/** Single-file authorize endpoint — burst abuse ceiling. */
export const MAX_UPLOAD_AUTHORIZATIONS_PER_MINUTE = 240;
/** Authenticated batch authorize — file rows per minute, still quota-checked. */
export const MAX_BATCH_AUTHORIZED_FILES_PER_MINUTE = 8_000;
export const PUT_CONCURRENCY_MIN = 4;
export const PUT_CONCURRENCY_MAX = 8;
export const PUT_CONCURRENCY_DEFAULT = 6;
export const AUTHORIZE_BATCH_SIZE = 64;
/** First authorize/hash group so PUTs can start before the rest of a large folder is hashed. */
export const FIRST_AUTHORIZE_BATCH = 8;
export const FINALIZE_BATCH_SIZE = 64;
/** Private-beta Restore to Device ceiling — fail honestly above this. */
export const MAX_RESTORE_FILES = 2_000;
export const MAX_RESTORE_BYTES = 512 * 1024 * 1024;
