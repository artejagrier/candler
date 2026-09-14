"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Download,
  File,
  Folder,
  FolderInput,
  Info,
  Loader,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { formatBytes } from "@/lib/cloud/display";
import {
  buildCloudLibrary,
  folderCountLabel,
  folderStatus,
  type FolderSummary,
  type LibraryFile,
  type LibraryFolder,
} from "@/lib/cloud/library";
import { CloudActionMenu, type CloudMenuItem } from "@/components/cloud/CloudActionMenu";

function fileStatus(status: string) {
  switch (status) {
    case "backed_up":
      return { label: "Backed up", cls: "verified", Icon: ShieldCheck };
    case "verifying":
      return { label: "Verifying", cls: "progress", Icon: Loader };
    case "uploading":
      return { label: "Uploading", cls: "progress", Icon: Loader };
    case "failed":
      return { label: "Needs attention", cls: "failed", Icon: AlertTriangle };
    default:
      return { label: status, cls: "", Icon: null as null | typeof ShieldCheck };
  }
}

function folderStatusGlyph(cls: string) {
  if (cls === "verified") return <ShieldCheck aria-hidden="true" />;
  if (cls === "failed") return <AlertTriangle aria-hidden="true" />;
  if (cls === "warning") return <AlertTriangle aria-hidden="true" />;
  if (cls === "progress") return <Loader aria-hidden="true" />;
  return null;
}

function updatedLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type CloudLibraryHandlers = {
  onExpand: (folderId: string) => void;
  onRestoreDevice: (folder: LibraryFolder, summary: FolderSummary) => void;
  restoreBusy?: boolean;
  onDownloadFile: (file: LibraryFile) => void;
  onRename: (id: string, kind: "file" | "folder", name: string) => void;
  onMove: (id: string, kind: "file" | "folder", name: string) => void;
  onDetailsFolder: (folder: LibraryFolder, summary: FolderSummary) => void;
  onDetailsFile: (file: LibraryFile) => void;
  onTrash: (id: string, kind: "file" | "folder", name: string) => void;
};

export function CloudLibrary({
  files,
  folders,
  handlers,
}: {
  files: LibraryFile[];
  folders: LibraryFolder[];
  handlers: CloudLibraryHandlers;
}) {
  const index = useMemo(() => buildCloudLibrary(folders, files), [folders, files]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    handlers.onExpand(id);
  }

  return (
    <div className="cloud-library">
      <div className="cloud-library-head" aria-hidden="true">
        <span>Name</span>
        <span>Size</span>
        <span>Status</span>
        <span>Updated</span>
        <span />
      </div>
      <ul className="cloud-tree" aria-label="Cloud library">
        {index.rootFolders.map((folder) => (
          <FolderItem
            key={folder.id}
            folder={folder}
            depth={0}
            index={index}
            expanded={expanded}
            toggle={toggle}
            handlers={handlers}
          />
        ))}
        {index.rootFiles.map((file) => (
          <FileItem key={file.id} file={file} depth={0} handlers={handlers} />
        ))}
      </ul>
    </div>
  );
}

