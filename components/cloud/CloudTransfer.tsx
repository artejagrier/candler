"use client";

import { useState } from "react";
import { formatBytes, type TransferItem, type TransferProfile } from "@/lib/cloud/transfer";
import { skipReasonSummary, skippedFileCount, type SkipRecord } from "@/lib/cloud/smart-ignore";
import { formatEta } from "@/lib/cloud/stats";
import { summarizeBackup } from "@/lib/cloud/backup-state";

export function CloudTransfer({
  title,
  phase,
  scanned,
  skipped,
  unchanged,
  items,
  current,
  uploadingCount,
  verifyingCount,
  bytesDone,
  bytesTotal,
  etaSeconds,
  onCancel,
  onRetry,
  profile,
}: {
  title: string;
  phase: "preparing" | "uploading" | "done" | "cancelled";
  scanned: number;
  skipped: SkipRecord[];
  unchanged: number;
  items: TransferItem[];
  current: string[];
  uploadingCount: number;
  verifyingCount: number;
  bytesDone: number;
  bytesTotal: number;
  etaSeconds: number | null;
  onCancel?: () => void;
  onRetry?: () => void;
  profile?: TransferProfile | null;
}) {
  const [openSkipped, setOpenSkipped] = useState(false);
  const skipCount = skippedFileCount(skipped);
  const reasons = skipReasonSummary(skipped);
  const summary = summarizeBackup(items, phase === "cancelled");
  const total = items.length;
  const finished = phase === "done" || phase === "cancelled";
  const eyebrow = phase === "preparing"
    ? "Scanning…"
    : phase === "cancelled"
      ? "Cancelled"
      : !finished && summary.outcome === "verifying"
        ? `Verifying ${summary.verified.toLocaleString()} / ${summary.eligible.toLocaleString()}`
        : !finished
          ? `Backing up ${summary.verified.toLocaleString()} / ${summary.eligible.toLocaleString()}`
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
        {skipCount ? ` · ${skipCount.toLocaleString()} system files excluded` : ""}
        {unchanged ? ` · ${unchanged.toLocaleString()} already verified` : ""}
        {total ? ` · ${total.toLocaleString()} eligible` : ""}
      </p>

      {reasons.length ? (
        <p className="cloud-transfer-skips">
          Excluded: {reasons.map((r) => r.label).join(" · ")}
          <button type="button" className="quiet-link" onClick={() => setOpenSkipped((v) => !v)}>
            {openSkipped ? "Hide excluded files" : "View excluded files"}
          </button>
        </p>
      ) : null}

      {openSkipped && skipped.length ? (
        <ul className="cloud-transfer-skip-list">
          {skipped.slice(0, 40).map((item) => (
            <li key={`${item.reason}-${item.relativePath}`}>
              {item.relativePath}{item.count && item.count > 1 ? ` (${item.count.toLocaleString()} files)` : ""}
            </li>
          ))}
          {skipped.length > 40 ? <li>and {skipped.length - 40} more…</li> : null}
        </ul>
      ) : null}

      {phase !== "preparing" && total ? (
        <>
          <div
            className="cloud-transfer-rail candler-system-rail"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={summary.verified}
            aria-label="Backup progress"
          >
            <i style={{ width: `${summary.percent}%` }} />
          </div>
          <p className="cloud-transfer-counts">
            {finished && summary.complete
              ? `✓ ${summary.verified.toLocaleString()} files verified`
              : `${summary.verified.toLocaleString()} / ${summary.eligible.toLocaleString()} verified`}
            {bytesTotal > 0 ? ` · ${formatBytes(bytesDone)} / ${formatBytes(bytesTotal)}` : ""}
            {summary.failed ? ` · ${summary.failed} ${summary.failed === 1 ? "file needs attention" : "files need attention"}` : ""}
            {skipCount ? ` · ${skipCount.toLocaleString()} system files excluded` : ""}
          </p>
          {finished && summary.complete ? (
            <p className="cloud-transfer-complete">Backup Complete</p>
          ) : null}
          {finished && !summary.complete && summary.failed ? (
            <p className="cloud-transfer-incomplete" role="status">
              Backup Incomplete · {summary.verified.toLocaleString()} / {summary.eligible.toLocaleString()} verified
            </p>
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

      {phase === "uploading" && (uploadingCount || verifyingCount) ? (
        <p className="cloud-transfer-current">
          {verifyingCount
            ? `Verifying ${summary.verified.toLocaleString()} / ${summary.eligible.toLocaleString()}`
            : `Uploading ${Math.min(summary.verified + uploadingCount, summary.eligible).toLocaleString()} / ${summary.eligible.toLocaleString()}`}
          {current.length ? ` · ${current.join(" · ")}` : ""}
        </p>
      ) : null}

      {phase === "uploading" && etaSeconds != null ? (
        <p className="cloud-transfer-meta">{formatEta(etaSeconds)}</p>
      ) : null}

      {profile && finished ? (
        <pre className="cloud-transfer-profile" tabIndex={0}>
{`files found ${profile.filesFound}
system excluded ${profile.skippedGenerated}
unchanged skipped ${profile.skippedUnchanged}
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
