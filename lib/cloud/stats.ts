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
  if (!Number.isFinite(next) || next <= 0) return previous;
  if (previous == null) return next;
  return previous * 0.72 + next * 0.28;
}

export function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  const n = Math.max(1, size);
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}
