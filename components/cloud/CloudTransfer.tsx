"use client";

import { useState } from "react";
import { formatBytes, type TransferItem, type TransferProfile } from "@/lib/cloud/transfer";
import { skipReasonSummary, skippedFileCount, type SkipRecord } from "@/lib/cloud/smart-ignore";
import { formatEta } from "@/lib/cloud/stats";

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
  profile?: TransferProfile | null;
}) {
  const [openSkipped, setOpenSkipped] = useState(false);
  const skipCount = skippedFileCount(skipped);
  const reasons = skipReasonSummary(skipped);
  const total = items.length;
  const done = items.filter((item) => item.status === "backed_up" || item.status === "skipped").length;
  const failedItems = items.filter((item) => item.status === "failed");
  const failed = failedItems.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const eyebrow = phase === "preparing"
    ? "Preparing project…"
    : phase === "cancelled"
      ? "Cancelled"
      : phase === "done"
        ? "Backup complete"
        : "Backing up";

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
          : `${scanned.toLocaleString()} files found`}
        {skipCount ? ` · ${skipCount.toLocaleString()} generated files skipped` : ""}
        {unchanged ? ` · ${unchanged.toLocaleString()} unchanged` : ""}
        {total ? ` · ${total.toLocaleString()} files to transfer` : ""}
      </p>

      {reasons.length ? (
        <p className="cloud-transfer-skips">
          Skipped: {reasons.map((r) => r.label).join(" · ")}
          <button type="button" className="quiet-link" onClick={() => setOpenSkipped((v) => !v)}>
            {openSkipped ? "Hide skipped files" : "View skipped files"}
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
          <div className="cloud-transfer-rail" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Backup progress">
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="cloud-transfer-counts">
            {done.toLocaleString()} / {total.toLocaleString()} files
            {bytesTotal > 0 ? ` · ${formatBytes(bytesDone)} / ${formatBytes(bytesTotal)}` : ""}
            {failed ? ` · ${failed} failed` : ""}
          </p>
          {failedItems.length ? (
            <ul className="cloud-transfer-fail-list">
              {failedItems.slice(0, 20).map((item) => (
                <li key={item.id}>{item.error ?? `${item.relativePath} — failed`}</li>
              ))}
              {failedItems.length > 20 ? <li>and {failedItems.length - 20} more…</li> : null}
            </ul>
          ) : null}
        </>
      ) : null}

      {phase === "uploading" && (uploadingCount || verifyingCount) ? (
        <p className="cloud-transfer-current">
          Current activity: {uploadingCount ? `Uploading ${uploadingCount} file${uploadingCount === 1 ? "" : "s"}` : ""}
          {uploadingCount && verifyingCount ? " · " : ""}
          {verifyingCount ? `Verifying ${verifyingCount} file${verifyingCount === 1 ? "" : "s"}` : ""}
          {current.length ? ` · ${current.join(" · ")}` : ""}
        </p>
      ) : null}

      {phase === "uploading" && etaSeconds != null ? (
        <p className="cloud-transfer-meta">{formatEta(etaSeconds)}</p>
      ) : null}

      {profile && (phase === "done" || phase === "cancelled") ? (
        <pre className="cloud-transfer-profile" tabIndex={0}>
{`files found ${profile.filesFound}
generated skipped ${profile.skippedGenerated}
unchanged skipped ${profile.skippedUnchanged}
uploaded ${profile.uploaded}
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
total ${profile.totalMs}ms${profile.failures?.length ? `

PUT failed:
${profile.failures.slice(0, 20).join("\n")}` : ""}`}
        </pre>
      ) : null}
    </section>
  );
}
