"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatBytes } from "@/lib/cloud/display";

export type CloudDetailsTarget =
  | {
    kind: "folder";
    name: string;
    status: string;
    sizeBytes: number;
    fileCount: number;
    folderCount: number;
    createdAt?: string;
    updatedAt: string;
    projectName?: string | null;
    backedUp: number;
  }
  | {
    kind: "file";
    name: string;
    status: string;
    sizeBytes: number;
    mimeType: string;
    createdAt?: string;
    updatedAt: string;
    projectName?: string | null;
    relativePath?: string | null;
  };

function stamp(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export function CloudDetails({
  target,
  onClose,
}: {
  target: CloudDetailsTarget | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!target) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreFocusRef.current?.focus?.();
    };
  }, [target, onClose]);

  if (!target) return null;

  const rows = target.kind === "folder"
    ? [
      ["Type", "Folder"],
      ["Cloud status", target.status],
      ["Items", `${target.fileCount} files · ${target.folderCount} folders`],
      ["Size", formatBytes(target.sizeBytes)],
      ["Backup verification", target.backedUp === target.fileCount && target.fileCount > 0 ? "Verified" : `${target.backedUp} / ${target.fileCount} backed up`],
      ["Project", target.projectName || "—"],
      ["Created", stamp(target.createdAt)],
      ["Updated", stamp(target.updatedAt)],
    ]
    : [
      ["Type", "File"],
      ["Cloud status", target.status],
      ["Size", formatBytes(target.sizeBytes)],
      ["Format", target.mimeType || "—"],
      ["Backup verification", target.status === "backed_up" ? "Verified" : "Not verified"],
      ["Project", target.projectName || "—"],
      ["Path", target.relativePath || target.name],
      ["Created", stamp(target.createdAt)],
      ["Updated", stamp(target.updatedAt)],
    ];

  return createPortal(
    <div className="cloud-details" role="dialog" aria-modal="true" aria-label="Item details">
      <button type="button" className="cloud-details-scrim" aria-label="Close details" onClick={onClose} />
      <aside className="cloud-details-panel">
        <div className="cloud-details-head">
          <div>
            <p className="eyebrow">Details</p>
            <h2>{target.name}</h2>
          </div>
          <button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close details">
            <X />
          </button>
        </div>
        <dl className="cloud-details-list">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </aside>
    </div>,
    document.body,
  );
}
