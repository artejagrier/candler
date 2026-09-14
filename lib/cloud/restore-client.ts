/**
 * Client restore-to-device orchestration. Copy-out only.
 * Never writes Cloud records, never deletes R2 objects.
 */

export type RestorePhase =
  | "idle"
  | "preparing"
  | "packaging"
  | "downloading"
  | "done"
  | "canceled"
  | "failed";

export type RestoreProgress = {
  phase: RestorePhase;
  title: string;
  files: number;
  bytes: number;
  error?: string;
};

export const RESTORE_CANCELED_TITLE = "Restore canceled";
export const RESTORE_CANCELED_DETAIL = "Your Cloud backup is unchanged.";
export const CANCELED_RESTORE_TTL_MS = 4_000;

export class RestoreCancelled extends Error {
  constructor() {
    super("Restore canceled.");
    this.name = "RestoreCancelled";
  }
}

export function isRestoreActive(phase: RestorePhase) {
  return phase === "preparing" || phase === "packaging" || phase === "downloading";
}

export function canCancelRestore(phase: RestorePhase) {
  return isRestoreActive(phase);
}

export function isAbortError(error: unknown) {
  if (error instanceof RestoreCancelled) return true;
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }
  if (error instanceof Error) {
    return error.name === "AbortError" || /abort|Restore canceled/i.test(error.message);
  }
  return false;
}

export function restoreDownloadAllowed(input: { aborted: boolean; blobReady: boolean }) {
  return input.blobReady && !input.aborted;
}

export function shouldClearCanceledRestore(phase: RestorePhase, elapsedMs: number, ttl = CANCELED_RESTORE_TTL_MS) {
  return phase === "canceled" && elapsedMs >= ttl;
}

export function claimRestoreSlot(busy: { current: boolean }) {
  if (busy.current) return false;
  busy.current = true;
  return true;
}

export function releaseRestoreSlot(busy: { current: boolean }) {
  busy.current = false;
}

function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new RestoreCancelled();
}

export async function runRestoreToDevice(input: {
  folderId: string;
  folderName: string;
  initialFiles: number;
  initialBytes: number;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  download: (blob: Blob, filename: string) => void;
  report: (state: RestoreProgress) => void;
}): Promise<"done" | "canceled" | "failed"> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const base = {
    title: input.folderName,
    files: input.initialFiles,
    bytes: input.initialBytes,
  };
  let handedOff = false;

  try {
    input.report({ ...base, phase: "preparing" });
    throwIfAborted(input.signal);

    const manifestResponse = await fetchImpl(`/api/cloud/restore/folder/${input.folderId}?manifest=1`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: input.signal,
    });
    throwIfAborted(input.signal);
    const manifest = await manifestResponse.json() as { files?: number; bytes?: number; zipName?: string; error?: string };
    if (!manifestResponse.ok) throw new Error(manifest.error ?? "Restore could not be prepared.");

    const files = manifest.files ?? input.initialFiles;
    const bytes = manifest.bytes ?? input.initialBytes;
    const zipName = manifest.zipName ?? `${input.folderName}.zip`;
    input.report({ phase: "packaging", title: input.folderName, files, bytes });
    throwIfAborted(input.signal);

    const zipResponse = await fetchImpl(`/api/cloud/restore/folder/${input.folderId}`, {
      cache: "no-store",
      signal: input.signal,
    });
    throwIfAborted(input.signal);
    if (!zipResponse.ok) {
      const body = await zipResponse.json().catch(() => ({ error: "Restore could not be downloaded." })) as { error?: string };
      throw new Error(body.error ?? "Restore could not be downloaded.");
    }

    input.report({ phase: "downloading", title: input.folderName, files, bytes });
    const blob = await zipResponse.blob();
    throwIfAborted(input.signal);
    if (blob.size < 22) throw new Error("Restore archive was empty.");

    if (!restoreDownloadAllowed({ aborted: input.signal.aborted, blobReady: true })) {
      throw new RestoreCancelled();
    }
    input.download(blob, zipName);
    handedOff = true;
    input.report({ phase: "done", title: input.folderName, files, bytes });
    return "done";
  } catch (error) {
    if (handedOff) {
      input.report({ phase: "done", title: input.folderName, files: base.files, bytes: base.bytes });
      return "done";
    }
    if (isAbortError(error) || input.signal.aborted) {
      input.report({ ...base, phase: "canceled" });
      return "canceled";
    }
    input.report({
      ...base,
      phase: "failed",
      error: error instanceof Error ? error.message : "Restore failed.",
    });
    return "failed";
  }
}
