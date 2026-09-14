"use client";

import { formatBytes } from "@/lib/cloud/display";
import {
  canCancelRestore,
  RESTORE_CANCELED_DETAIL,
  RESTORE_CANCELED_TITLE,
  type RestorePhase,
} from "@/lib/cloud/restore-client";

export type { RestorePhase };

export function CloudRestoreStatus({
  title,
  phase,
  files,
  bytes,
  error,
  onCancel,
}: {
  title: string;
  phase: RestorePhase;
  files: number;
  bytes: number;
  error?: string;
  onCancel?: () => void;
}) {
  const cancelable = canCancelRestore(phase);
  const eyebrow = phase === "preparing"
    ? "Preparing restore…"
    : phase === "packaging"
      ? "Packaging project…"
      : phase === "downloading"
        ? "Downloading…"
        : phase === "failed"
          ? "Restore failed"
          : phase === "canceled"
            ? "Restore"
            : "Restore prepared";
  const heading = cancelable ? `Restoring ${title}` : phase === "canceled" ? RESTORE_CANCELED_TITLE : title;

  return (
    <section className="cloud-transfer cloud-restore" aria-live="polite">
      <div className="cloud-transfer-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{heading}</h2>
        </div>
      </div>
      {phase === "canceled" ? (
        <p className="cloud-restore-canceled">{RESTORE_CANCELED_DETAIL}</p>
      ) : (
        <p className="cloud-transfer-meta">
          {files.toLocaleString()} file{files === 1 ? "" : "s"}
          {bytes > 0 ? ` · ${formatBytes(bytes)}` : ""}
        </p>
      )}
      {cancelable ? (
        <div className="cloud-transfer-rail cloud-transfer-rail--indeterminate" role="progressbar" aria-valuetext={eyebrow} aria-label="Restore progress">
          <i />
        </div>
      ) : null}
      {phase === "done" ? (
        <p className="cloud-restore-ready">Restore prepared · {files.toLocaleString()} files · {formatBytes(bytes)}</p>
      ) : null}
      {error ? <p className="cloud-transfer-fail-list">{error}</p> : null}
      {cancelable && onCancel ? (
        <button type="button" className="cloud-restore-cancel" onClick={onCancel} aria-label="Cancel restore">
          Cancel restore
        </button>
      ) : null}
    </section>
  );
}
