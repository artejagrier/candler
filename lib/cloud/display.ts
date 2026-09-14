/** Human-readable Cloud sizes and quota labels. Display-only — not quota math. */

export function formatBytes(bytes: number) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatQuotaAmount(bytes: number) {
  const n = Math.max(0, Number(bytes) || 0);
  const tb = n / 1024 ** 4;
  if (tb >= 1 && Math.abs(tb - Math.round(tb)) < 1e-9) {
    return Math.round(tb) === 1 ? "1 TB" : `${Math.round(tb)} TB`;
  }
  const gb = n / 1024 ** 3;
  if (Math.abs(gb - Math.round(gb)) < 1e-9) return `${Math.round(gb)} GB`;
  return `${gb.toFixed(0)} GB`;
}

export function formatUsedGb(bytes: number) {
  const n = Math.max(0, Number(bytes) || 0);
  if (n === 0) return "0 GB";
  const gb = n / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (gb >= 0.01) return `${gb.toFixed(2)} GB`;
  if (gb >= 0.001) return `${gb.toFixed(3)} GB`;
  return `${gb.toFixed(4)} GB`;
}

export function formatUsageSummary(usedBytes: number, quotaBytes: number) {
  const used = Math.max(0, Number(usedBytes) || 0);
  const quota = Math.max(0, Number(quotaBytes) || 0);
  const pct = quota > 0 ? (used / quota) * 100 : 0;
  const percent = used > 0 && pct < 0.1 ? "< 0.1%" : `${pct.toFixed(1)}%`;
  const secondary = used > 0 && used < 1024 ** 3 ? `${formatBytes(used)} used` : null;
  return {
    usedLabel: formatUsedGb(used),
    quotaLabel: formatQuotaAmount(quota),
    percent,
    secondary,
  };
}
