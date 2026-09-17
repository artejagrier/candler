"use client";

import { formatBytes, type TransferItem, type TransferProfile } from "@/lib/cloud/transfer";
import type { SkipRecord } from "@/lib/cloud/smart-ignore";
import { summarizeBackup } from "@/lib/cloud/backup-state";

export function CloudTransfer({
  title,
  phase,
  scanned,
  unchanged,
  items,
  current,
  bytesUploaded,
  bytesTotal,
  etaLabel,
  stalled,
  onCancel,
  onRetry,
  profile,
}: {
  title: string;
  phase: "preparing" | "uploading" | "done" | "cancelled";
  scanned: number;
  skipped?: SkipRecord[];
  unchanged: number;
  items: TransferItem[];
  current: string[];
  bytesUploaded: number;
  bytesTotal: number;
  etaLabel: string | null;
  stalled?: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
  profile?: TransferProfile | null;
}) {
  const summary = summarizeBackup(items, phase === "cancelled", Boolean(stalled));
  const total = items.length;
  const finished = phase === "done" || phase === "cancelled";
  const verifying = !finished && summary.outcome === "verifying";
  const denominator = Math.max(scanned, summary.eligible);
  const eyebrow = phase === "preparing"
    ? "Scanning…"
    : phase === "cancelled"
      ? "Cancelled"
      : stalled && !finished
        ? "Backup stalled"
        : verifying
          ? `Verifying ${summary.verified.toLocaleString()} / ${denominator.toLocaleString()}`
          : !finished
            ? `Backing up ${summary.uploaded.toLocaleString()} / ${denominator.toLocaleString()}`
            : summary.outcome === "complete"
              ? "Backup Complete"
              : summary.outcome === "empty"
                ? "Nothing to back up"
                : "Backup Incomplete";

  return (
    <section className="cloud-transfer" aria-live="polite">
      <div className="cloud-transfer-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {phase === "uploading" && onCancel ? (
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel upload</button>
        ) : null}
      </div>

      <p className="cloud-transfer-meta">
        {phase === "preparing"
          ? (scanned ? `Scanning ${scanned.toLocaleString()} files` : "Scanning project…")
          : `${scanned.toLocaleString()} files discovered`}
        {unchanged ? ` · ${unchanged.toLocaleString()} already verified` : ""}
      </p>

      {phase !== "preparing" && total ? (
        <>
          <div
            className="cloud-transfer-rail candler-system-rail"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.percent}
            aria-label="Backup progress"
          >
            <i style={{ width: `${summary.percent}%` }} />
          </div>
          <p className="cloud-transfer-counts">
            {finished && summary.complete
              ? `✓ ${summary.verified.toLocaleString()} / ${denominator.toLocaleString()} files verified`
              : verifying
                ? `${summary.verified.toLocaleString()} / ${denominator.toLocaleString()} files verified`
                : `${summary.uploaded.toLocaleString()} / ${denominator.toLocaleString()} files uploaded`}
            {bytesTotal > 0 ? ` · ${formatBytes(verifying ? summary.bytesVerified : bytesUploaded)} / ${formatBytes(bytesTotal)} transferred` : ""}
            {summary.failed ? ` · ${summary.failed} ${summary.failed === 1 ? "file needs attention" : "files need attention"}` : ""}
          </p>
          {finished && summary.complete ? (
            <p className="cloud-transfer-complete">Backup Complete</p>
          ) : null}
          {finished && !summary.complete ? (
            <p className="cloud-transfer-incomplete" role="status">
              Backup Incomplete · {summary.verified.toLocaleString()} / {denominator.toLocaleString()} verified
            </p>
          ) : null}
          {stalled && !finished ? (
            <p className="cloud-transfer-incomplete" role="status">Upload appears stalled…</p>
          ) : null}
          {summary.failed ? (
            <ul className="cloud-transfer-fail-list">
              {items.filter((item) => item.status === "failed").slice(0, 20).map((item) => (
                <li key={item.id}>{item.error ?? `${item.relativePath} — failed`}</li>
              ))}
              {summary.failed > 20 ? <li>and {summary.failed - 20} more…</li> : null}
            </ul>
          ) : null}
          {finished && summary.failed > 0 && onRetry ? (
            <button type="button" className="primary-button" onClick={onRetry}>
              Retry failed {summary.failed === 1 ? "file" : "files"}
            </button>
          ) : null}
        </>
      ) : null}

      {phase === "uploading" && !finished ? (
        <p className="cloud-transfer-current">
          {verifying
            ? `Verifying backup · ${summary.verified.toLocaleString()} / ${denominator.toLocaleString()} verified`
            : `Backing up · ${summary.uploaded.toLocaleString()} / ${denominator.toLocaleString()} files uploaded`}
          {current.length ? ` · ${current.join(" · ")}` : ""}
        </p>
      ) : null}

      {phase === "uploading" && etaLabel ? (
        <p className="cloud-transfer-meta">{etaLabel}</p>
      ) : null}

      {profile && finished ? (
        <pre className="cloud-transfer-profile" tabIndex={0}>
{`files found ${profile.filesFound}
unchanged reused ${profile.skippedUnchanged}
uploaded ${profile.uploaded}
verified ${summary.verified}
failed ${profile.failed}
bytes ${profile.bytes}
scan ${profile.scanMs}ms
hash avg/p50/p95 ${profile.hashAvgMs}/${profile.hashP50Ms}/${profile.hashP95Ms}ms
authorize ${profile.authorizeRequests} req · avg/p50/p95 ${profile.authorizeAvgMs}/${profile.authorizeP50Ms}/${profile.authorizeP95Ms}ms${profile.authorizeServer ? `
authorize server ${profile.authorizeServer}` : ""}
put ${profile.putRequests} req · avg/p50/p95 ${profile.putAvgMs}/${profile.putP50Ms}/${profile.putP95Ms}ms
verify ${profile.finalizeRequests} req · avg/p50/p95 ${profile.finalizeAvgMs}/${profile.finalizeP50Ms}/${profile.finalizeP95Ms}ms
429 ${profile.count429} · retries ${profile.retries}
put concurrency ${profile.putConcurrency}
total ${profile.totalMs}ms
local delete safety ${summary.localDeleteSafety}${profile.failures?.length ? `

Failed:
${profile.failures.slice(0, 20).join("\n")}` : ""}`}
        </pre>
      ) : null}
    </section>
  );
}
