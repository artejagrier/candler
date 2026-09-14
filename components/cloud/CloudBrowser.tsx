"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CloudUpload,
  File,
  Folder,
  FolderInput,
  FolderPlus,
  Upload,
} from "lucide-react";
import {
  bindDirectoryPicker,
  captureDroppedEntries,
  describeReadError,
  sourcesFromEntries,
  sourcesFromFileList,
  type UploadSource,
} from "@/lib/cloud/browser-files";
import {
  rootLabel,
  skippedFileCount,
  smartIgnoreReason,
  type SkipRecord,
} from "@/lib/cloud/smart-ignore";
import {
  TransferCancelled,
  classifyCrossOriginFetchError,
  classifyPutBodyHint,
  describeTransferFailure,
  fetchWithRetry,
  formatAuthorizeTimings,
  isUsableUploadUrl,
  runPool,
  type AuthorizeServerTimings,
  type TransferItem,
  type TransferProfile,
} from "@/lib/cloud/transfer";
import { AUTHORIZE_BATCH_SIZE } from "@/lib/cloud/limits";
import { runPipelinedBatches, nextPutConcurrency, initialPutConcurrency } from "@/lib/cloud/pipeline";
import { averageMs, chunk, percentile, smoothEta } from "@/lib/cloud/stats";
import { CloudTransfer } from "@/components/cloud/CloudTransfer";
import { CloudLibrary, trashMenuItems } from "@/components/cloud/CloudLibrary";
import { CloudActionMenu } from "@/components/cloud/CloudActionMenu";
import { CloudDialog } from "@/components/cloud/CloudDialog";
import { CloudDetails, type CloudDetailsTarget } from "@/components/cloud/CloudDetails";
import { CloudRestoreStatus } from "@/components/cloud/CloudRestoreStatus";
import { folderStatus, type FolderSummary, type LibraryFolder } from "@/lib/cloud/library";
import {
  CANCELED_RESTORE_TTL_MS,
  canCancelRestore,
  claimRestoreSlot,
  releaseRestoreSlot,
  runRestoreToDevice,
  type RestoreProgress,
} from "@/lib/cloud/restore-client";

type CloudFile = {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  folder_id: string | null;
  project_id: string | null;
  relative_path?: string | null;
  created_at?: string;
  updated_at: string;
  projects?: { name: string } | null;
};
type CloudFolder = { id: string; name: string; parent_id: string | null; project_id: string | null; created_at?: string; updated_at: string };
type Project = { id: string; name: string };
type DialogState =
  | { type: "rename"; id: string; kind: "file" | "folder"; name: string }
  | { type: "move"; id: string; kind: "file" | "folder"; name: string }
  | { type: "trash"; id: string; kind: "file" | "folder"; name: string }
  | { type: "delete"; id: string; kind: "file" | "folder"; name: string }
  | { type: "create-folder" };

type RestoreState = RestoreProgress;
type Trashed = { files: { id: string; original_filename: string; deleted_at: string }[]; folders: { id: string; name: string; deleted_at: string }[] };

type TransferState = {
  title: string;
  phase: "preparing" | "uploading" | "done" | "cancelled";
  scanned: number;
  skipped: SkipRecord[];
  unchanged: number;
  items: TransferItem[];
  etaSeconds: number | null;
  profile: TransferProfile | null;
};

async function sha256(file: globalThis.File, label: string, signal?: AbortSignal) {
  if (signal?.aborted) throw new TransferCancelled();
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
  } catch (error) {
    throw new Error(describeReadError(error, label));
  }
  if (signal?.aborted) throw new TransferCancelled();
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return { checksumSha256: btoa(String.fromCharCode(...new Uint8Array(hash))), bytes };
}

