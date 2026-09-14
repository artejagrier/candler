/**
 * Client transfer helpers: bounded workers, 429/5xx retry, per-file lifecycle.
 * Does not change R2 signing, quota math, or who may set backed_up.
 */

export const TRANSFER_CONCURRENCY = 4;
export const TRANSFER_RETRIES = 3;

export type TransferStatus =
  | "queued"
  | "authorizing"
  | "uploading"
  | "verifying"
  | "backed_up"
  | "failed"
  | "skipped";

export type TransferItem = {
  id: string;
  relativePath: string;
  size: number;
  status: TransferStatus;
  error?: string;
  reason?: string;
};

export type TransferProfile = {
  filesFound: number;
  skippedGenerated: number;
  skippedUnchanged: number;
  uploaded: number;
  failed: number;
  bytes: number;
  scanMs: number;
  hashAvgMs: number;
  hashP50Ms: number;
  hashP95Ms: number;
  authorizeRequests: number;
  authorizeAvgMs: number;
  authorizeP50Ms: number;
  authorizeP95Ms: number;
  authorizeServer?: string;
  putRequests: number;
  putAvgMs: number;
  putP50Ms: number;
  putP95Ms: number;
  finalizeRequests: number;
  finalizeAvgMs: number;
  finalizeP50Ms: number;
  finalizeP95Ms: number;
  count429: number;
  retries: number;
  putConcurrency: number;
  totalMs: number;
  failures?: string[];
};

export type AuthorizeServerTimings = {
  actorMs?: number;
  projectMs?: number;
  rateLimitMs?: number;
  quotaMs?: number;
  existingMs?: number;
  foldersMs?: number;
  insertMs?: number;
  signMs?: number;
  totalMs?: number;
};

function leafName(relativePath: string) {
  return relativePath.split("/").filter(Boolean).at(-1) ?? relativePath;
}

