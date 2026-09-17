import "server-only";

export const CLOUD_STORAGE_UNAVAILABLE = "CLOUD_STORAGE_UNAVAILABLE";
export const CLOUD_BACKUP_START_FAILED = "Cloud backup couldn't start. Please try again.";

export class CloudStorageUnavailableError extends Error {
  constructor() {
    super(CLOUD_STORAGE_UNAVAILABLE);
    this.name = "CloudStorageUnavailableError";
  }
}

export class CloudQuotaError extends Error {
  requiredBytes: number;
  availableBytes: number;
  neededBytes: number;
  constructor(requiredBytes: number, availableBytes: number) {
    const neededBytes = Math.max(0, requiredBytes - availableBytes);
    super(
      `This backup needs ${formatSize(requiredBytes)} but ${formatSize(availableBytes)} is available. Additional storage needed: ${formatSize(neededBytes)}.`,
    );
    this.name = "CloudQuotaError";
    this.requiredBytes = requiredBytes;
    this.availableBytes = availableBytes;
    this.neededBytes = neededBytes;
  }
}

function formatSize(bytes: number) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n < 1024 ** 2) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function logCloudDiagnostic(code: string) {
  console.error(`[cloud] ${code}`);
}

export function publicCloudError(error: unknown): { message: string; status: number } {
  if (error instanceof CloudQuotaError) return { message: error.message, status: 413 };
  const raw = error instanceof Error ? error.message : "";
  if (
    error instanceof CloudStorageUnavailableError
    || raw === CLOUD_STORAGE_UNAVAILABLE
    || /object storage is not configured/i.test(raw)
    || /could not be loaded from environment/i.test(raw)
  ) {
    logCloudDiagnostic("storage provider unavailable");
    return { message: CLOUD_BACKUP_START_FAILED, status: 503 };
  }
  if (/Too many upload attempts/i.test(raw)) {
    return { message: raw, status: 429 };
  }
  if (/Authentication required/i.test(raw)) {
    return { message: "Authentication required.", status: 401 };
  }
  if (/File exceeds the configured upload limit/i.test(raw)) {
    return { message: raw, status: 413 };
  }
  if (/Folder not found/i.test(raw)) {
    return { message: raw, status: 404 };
  }
  if (raw && !/R2_|ACCESS_KEY|SECRET|endpoint|bucket/i.test(raw)) {
    return { message: raw, status: 400 };
  }
  logCloudDiagnostic("authorization failure");
  return { message: CLOUD_BACKUP_START_FAILED, status: 503 };
}