function FolderItem({
  folder,
  depth,
  index,
  expanded,
  toggle,
  handlers,
}: {
  folder: LibraryFolder;
  depth: number;
  index: ReturnType<typeof buildCloudLibrary>;
  expanded: Set<string>;
  toggle: (id: string) => void;
  handlers: CloudLibraryHandlers;
}) {
  const summary = index.summaries.get(folder.id) ?? {
    fileCount: 0,
    folderCount: 0,
    directFileCount: 0,
    directFolderCount: 0,
    sizeBytes: 0,
    backedUp: 0,
    uploading: 0,
    verifying: 0,
    failed: 0,
    latestUpdated: folder.updated_at,
  } satisfies FolderSummary;
  const childFolders = index.foldersByParent.get(folder.id) ?? [];
  const childFiles = index.filesByFolder.get(folder.id) ?? [];
  const hasChildren = childFolders.length + childFiles.length > 0;
  const open = expanded.has(folder.id);
  const panelId = `cloud-folder-${folder.id}`;
  const status = folderStatus(summary);
  const canRestore = summary.backedUp > 0;
  const restoreBusy = Boolean(handlers.restoreBusy);
  const menu: CloudMenuItem[] = [
    {
      id: "open",
      label: open ? "Collapse" : "Open / Expand",
      disabled: !hasChildren,
      icon: open ? <ChevronDown /> : <ChevronRight />,
      onSelect: () => hasChildren && toggle(folder.id),
    },
    {
      id: "restore",
      label: "Restore to Device",
      description: restoreBusy
        ? "A restore is already in progress."
        : "Download this backed-up folder to your computer.",
      icon: <Download />,
      disabled: !canRestore || restoreBusy,
      onSelect: () => handlers.onRestoreDevice(folder, summary),
    },
    { id: "rename", label: "Rename", icon: <Pencil />, onSelect: () => handlers.onRename(folder.id, "folder", folder.name) },
    { id: "move", label: "Move", icon: <FolderInput />, onSelect: () => handlers.onMove(folder.id, "folder", folder.name) },
    { id: "details", label: "View details", icon: <Info />, onSelect: () => handlers.onDetailsFolder(folder, summary) },
    { id: "trash", label: "Move to Trash", icon: <Trash2 />, onSelect: () => handlers.onTrash(folder.id, "folder", folder.name) },
  ];

  return (
    <li className="cloud-tree-item" style={{ "--cloud-depth": depth } as CSSProperties}>
      <div
        className="cloud-tree-row"
        data-expandable={hasChildren ? "true" : undefined}
        onClick={(event) => {
          if (!hasChildren) return;
          if ((event.target as HTMLElement).closest(".cloud-menu-wrap, .cloud-tree-main")) return;
          toggle(folder.id);
        }}
      >
        <button
          type="button"
          className="cloud-tree-main"
          aria-expanded={hasChildren ? open : undefined}
          aria-controls={hasChildren ? panelId : undefined}
          disabled={!hasChildren}
          onClick={() => hasChildren && toggle(folder.id)}
        >
          <span className="cloud-tree-chevron" aria-hidden="true">
            {hasChildren ? (open ? <ChevronDown /> : <ChevronRight />) : <span className="cloud-tree-chevron-spacer" />}
          </span>
          <Folder aria-hidden="true" />
          <span className="cloud-tree-copy">
            <b>{folder.name}</b>
            <small>{folderCountLabel(summary)}</small>
          </span>
        </button>
        <div className="cloud-tree-meta">
          <span className="cloud-tree-size">{formatBytes(summary.sizeBytes)}</span>
          <span className={`status ${status.cls} status-cell cloud-tree-status`}>
            {folderStatusGlyph(status.cls)}
            {status.label}
          </span>
          <span className="cloud-tree-updated">{updatedLabel(summary.latestUpdated)}</span>
        </div>
        <CloudActionMenu label={`Actions for ${folder.name}`} items={menu} />
      </div>
      {open && hasChildren ? (
        <ul id={panelId} className="cloud-tree-children">
          {childFolders.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              index={index}
              expanded={expanded}
              toggle={toggle}
              handlers={handlers}
            />
          ))}
          {childFiles.map((child) => (
            <FileItem key={child.id} file={child} depth={depth + 1} handlers={handlers} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function FileItem({
  file,
  depth,
  handlers,
}: {
  file: LibraryFile;
  depth: number;
  handlers: CloudLibraryHandlers;
}) {
  const status = fileStatus(file.status);
  const menu: CloudMenuItem[] = [
    {
      id: "download",
      label: "Download",
      icon: <Download />,
      disabled: file.status !== "backed_up",
      onSelect: () => handlers.onDownloadFile(file),
    },
    { id: "rename", label: "Rename", icon: <Pencil />, onSelect: () => handlers.onRename(file.id, "file", file.original_filename) },
    { id: "move", label: "Move", icon: <FolderInput />, onSelect: () => handlers.onMove(file.id, "file", file.original_filename) },
    { id: "details", label: "View details", icon: <Info />, onSelect: () => handlers.onDetailsFile(file) },
    { id: "trash", label: "Move to Trash", icon: <Trash2 />, onSelect: () => handlers.onTrash(file.id, "file", file.original_filename) },
  ];

  return (
    <li className="cloud-tree-item" style={{ "--cloud-depth": depth } as CSSProperties}>
      <div className="cloud-tree-row">
        <div className="cloud-tree-main cloud-tree-main--file">
          <span className="cloud-tree-chevron" aria-hidden="true">
            <span className="cloud-tree-chevron-spacer" />
          </span>
          <File aria-hidden="true" />
          <span className="cloud-tree-copy">
            <b>{file.original_filename}</b>
          </span>
        </div>
        <div className="cloud-tree-meta">
          <span className="cloud-tree-size">{formatBytes(Number(file.size_bytes) || 0)}</span>
          <span className={`status ${status.cls} status-cell cloud-tree-status`}>
            {status.Icon ? <status.Icon aria-hidden="true" /> : null}
            {status.label}
          </span>
          <span className="cloud-tree-updated">{updatedLabel(file.updated_at)}</span>
        </div>
        <CloudActionMenu label={`Actions for ${file.original_filename}`} items={menu} />
      </div>
    </li>
  );
}

export function trashMenuItems(input: {
  name: string;
  kind: "file" | "folder";
  onRestoreCloud: () => void;
  onDelete: () => void;
}): CloudMenuItem[] {
  return [
    { id: "restore-cloud", label: "Restore to Cloud", icon: <RotateCcw />, onSelect: input.onRestoreCloud },
    { id: "sep", separator: true },
    { id: "delete", label: "Delete permanently", icon: <Trash2 />, danger: true, onSelect: input.onDelete },
  ];
}
