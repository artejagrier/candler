"use client";

import { useRef, useState } from "react";
import { Download, File, Folder, FolderInput, FolderPlus, Pencil, RotateCcw, Trash2, Upload } from "lucide-react";

type CloudFile = {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  folder_id: string | null;
  updated_at: string;
};
type CloudFolder = { id: string; name: string; parent_id: string | null; updated_at: string };
type Project = { id: string; name: string };
type Trashed = { files: { id: string; original_filename: string; deleted_at: string }[]; folders: { id: string; name: string; deleted_at: string }[] };

async function sha256(file: globalThis.File) {
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

export function CloudBrowser({
  workspaceId,
  files,
  folders,
  projects,
}: {
  workspaceId: string | null;
  files: CloudFile[];
  folders: CloudFolder[];
  projects: Project[];
}) {
  const input = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"files" | "trash">("files");
  const [trashed, setTrashed] = useState<Trashed | null>(null);

  async function loadTrash() {
    const response = await fetch("/api/cloud/trash");
    const body = await response.json() as Trashed & { error?: string };
    if (response.ok) setTrashed(body);
    else setStatus(body.error ?? "Trash could not be loaded.");
  }

  async function upload(selected: FileList | null) {
    if (!selected || !workspaceId) return;
    setBusy(true);
    try {
      for (const file of Array.from(selected)) {
        setStatus(`Authorizing ${file.name}…`);
        const checksumSha256 = await sha256(file);
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || null;
        const auth = await fetch("/api/cloud/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: projects[0]?.id ?? null,
            filename: file.name,
            relativePath,
            contentType: file.type || "application/octet-stream",
            size: file.size,
            checksumSha256,
          }),
        });
        const body = await auth.json() as { error?: string; fileId?: string; uploadUrl?: string };
        if (!auth.ok) throw new Error(body.error);
        setStatus(`Uploading ${file.name}…`);
        const put = await fetch(body.uploadUrl!, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-amz-checksum-sha256": checksumSha256,
          },
          body: file,
        });
        if (!put.ok) throw new Error("Object upload failed.");
        setStatus(`Verifying ${file.name}…`);
        const final = await fetch("/api/cloud/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: body.fileId }),
        });
        const done = await final.json() as { error?: string };
        if (!final.ok) throw new Error(done.error);
      }
      setStatus("Backup verified. Refreshing…");
      location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function operate(id: string, kind: "file" | "folder", action: "rename" | "move" | "trash" | "restore", current: string) {
    let name: string | undefined;
    let parentId: string | null | undefined;
    if (action === "rename") {
      name = prompt("New name", current) ?? undefined;
      if (!name) return;
    }
    if (action === "move") {
      const target = prompt("Destination folder id (blank for root)", "") ?? undefined;
      if (target === undefined) return;
      parentId = target.trim() ? target.trim() : null;
    }
    if (action === "trash" && !confirm(`Move ${current} to Trash?`)) return;
    const response = await fetch(`/api/cloud/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, action, name, parentId }),
    });
    if (response.ok) {
      if (view === "trash") void loadTrash();
      else location.reload();
    } else setStatus(((await response.json()) as { error?: string }).error ?? "Update failed.");
  }

  async function destroy(id: string, kind: "file" | "folder", current: string) {
    if (!confirm(`Permanently delete ${current}? This removes the stored object and cannot be undone.`)) return;
    const response = await fetch(`/api/cloud/items/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, confirmation: "DELETE PERMANENTLY" }),
    });
    if (response.ok) void loadTrash();
    else setStatus(((await response.json()) as { error?: string }).error ?? "Delete failed.");
  }

  async function createFolder() {
    const name = prompt("Folder name");
    if (!name || !workspaceId) return;
    const response = await fetch("/api/cloud/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, projectId: projects[0]?.id ?? null }),
    });
    if (response.ok) location.reload();
    else setStatus(((await response.json()) as { error?: string }).error ?? "Folder could not be created.");
  }

  return (
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
            Trash
          </button>
        </div>
        <div className="flex gap-2">
          <input ref={input} type="file" multiple hidden onChange={(event) => void upload(event.target.files)} />
          <input
            ref={folderInput}
            type="file"
            multiple
            hidden
            {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(event) => void upload(event.target.files)}
          />
          <button className="secondary-button" disabled={!workspaceId || busy} onClick={() => void createFolder()}><FolderPlus />New folder</button>
          <button className="secondary-button" disabled={!workspaceId || busy} onClick={() => folderInput.current?.click()}><FolderInput />Upload folder</button>
          <button className="primary-button" disabled={!workspaceId || busy} onClick={() => input.current?.click()}><Upload />Upload</button>
        </div>
      </div>
      {status ? <p className="upload-status">{status}</p> : null}
      {view === "trash" ? (
        !trashed?.files.length && !trashed?.folders.length ? (
          <div className="empty-state"><h2>Trash is empty.</h2><p>Deleted files and folders appear here until they are restored or permanently removed.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Deleted</th><th></th></tr></thead>
              <tbody>
                {(trashed?.folders ?? []).map((item) => (
                  <tr key={item.id}>
                    <td><div className="file-name"><Folder /><b>{item.name}</b></div></td>
                    <td>{new Date(item.deleted_at).toLocaleString()}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => void operate(item.id, "folder", "restore", item.name)} aria-label="Restore"><RotateCcw /></button>
                        <button onClick={() => void destroy(item.id, "folder", item.name)} aria-label="Delete permanently"><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(trashed?.files ?? []).map((item) => (
                  <tr key={item.id}>
                    <td><div className="file-name"><File /><b>{item.original_filename}</b></div></td>
                    <td>{new Date(item.deleted_at).toLocaleString()}</td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => void operate(item.id, "file", "restore", item.original_filename)} aria-label="Restore"><RotateCcw /></button>
                        <button onClick={() => void destroy(item.id, "file", item.original_filename)} aria-label="Delete permanently"><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : !files.length && !folders.length ? (
        <div className="empty-state">
          <h2>Your cloud is empty.</h2>
          <p>Upload a project, folder, or file. Candler marks it backed up only after verification.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Status</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {folders.map((item) => (
                <tr key={item.id}>
                  <td><div className="file-name"><Folder /><b>{item.name}</b></div></td>
                  <td>Folder</td>
                  <td>—</td>
                  <td>Available</td>
                  <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => void operate(item.id, "folder", "rename", item.name)} aria-label="Rename"><Pencil /></button>
                      <button onClick={() => void operate(item.id, "folder", "move", item.name)} aria-label="Move"><FolderInput /></button>
                      <button onClick={() => void operate(item.id, "folder", "trash", item.name)} aria-label="Trash"><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {files.map((item) => (
                <tr key={item.id}>
                  <td><div className="file-name"><File /><b>{item.original_filename}</b></div></td>
                  <td>{item.mime_type}</td>
                  <td>{(Number(item.size_bytes) / 1024 / 1024).toFixed(1)} MB</td>
                  <td>{item.status}</td>
                  <td>{new Date(item.updated_at).toLocaleDateString()}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        disabled={item.status !== "backed_up"}
                        onClick={async () => {
                          const response = await fetch(`/api/cloud/download/${item.id}`);
                          const body = await response.json() as { downloadUrl?: string; error?: string };
                          if (response.ok && body.downloadUrl) location.href = body.downloadUrl;
                          else setStatus(body.error ?? "Download failed.");
                        }}
                        aria-label="Download"
                      >
                        <Download />
                      </button>
                      <button onClick={() => void operate(item.id, "file", "rename", item.original_filename)} aria-label="Rename"><Pencil /></button>
                      <button onClick={() => void operate(item.id, "file", "move", item.original_filename)} aria-label="Move"><FolderInput /></button>
                      <button onClick={() => void operate(item.id, "file", "trash", item.original_filename)} aria-label="Trash"><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