function basename(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function CloudBrowser({
  workspaceId,
  files,
  folders,
  projects,
  filterProjectId,
}: {
  workspaceId: string | null;
  files: CloudFile[];
  folders: CloudFolder[];
  projects: Project[];
  filterProjectId?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const restoreAbortRef = useRef<AbortController | null>(null);
  const restoringRef = useRef(false);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [includeGenerated, setIncludeGenerated] = useState(false);
  const [transfer, setTransfer] = useState<TransferState | null>(null);
  const [view, setView] = useState<"files" | "trash">("files");
  const [trashed, setTrashed] = useState<Trashed | null>(null);
  const [drag, setDrag] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [moveParentId, setMoveParentId] = useState<string | null>(null);
  const [details, setDetails] = useState<CloudDetailsTarget | null>(null);
  const [restore, setRestore] = useState<RestoreState | null>(null);
  const visibleFiles = filterProjectId ? files.filter((f) => f.project_id === filterProjectId) : files;
  const visibleFolders = filterProjectId ? folders.filter((f) => f.project_id === filterProjectId) : folders;
  const uploadProjectId = filterProjectId ?? projects[0]?.id ?? null;
  const restoreBusy = Boolean(restore && canCancelRestore(restore.phase));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      restoreAbortRef.current?.abort();
      cancelledRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (restore?.phase !== "canceled") return;
    const timer = window.setTimeout(() => {
      setRestore((current) => current?.phase === "canceled" ? null : current);
    }, CANCELED_RESTORE_TTL_MS);
    return () => window.clearTimeout(timer);
  }, [restore?.phase]);

  async function loadTrash() {
    const response = await fetch("/api/cloud/trash");
    const body = await response.json() as Trashed & { error?: string };
    if (response.ok) setTrashed(body);
    else setStatus(body.error ?? "Trash could not be loaded.");
  }

  function patchItem(id: string, patch: Partial<TransferItem>) {
    setTransfer((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      };
    });
  }

  function cancelUpload() {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setTransfer((current) => current ? { ...current, phase: "cancelled" } : current);
  }

  async function uploadSources(selected: UploadSource[], extras?: { errors?: string[]; skipped?: SkipRecord[]; scanned?: number; scanMs?: number }) {
    if (!workspaceId) return;
    const smart = !includeGenerated;
    const skipped: SkipRecord[] = [...(extras?.skipped ?? [])];
    const keep: UploadSource[] = [];
    for (const source of selected) {
      const reason = smart ? smartIgnoreReason(source.relativePath) : null;
      if (reason) skipped.push({ relativePath: source.relativePath, reason });
      else keep.push(source);
    }
    const scanned = extras?.scanned ?? selected.length + skippedFileCount(extras?.skipped ?? []);
    const title = rootLabel([...keep, ...selected].map((s) => s.relativePath));
    const items: TransferItem[] = keep.map((source, index) => ({
      id: `${index}-${source.relativePath}`,
      relativePath: source.relativePath,
      size: source.file.size,
      status: "queued",
    }));
    cancelledRef.current = false;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setBusy(true);
    setStatus("");
    setTransfer({
      title,
      phase: keep.length ? "uploading" : "done",
      scanned,
      skipped,
      unchanged: 0,
      items,
      etaSeconds: null,
      profile: null,
    });
    if (!keep.length) {
      setBusy(false);
      setStatus(extras?.errors?.[0] ?? (skipped.length ? "Smart Backup skipped generated files. Nothing left to upload." : "Nothing to upload."));
      return;
    }

    const hashMs: number[] = [];
    const authorizeMs: number[] = [];
    const uploadMs: number[] = [];
    const finalizeMs: number[] = [];
    const counters = { count429: 0, retries: 0, authorizeRequests: 0, putRequests: 0, finalizeRequests: 0, skippedUnchanged: 0 };
    const retryOpts = {
      signal,
      on429: () => { counters.count429 += 1; },
      onRetry: () => { counters.retries += 1; },
    };
    let putConcurrency = initialPutConcurrency();
    let eta: number | null = null;
    let putBytes = 0;
    let putElapsed = 0;
    const transferStarted = performance.now();
    const scanMs = extras?.scanMs ?? 0;
    const itemByPath = new Map(items.map((item) => [item.relativePath, item]));
    const batches = chunk(keep, AUTHORIZE_BATCH_SIZE);

    type AuthWork = {
      item: TransferItem;
      source: UploadSource;
      checksumSha256: string;
      bytes: ArrayBuffer;
      fileId?: string;
      uploadUrl?: string;
    };
    type PutWork = AuthWork & { fileId: string };
    let authorizeServer: string | undefined;

    try {
      await runPipelinedBatches(batches.length, {
        isCancelled: () => cancelledRef.current,
        authorize: async (index) => {
          const batch = batches[index] ?? [];
          const hashed: AuthWork[] = [];
          const tiny = batch.every((source) => source.file.size < 1_000_000);
          await runPool(batch, tiny ? 8 : 4, async (source) => {
            if (cancelledRef.current) return;
            const item = itemByPath.get(source.relativePath);
            if (!item) return;
            if (source.file.size <= 0) {
              patchItem(item.id, { status: "failed", error: `“${source.relativePath}” is empty (0 bytes) and was not uploaded.` });
              return;
            }
            patchItem(item.id, { status: "authorizing" });
            const t0 = performance.now();
            const hashedFile = await sha256(source.file, source.relativePath, signal);
            hashMs.push(performance.now() - t0);
            hashed.push({ item, source, checksumSha256: hashedFile.checksumSha256, bytes: hashedFile.bytes });
          }, () => cancelledRef.current);
          if (cancelledRef.current || !hashed.length) return [] as AuthWork[];
          const t1 = performance.now();
          counters.authorizeRequests += 1;
          try {
            const auth = await fetchWithRetry("/api/cloud/upload/batch-authorize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                projectId: uploadProjectId,
                files: hashed.map((entry) => ({
                  filename: entry.source.file.name,
                  relativePath: entry.source.relativePath,
                  contentType: entry.source.file.type || "application/octet-stream",
                  size: entry.source.file.size,
                  checksumSha256: entry.checksumSha256,
                })),
              }),
              signal,
            }, retryOpts);
            const body = await auth.json() as {
              error?: string;
              results?: Array<{ relativePath: string; skipped?: boolean; fileId?: string; uploadUrl?: string; error?: string }>;
              timings?: AuthorizeServerTimings;
            };
            authorizeMs.push(performance.now() - t1);
            authorizeServer = formatAuthorizeTimings(body.timings) ?? authorizeServer;
            if (!auth.ok) {
              for (const entry of hashed) {
                patchItem(entry.item.id, {
                  status: "failed",
                  error: describeTransferFailure({
                    relativePath: entry.item.relativePath,
                    stage: "authorize",
                    error: body.error ?? "Upload could not be authorized.",
                  }),
                });
              }
              return [] as AuthWork[];
            }
            const byRel = new Map((body.results ?? []).map((row) => [row.relativePath, row]));
            const outgoing: AuthWork[] = [];
            for (const entry of hashed) {
              const row = byRel.get(entry.item.relativePath);
              if (row?.skipped && row.fileId) {
                counters.skippedUnchanged += 1;
                patchItem(entry.item.id, { status: "skipped", reason: "unchanged" });
                continue;
              }
              if (row?.error || !row?.fileId) {
                patchItem(entry.item.id, {
                  status: "failed",
                  error: describeTransferFailure({
                    relativePath: entry.item.relativePath,
                    stage: "authorize",
                    error: row?.error ?? "Upload could not be authorized.",
                    uploadUrlMissing: !row?.uploadUrl && !row?.error,
                  }),
                });
                continue;
              }
              if (!isUsableUploadUrl(row.uploadUrl)) {
                patchItem(entry.item.id, {
                  status: "failed",
                  error: describeTransferFailure({
                    relativePath: entry.item.relativePath,
                    stage: "authorize",
                    uploadUrlMissing: !row.uploadUrl,
                    malformedUploadUrl: Boolean(row.uploadUrl),
                  }),
                });
                continue;
              }
              outgoing.push({ ...entry, fileId: row.fileId, uploadUrl: row.uploadUrl });
            }
            setTransfer((current) => current ? { ...current, unchanged: counters.skippedUnchanged } : current);
            return outgoing;
          } catch (error) {
            if (error instanceof TransferCancelled || cancelledRef.current) return [] as AuthWork[];
            for (const entry of hashed) {
              patchItem(entry.item.id, {
                status: "failed",
                error: describeTransferFailure({
                  relativePath: entry.item.relativePath,
                  stage: "authorize",
                  error: error instanceof Error ? error.message : "Upload could not be authorized.",
                }),
              });
            }
            return [] as AuthWork[];
          }
        },
        upload: async (authorized) => {
          const uploaded: PutWork[] = [];
          const batch429Start = counters.count429;
          const batchPutMs: number[] = [];
          await runPool(authorized, putConcurrency, async (entry) => {
            if (cancelledRef.current || !entry.uploadUrl || !entry.fileId) return;
            patchItem(entry.item.id, { status: "uploading" });
            const t0 = performance.now();
            counters.putRequests += 1;
            try {
              const put = await fetchWithRetry(entry.uploadUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": entry.source.file.type || "application/octet-stream",
                  "x-amz-checksum-sha256": entry.checksumSha256,
                },
                body: entry.bytes,
                signal,
              }, retryOpts);
              const elapsed = performance.now() - t0;
              uploadMs.push(elapsed);
              batchPutMs.push(elapsed);
              if (!put.ok) {
                let bodyHint: string | undefined;
                try {
                  bodyHint = classifyPutBodyHint((await put.text()).slice(0, 400));
                } catch {
                  bodyHint = undefined;
                }
                patchItem(entry.item.id, {
                  status: "failed",
                  error: describeTransferFailure({
                    relativePath: entry.item.relativePath,
                    stage: "put",
                    status: put.status,
                    bodyHint,
                  }),
                });
                return;
              }
              putBytes += entry.bytes.byteLength;
              putElapsed += elapsed;
              if (putBytes > 0 && putElapsed > 0 && performance.now() - transferStarted > 4000 && uploadMs.length >= 3) {
                const rate = putBytes / (putElapsed / 1000);
                const remaining = keep.reduce((sum, source) => sum + source.file.size, 0) - putBytes;
                eta = smoothEta(eta, remaining / Math.max(rate, 1));
                setTransfer((current) => current ? { ...current, etaSeconds: eta } : current);
              }
              uploaded.push(entry as PutWork);
            } catch (error) {
              if (error instanceof TransferCancelled || cancelledRef.current) return;
              uploadMs.push(performance.now() - t0);
              patchItem(entry.item.id, {
                status: "failed",
                error: describeTransferFailure({
                  relativePath: entry.item.relativePath,
                  stage: "put",
                  error,
                  kind: classifyCrossOriginFetchError(error),
                }),
              });
            }
          }, () => cancelledRef.current);
          putConcurrency = nextPutConcurrency(putConcurrency, counters.count429 - batch429Start, batchPutMs);
          return uploaded;
        },
        finalize: async (uploaded) => {
          if (!uploaded.length || cancelledRef.current) return;
          for (const entry of uploaded) patchItem(entry.item.id, { status: "verifying" });
          const t0 = performance.now();
          counters.finalizeRequests += 1;
          const final = await fetchWithRetry("/api/cloud/finalize/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: uploaded.map((entry) => entry.fileId) }),
            signal,
          }, retryOpts);
          const body = await final.json() as { error?: string; results?: Array<{ id: string; status: string; error?: string }> };
          finalizeMs.push(performance.now() - t0);
          if (!final.ok) {
            for (const entry of uploaded) {
              patchItem(entry.item.id, {
                status: "failed",
                error: describeTransferFailure({
                  relativePath: entry.item.relativePath,
                  stage: "verify",
                  error: body.error ?? "Verification failed.",
                }),
              });
            }
            return;
          }
          const byId = new Map((body.results ?? []).map((row) => [row.id, row]));
          for (const entry of uploaded) {
            const row = byId.get(entry.fileId);
            if (row?.status === "backed_up") patchItem(entry.item.id, { status: "backed_up" });
            else {
              patchItem(entry.item.id, {
                status: "failed",
                error: describeTransferFailure({
                  relativePath: entry.item.relativePath,
                  stage: "verify",
                  error: row?.error ?? "Verification failed.",
                }),
              });
            }
          }
        },
      });

      const totalMs = performance.now() - transferStarted;
      const profile: TransferProfile = {
        filesFound: scanned,
        skippedGenerated: skippedFileCount(skipped),
        skippedUnchanged: counters.skippedUnchanged,
        uploaded: counters.putRequests,
        failed: 0,
        bytes: keep.reduce((sum, source) => sum + source.file.size, 0),
        scanMs,
        hashAvgMs: averageMs(hashMs),
        hashP50Ms: percentile(hashMs, 50),
        hashP95Ms: percentile(hashMs, 95),
        authorizeRequests: counters.authorizeRequests,
        authorizeAvgMs: averageMs(authorizeMs),
        authorizeP50Ms: percentile(authorizeMs, 50),
        authorizeP95Ms: percentile(authorizeMs, 95),
        authorizeServer,
        putRequests: counters.putRequests,
        putAvgMs: averageMs(uploadMs),
        putP50Ms: percentile(uploadMs, 50),
        putP95Ms: percentile(uploadMs, 95),
        finalizeRequests: counters.finalizeRequests,
        finalizeAvgMs: averageMs(finalizeMs),
        finalizeP50Ms: percentile(finalizeMs, 50),
        finalizeP95Ms: percentile(finalizeMs, 95),
        count429: counters.count429,
        retries: counters.retries,
        putConcurrency,
        totalMs,
      };
      setTransfer((current) => {
        if (!current) return current;
        const failedItems = current.items.filter((item) => item.status === "failed");
        return {
          ...current,
          phase: cancelledRef.current ? "cancelled" : "done",
          unchanged: counters.skippedUnchanged,
          etaSeconds: null,
          profile: {
            ...profile,
            failed: failedItems.length,
            failures: failedItems
              .map((item) => item.error)
              .filter((error): error is string => Boolean(error)),
          },
        };
      });
      if (!cancelledRef.current) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const entries = captureDroppedEntries(event.dataTransfer);
    const listed = sourcesFromFileList(event.dataTransfer.files);
    setDrag(false);
    if (!workspaceId || busy) return;
    if (entries.length) {
      setBusy(true);
      setStatus("");
      setTransfer({
        title: entries[0]?.name ?? "Upload",
        phase: "preparing",
        scanned: 0,
        skipped: [],
        unchanged: 0,
        items: [],
        etaSeconds: null,
        profile: null,
      });
      try {
        const scanStarted = performance.now();
        const { sources, errors, skipped } = await sourcesFromEntries(entries, { smartIgnore: !includeGenerated });
        await uploadSources(sources, {
          errors,
          skipped,
          scanned: sources.length + skippedFileCount(skipped),
          scanMs: Math.round(performance.now() - scanStarted),
        });
      } catch (error) {
        setBusy(false);
        setStatus(error instanceof Error ? error.message : "The dropped folder could not be read.");
      }
      return;
    }
    await uploadSources(listed);
  }

  function openFolderPicker() {
    const node = folderInput.current;
    if (!node) return;
    bindDirectoryPicker(node);
    node.value = "";
    node.click();
  }

  async function submitOperate(id: string, kind: "file" | "folder", action: "rename" | "move" | "trash" | "restore", name?: string, parentId?: string | null) {
    const response = await fetch(`/api/cloud/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, action, name, parentId }),
    });
    if (response.ok) {
      setDialog(null);
      if (view === "trash") void loadTrash();
      else router.refresh();
    } else setStatus(((await response.json()) as { error?: string }).error ?? "Update failed.");
  }

  async function submitDestroy(id: string, kind: "file" | "folder") {
    const response = await fetch(`/api/cloud/items/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, confirmation: "DELETE PERMANENTLY" }),
    });
    if (response.ok) {
      setDialog(null);
      void loadTrash();
    } else setStatus(((await response.json()) as { error?: string }).error ?? "Delete failed.");
  }

  async function submitCreateFolder() {
    const name = dialogValue.trim();
    if (!name || !workspaceId) return;
    const response = await fetch("/api/cloud/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, projectId: uploadProjectId }),
    });
    if (response.ok) {
      setDialog(null);
      router.refresh();
    } else setStatus(((await response.json()) as { error?: string }).error ?? "Folder could not be created.");
  }

  function cancelRestore() {
    setRestore((current) => {
      if (!current || !canCancelRestore(current.phase)) return current;
      restoreAbortRef.current?.abort();
      return { ...current, phase: "canceled" };
    });
  }

  function triggerRestoreDownload(blob: Blob, filename: string) {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 30_000);
  }

  async function restoreFolderToDevice(folder: LibraryFolder, summary: FolderSummary) {
    if (!claimRestoreSlot(restoringRef)) return;
    const controller = new AbortController();
    restoreAbortRef.current = controller;
    try {
      await runRestoreToDevice({
        folderId: folder.id,
        folderName: folder.name,
        initialFiles: summary.backedUp,
        initialBytes: summary.sizeBytes,
        signal: controller.signal,
        download: triggerRestoreDownload,
        report: (state) => {
          if (!mountedRef.current) return;
          if (controller.signal.aborted && state.phase !== "canceled" && state.phase !== "done") {
            setRestore({ ...state, phase: "canceled" });
            return;
          }
          setRestore(state);
        },
      });
    } finally {
      if (restoreAbortRef.current === controller) restoreAbortRef.current = null;
      releaseRestoreSlot(restoringRef);
    }
  }

  function blockedFolderIds(startId: string) {
    const blocked = new Set<string>([startId]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const folder of visibleFolders) {
        if (folder.parent_id && blocked.has(folder.parent_id) && !blocked.has(folder.id)) {
          blocked.add(folder.id);
          grew = true;
        }
      }
    }
    return blocked;
  }

  function projectNameFor(projectId: string | null | undefined) {
    if (!projectId) return null;
    return projects.find((project) => project.id === projectId)?.name ?? null;
  }

  const hasContent = visibleFiles.length > 0 || visibleFolders.length > 0;
  const uploadingCount = (transfer?.items ?? []).filter((item) => item.status === "uploading").length;
  const verifyingCount = (transfer?.items ?? []).filter((item) => item.status === "verifying").length;
  const currentNames = (transfer?.items ?? [])
    .filter((item) => item.status === "uploading" || item.status === "verifying")
    .slice(0, 8)
    .map((item) => basename(item.relativePath));
  const bytesDone = (transfer?.items ?? []).filter((item) => item.status === "backed_up" || item.status === "skipped").reduce((n, item) => n + item.size, 0);
  const bytesTotal = (transfer?.items ?? []).reduce((n, item) => n + item.size, 0);

  return (
    <div
      className="cloud-shell"
      data-drag={drag ? "true" : undefined}
      onDragOver={(e) => {
        if (!workspaceId || busy) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDrag(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false);
      }}
      onDrop={(e) => {
        void handleDrop(e);
      }}
    >
      {drag ? (
        <div className="cloud-drop-hint" aria-hidden="true">
          <span>
            <CloudUpload />
            Drop to back up to Candler Cloud
          </span>
        </div>
      ) : null}

      {restore ? (
        <CloudRestoreStatus
          title={restore.title}
          phase={restore.phase}
          files={restore.files}
          bytes={restore.bytes}
          error={restore.error}
          onCancel={restoreBusy ? cancelRestore : undefined}
        />
      ) : null}

      {transfer ? (
        <CloudTransfer
          title={transfer.title}
          phase={transfer.phase}
          scanned={transfer.scanned}
          skipped={transfer.skipped}
          unchanged={transfer.unchanged}
          items={transfer.items}
          current={currentNames}
          uploadingCount={uploadingCount}
          verifyingCount={verifyingCount}
          bytesDone={bytesDone}
          bytesTotal={bytesTotal}
          etaSeconds={transfer.etaSeconds}
          onCancel={transfer.phase === "uploading" ? cancelUpload : undefined}
          profile={transfer.profile}
        />
      ) : null}

      <div className="data-surface cloud-browser">
        <div className="data-toolbar">
          <div className="segmented" style={{ margin: 0 }}>
            <button className={view === "files" ? "active" : undefined} onClick={() => setView("files")}>Files</button>
            <button
              className={view === "trash" ? "active" : undefined}
              onClick={() => {
                setView("trash");
                void loadTrash();
              }}
            >
              Restore points
            </button>
          </div>
          <div className="flex gap-2 cloud-toolbar-actions">
            <input
              ref={input}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                const sources = sourcesFromFileList(event.target.files);
                event.target.value = "";
                void uploadSources(sources);
              }}
            />
            <input
              ref={(node) => {
                folderInput.current = node;
                bindDirectoryPicker(node);
              }}
              type="file"
              multiple
              hidden
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                const sources = sourcesFromFileList(event.target.files);
                event.target.value = "";
                void uploadSources(sources, { scanned: sources.length });
              }}
            />
            <label className="cloud-smart-toggle" title="Leave unchecked for Smart Backup (recommended)">
              <input
                type="checkbox"
                checked={includeGenerated}
                disabled={busy}
                onChange={(event) => setIncludeGenerated(event.target.checked)}
              />
              Include ignored/generated files
            </label>
            <button className="secondary-button" disabled={!workspaceId || busy} onClick={() => {
              setDialogValue("");
              setDialog({ type: "create-folder" });
            }}><FolderPlus />New folder</button>
            <button className="secondary-button" disabled={!workspaceId || busy} onClick={openFolderPicker}><FolderInput />Upload folder</button>
            <button className="primary-button" disabled={!workspaceId || busy} onClick={() => input.current?.click()}><Upload />Upload</button>
          </div>
        </div>
        {status ? <p className="upload-status">{status}</p> : null}
        {view === "trash" ? (
          !trashed?.files.length && !trashed?.folders.length ? (
            <div className="empty-state">
              <h2>No restore points.</h2>
              <p>Items moved to Trash can be restored to Cloud. This is not Restore to Device — that downloads a live backed-up folder to your computer.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <p className="cloud-tab-note">Restore to Cloud puts a trashed item back in Candler Cloud. Restore to Device downloads a backed-up folder from Files.</p>
              <table>
                <thead><tr><th>Name</th><th>Deleted</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {(trashed?.folders ?? []).map((item) => (
                    <tr key={item.id}>
                      <td><div className="file-name"><Folder /><b>{item.name}</b></div></td>
                      <td>{new Date(item.deleted_at).toLocaleString()}</td>
                      <td><span className="status warning status-cell">In trash</span></td>
                      <td>
                        <CloudActionMenu
                          label={`Actions for ${item.name}`}
                          items={trashMenuItems({
                            name: item.name,
                            kind: "folder",
                            onRestoreCloud: () => void submitOperate(item.id, "folder", "restore"),
                            onDelete: () => {
                              setDialog({ type: "delete", id: item.id, kind: "folder", name: item.name });
                            },
                          })}
                        />
                      </td>
                    </tr>
                  ))}
                  {(trashed?.files ?? []).map((item) => (
                    <tr key={item.id}>
                      <td><div className="file-name"><File /><b>{item.original_filename}</b></div></td>
                      <td>{new Date(item.deleted_at).toLocaleString()}</td>
                      <td><span className="status warning status-cell">In trash</span></td>
                      <td>
                        <CloudActionMenu
                          label={`Actions for ${item.original_filename}`}
                          items={trashMenuItems({
                            name: item.original_filename,
                            kind: "file",
                            onRestoreCloud: () => void submitOperate(item.id, "file", "restore"),
                            onDelete: () => {
                              setDialog({ type: "delete", id: item.id, kind: "file", name: item.original_filename });
                            },
                          })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : !hasContent && !transfer ? (
          <div className="empty-state">
            <span className="agent-symbol" style={{ borderColor: "var(--color-line-strong)" }}><CloudUpload /></span>
            <h2>Your cloud is empty.</h2>
            <p>Drag a project, folder, or file here to back it up. Smart Backup skips node_modules, .next, and other generated directories.</p>
            <button className="primary-button" disabled={!workspaceId || busy} onClick={() => input.current?.click()}><Upload />Upload your first file</button>
          </div>
        ) : (
          <CloudLibrary
            files={visibleFiles}
            folders={visibleFolders}
            handlers={{
              onExpand: () => undefined,
              onRestoreDevice: (folder, summary) => void restoreFolderToDevice(folder, summary),
              restoreBusy,
              onDownloadFile: async (item) => {
                const response = await fetch(`/api/cloud/download/${item.id}`);
                const body = await response.json() as { downloadUrl?: string; error?: string };
                if (response.ok && body.downloadUrl) location.href = body.downloadUrl;
                else setStatus(body.error ?? "Download failed.");
              },
              onRename: (id, kind, name) => {
                setDialogValue(name);
                setDialog({ type: "rename", id, kind, name });
              },
              onMove: (id, kind, name) => {
                setMoveParentId(null);
                setDialog({ type: "move", id, kind, name });
              },
              onDetailsFolder: (folder, summary) => {
                setDetails({
                  kind: "folder",
                  name: folder.name,
                  status: folderStatus(summary).label,
                  sizeBytes: summary.sizeBytes,
                  fileCount: summary.fileCount,
                  folderCount: summary.folderCount,
                  createdAt: folder.created_at,
                  updatedAt: summary.latestUpdated,
                  projectName: projectNameFor(folder.project_id),
                  backedUp: summary.backedUp,
                });
              },
              onDetailsFile: (file) => {
                setDetails({
                  kind: "file",
                  name: file.original_filename,
                  status: file.status === "backed_up" ? "Backed up" : file.status === "failed" ? "Needs attention" : file.status === "verifying" ? "Verifying" : "Uploading",
                  sizeBytes: Number(file.size_bytes) || 0,
                  mimeType: file.mime_type,
                  createdAt: file.created_at,
                  updatedAt: file.updated_at,
                  projectName: projectNameFor(file.project_id),
                  relativePath: file.relative_path,
                });
              },
              onTrash: (id, kind, name) => setDialog({ type: "trash", id, kind, name }),
            }}
          />
        )}
      </div>
      <CloudDetails target={details} onClose={() => setDetails(null)} />
      {dialog?.type === "rename" ? (
        <CloudDialog
          open
          title="Rename"
          description={`Change the name of ${dialog.name}.`}
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => void submitOperate(dialog.id, dialog.kind, "rename", dialogValue.trim())}>Save</button>
            </>
          )}
        >
          <label>
            Name
            <input value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} autoFocus />
          </label>
        </CloudDialog>
      ) : null}
      {dialog?.type === "move" ? (
        <CloudDialog
          open
          title="Move to folder"
          description="Choose a destination in your Cloud library. Cloud root is the top level."
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => void submitOperate(dialog.id, dialog.kind, "move", undefined, moveParentId)}>Move</button>
            </>
          )}
        >
          <MovePicker
            folders={visibleFolders}
            blocked={dialog.kind === "folder" ? blockedFolderIds(dialog.id) : new Set()}
            selected={moveParentId}
            onSelect={setMoveParentId}
          />
        </CloudDialog>
      ) : null}
      {dialog?.type === "trash" ? (
        <CloudDialog
          open
          title="Move to Trash"
          description={`${dialog.name} will move to Restore points. You can Restore to Cloud later. This does not download the files.`}
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => void submitOperate(dialog.id, dialog.kind, "trash")}>Move to Trash</button>
            </>
          )}
        >
          <p>The Cloud backup is not downloaded or deleted from object storage until you delete it permanently.</p>
        </CloudDialog>
      ) : null}
      {dialog?.type === "delete" ? (
        <CloudDialog
          open
          title="Delete permanently"
          description={`Permanently delete ${dialog.name}? This removes the stored object and cannot be undone.`}
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => void submitDestroy(dialog.id, dialog.kind)}>Delete permanently</button>
            </>
          )}
        >
          <p>This cannot be restored to Cloud or to your device afterwards.</p>
        </CloudDialog>
      ) : null}
      {dialog?.type === "create-folder" ? (
        <CloudDialog
          open
          title="New folder"
          onClose={() => setDialog(null)}
          footer={(
            <>
              <button type="button" className="secondary-button" onClick={() => setDialog(null)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => void submitCreateFolder()}>Create</button>
            </>
          )}
        >
          <label>
            Folder name
            <input value={dialogValue} onChange={(event) => setDialogValue(event.target.value)} autoFocus />
          </label>
        </CloudDialog>
      ) : null}
    </div>
  );
}

function MovePicker({
  folders,
  blocked,
  selected,
  onSelect,
}: {
  folders: CloudFolder[];
  blocked: Set<string>;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const byParent = new Map<string | "root", CloudFolder[]>();
  for (const folder of folders) {
    if (blocked.has(folder.id)) continue;
    const key = folder.parent_id ?? "root";
    const list = byParent.get(key) ?? [];
    list.push(folder);
    byParent.set(key, list);
  }

  function rows(parentId: string | "root", depth: number): ReactNode {
    return (byParent.get(parentId) ?? []).map((folder) => (
      <div key={folder.id}>
        <button
          type="button"
          className={selected === folder.id ? "cloud-move-option active" : "cloud-move-option"}
          style={{ paddingLeft: `${0.7 + depth * 1.1}rem` }}
          onClick={() => onSelect(folder.id)}
        >
          {folder.name}
        </button>
        {rows(folder.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="cloud-move-picker" role="listbox" aria-label="Destination folder">
      <button
        type="button"
        className={selected === null ? "cloud-move-option active" : "cloud-move-option"}
        onClick={() => onSelect(null)}
      >
        Cloud root
      </button>
      {rows("root", 1)}
    </div>
  );
}
