export function percentile(samples: number[], p: number) {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[rank] ?? 0);
}

export function averageMs(samples: number[]) {
  if (!samples.length) return 0;
  return Math.round(samples.reduce((sum, n) => n + sum, 0) / samples.length);
}

export function formatEta(seconds: number) {
  const s = Math.max(1, Math.round(seconds));
  if (s < 60) return `About ${s} sec remaining`;
  const minutes = Math.round(s / 60);
  if (minutes === 1) return "About 1 min remaining";
  if (minutes < 60) return `About ${minutes} min remaining`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "About 1 hr remaining" : `About ${hours} hr remaining`;
}

export function smoothEta(previous: number | null, next: number) {
  if (!Number.isFinite(next) || next < 0) return previous;
  if (previous == null) return next;
  return previous * 0.72 + next * 0.28;
}

export const ETA_MIN_WALL_MS = 8_000;
export const ETA_MIN_COMPLETES = 3;
export const STALL_MS = 45_000;

export type EtaSnapshot = {
  state: "calculating" | "ready" | "stalled" | "finishing" | "slow";
  seconds: number | null;
  label: string;
};

function calculating(): EtaSnapshot {
  return { state: "calculating", seconds: null, label: "Calculating time remaining…" };
}

export function describeEta(input: {
  wallMs: number;
  now: number;
  lastProgressAt: number;
  bytesUploaded: number;
  bytesVerified: number;
  bytesTotal: number;
  filesUploaded: number;
  filesVerified: number;
  filesEligible: number;
  completedPuts: number;
  previousSeconds: number | null;
}): EtaSnapshot {
  if (input.filesEligible <= 0) return calculating();
  if (input.wallMs >= STALL_MS && input.now - input.lastProgressAt >= STALL_MS) {
    return { state: "stalled", seconds: null, label: "Upload appears stalled…" };
  }

  const remainingBytes = Math.max(0, input.bytesTotal - input.bytesVerified);
  const remainingFiles = Math.max(0, input.filesEligible - input.filesVerified);
  const remainingPuts = Math.max(0, input.filesEligible - input.filesUploaded);

  if (remainingFiles <= 0) {
    return { state: "finishing", seconds: null, label: "" };
  }
  if (remainingPuts <= 0) {
    return { state: "finishing", seconds: null, label: "Finishing verification…" };
  }

  const enoughPuts = input.completedPuts >= ETA_MIN_COMPLETES;
  const enoughWall = input.wallMs >= ETA_MIN_WALL_MS;
  const hasThroughput = input.bytesVerified > 0 || input.bytesUploaded > 0 || input.filesVerified > 0;
  if (!enoughWall || !enoughPuts || !hasThroughput) return calculating();

  const secondsElapsed = input.wallMs / 1000;
  const verifiedByteRate = input.bytesVerified > 0 ? input.bytesVerified / secondsElapsed : 0;
  const uploadedByteRate = input.bytesUploaded > 0 ? input.bytesUploaded / secondsElapsed : 0;
  const byteRate = verifiedByteRate > 1 ? verifiedByteRate : uploadedByteRate;
  const verifiedFileRate = input.filesVerified / secondsElapsed;
  const uploadedFileRate = input.filesUploaded / secondsElapsed;
  const fileRate = verifiedFileRate > 0.0001 ? verifiedFileRate : uploadedFileRate;
  const fromBytes = remainingBytes > 0 && byteRate > 1 ? remainingBytes / byteRate : Number.POSITIVE_INFINITY;
  const fromFiles = fileRate > 0.0001 ? remainingFiles / fileRate : Number.POSITIVE_INFINITY;
  const finite = [fromBytes, fromFiles].filter((value) => Number.isFinite(value) && value > 0);
  if (!finite.length) return calculating();

  const minEstimate = Math.min(...finite);
  const maxEstimate = Math.max(...finite);
  if (maxEstimate / minEstimate > 4) return calculating();

  const raw = finite.length === 2 ? minEstimate * 0.55 + maxEstimate * 0.45 : minEstimate;
  if (!Number.isFinite(raw) || raw <= 0) return calculating();

  if (input.previousSeconds != null && input.previousSeconds > 8 && raw > input.previousSeconds * 2.8 && input.wallMs > 20_000) {
    return { state: "slow", seconds: null, label: "Connection is slower than usual…" };
  }

  const seconds = smoothEta(input.previousSeconds, raw);
  if (seconds == null) return calculating();
  return { state: "ready", seconds, label: formatEta(seconds) };
}

export function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  const n = Math.max(1, size);
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}