export function sanitizeErrorText(value: unknown) {
  let raw = value instanceof Error ? value.message : value ? String(value) : "";
  raw = raw.replace(/https?:\/\/[^\s"'<>]+/gi, "[url]");
  raw = raw.replace(/X-Amz-[^=\s]+=[^\s&]+/gi, "");
  raw = raw.replace(/\bAWS[A-Z0-9]{16,}\b/g, "[id]");
  return raw.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function isUsableUploadUrl(url: unknown): url is string {
  return typeof url === "string" && /^https:\/\//i.test(url) && url.length > 16 && url.length < 8000;
}

export function formatAuthorizeTimings(timings?: AuthorizeServerTimings | null) {
  if (!timings) return undefined;
  const parts = [
    timings.actorMs != null ? `actor ${Math.round(timings.actorMs)}ms` : null,
    timings.projectMs != null ? `project ${Math.round(timings.projectMs)}ms` : null,
    timings.rateLimitMs != null ? `rate ${Math.round(timings.rateLimitMs)}ms` : null,
    timings.quotaMs != null ? `quota ${Math.round(timings.quotaMs)}ms` : null,
    timings.existingMs != null ? `existing ${Math.round(timings.existingMs)}ms` : null,
    timings.foldersMs != null ? `folders ${Math.round(timings.foldersMs)}ms` : null,
    timings.insertMs != null ? `insert ${Math.round(timings.insertMs)}ms` : null,
    timings.signMs != null ? `sign ${Math.round(timings.signMs)}ms` : null,
    timings.totalMs != null ? `total ${Math.round(timings.totalMs)}ms` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export class TransferCancelled extends Error {
  constructor() {
    super("Upload cancelled.");
    this.name = "TransferCancelled";
  }
}

export function classifyCrossOriginFetchError(error: unknown): "cors" | "network" | "aborted" {
  if (error instanceof TransferCancelled) return "aborted";
  if (typeof DOMException !== "undefined" && error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return error.name === "TimeoutError" ? "network" : "aborted";
  }
  const raw = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  if (/abort/i.test(raw)) return "aborted";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "network";
  if (/failed to fetch|networkerror|load failed|failed to load/i.test(raw)) return "cors";
  return "network";
}

export function describeTransferFailure(input: {
  relativePath: string;
  stage: "authorize" | "put" | "verify";
  status?: number;
  error?: unknown;
  uploadUrlMissing?: boolean;
  malformedUploadUrl?: boolean;
  bodyHint?: string;
  kind?: "cors" | "network" | "aborted";
}) {
  const name = leafName(input.relativePath);
  if (input.uploadUrlMissing) return `${name} — authorization returned no upload URL`;
  if (input.malformedUploadUrl) return `${name} — malformed upload URL`;
  if (input.stage === "put" && input.status) {
    const hint = input.bodyHint ? ` (${input.bodyHint})` : "";
    if (input.status === 400) return `${name} — PUT HTTP 400${hint}`;
    if (input.status === 403) return `${name} — PUT HTTP 403${hint}`;
    if (input.status >= 500) return `${name} — PUT HTTP ${input.status}${hint}`;
    return `${name} — PUT HTTP ${input.status}${hint}`;
  }
  const raw = sanitizeErrorText(input.error);
  if (/could not be found at the time an operation was processed/i.test(String(input.error ?? raw))) {
    return `${name} — file handle expired after hashing`;
  }
  if (input.stage === "put") {
    const kind = input.kind ?? (input.error ? classifyCrossOriginFetchError(input.error) : undefined);
    if (kind === "aborted") return `${name} — PUT aborted`;
    if (kind === "cors") return `${name} — PUT blocked by CORS preflight`;
    if (kind === "network") return `${name} — PUT network failure`;
  }
  if (/failed to fetch|networkerror|load failed|failed to load/i.test(raw)) {
    if (input.stage === "authorize") return `${name} — authorization blocked (network)`;
    if (input.stage === "verify") return `${name} — verification blocked (network)`;
    return `${name} — PUT blocked by CORS preflight`;
  }
  if (input.stage === "authorize") return `${name} — ${raw || "authorization failed"}`;
  if (input.stage === "verify") return `${name} — ${raw || "verification failed"}`;
  return `${name} — ${raw || "PUT failed"}`;
}

export function classifyPutBodyHint(text: string) {
  if (/SignatureDoesNotMatch/i.test(text)) return "signature mismatch";
  if (/AccessDenied/i.test(text)) return "access denied";
  if (/checksum|XAmzContentSHA256Mismatch/i.test(text)) return "checksum mismatch";
  if (/InvalidRequest|IncompleteBody|EntityTooSmall/i.test(text)) return "invalid request";
  return undefined;
}

export function retryDelayMs(attempt: number, retryAfterHeader: string | null) {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000);
    const date = Date.parse(retryAfterHeader);
    if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), 30_000);
  }
  return Math.min(500 * 2 ** (attempt - 1), 8_000);
}

export async function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => resolve(), ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new TransferCancelled());
    };
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        reject(new TransferCancelled());
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: {
    retries?: number;
    signal?: AbortSignal;
    on429?: () => void;
    onRetry?: () => void;
  },
): Promise<Response> {
  const retries = options?.retries ?? TRANSFER_RETRIES;
  const signal = options?.signal ?? init.signal ?? undefined;
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (signal?.aborted) throw new TransferCancelled();
    try {
      const response = await fetch(input, { ...init, signal });
      if (response.status === 429) options?.on429?.();
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < retries) {
        options?.onRetry?.();
        await sleep(retryDelayMs(attempt, response.headers.get("Retry-After")), signal);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (error instanceof TransferCancelled || (error instanceof DOMException && error.name === "AbortError")) {
        throw new TransferCancelled();
      }
      const message = error instanceof Error ? error.message : String(error ?? "");
      const corsLike = error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(message);
      if (corsLike || attempt >= retries) throw error;
      options?.onRetry?.();
      await sleep(retryDelayMs(attempt, null), signal);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Network request failed.");
}

export async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
  isCancelled?: () => boolean,
) {
  let cursor = 0;
  const limit = Math.max(1, Math.min(concurrency, Math.max(items.length, 1)));
  async function pump() {
    while (cursor < items.length) {
      if (isCancelled?.()) return;
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) return;
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => pump()));
}

export { formatBytes } from "./display";

export function averageMs(samples: number[]) {
  if (!samples.length) return 0;
  return Math.round(samples.reduce((sum, n) => sum + n, 0) / samples.length);
}
