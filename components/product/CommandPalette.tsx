"use client";

import {
  Bot,
  Cloud,
  CornerDownLeft,
  FolderKanban,
  Home,
  KeyRound,
  Loader2,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useDialogA11y } from "@/hooks/useDialogA11y";
import { cn } from "@/lib/utilities/cn";

interface StaticCommand {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  href: string;
  keywords?: string[];
}

/** Actions + navigation. These NEVER expose secret values — they only route. */
const ACTIONS: StaticCommand[] = [
  { id: "a-project", label: "Create project", hint: "Start a new project", icon: Plus, href: "/app/projects", keywords: ["new", "add"] },
  { id: "a-secret", label: "Add a secret", hint: "Store an encrypted credential", icon: KeyRound, href: "/app/vault", keywords: ["key", "token", "env", "credential"] },
  { id: "a-auth", label: "Add authenticator", hint: "Set up a TOTP entry", icon: ShieldCheck, href: "/app/vault/authenticator", keywords: ["totp", "2fa", "otp", "mfa"] },
  { id: "a-upload", label: "Upload to Cloud", hint: "Back up files and project folders", icon: Upload, href: "/app/cloud", keywords: ["file", "folder", "backup"] },
  { id: "a-agent", label: "Ask Candler", hint: "Query your projects and health", icon: Bot, href: "/app/agent", keywords: ["ai", "assistant", "chat"] },
];

const NAV: StaticCommand[] = [
  { id: "n-home", label: "Home", hint: "Workspace overview", icon: Home, href: "/app" },
  { id: "n-projects", label: "Projects", hint: "All projects", icon: FolderKanban, href: "/app/projects" },
  { id: "n-vault", label: "Vault", hint: "Secrets, authenticator, recovery", icon: KeyRound, href: "/app/vault" },
  { id: "n-cloud", label: "Cloud", hint: "Verified backups", icon: Cloud, href: "/app/cloud" },
  { id: "n-agent", label: "Agent", hint: "Candler Agent", icon: Bot, href: "/app/agent" },
  { id: "n-settings", label: "Settings", hint: "Account, security, billing", icon: Settings, href: "/app/settings" },
];

interface SearchResult {
  type: string;
  id: string;
  label: string;
  href: string;
}

interface FlatItem {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon | null;
  href: string;
}

function matches(item: StaticCommand, query: string): boolean {
  if (!query) return true;
  const haystack = [item.label, item.hint, ...(item.keywords ?? [])].join(" ").toLowerCase();
  return query.toLowerCase().split(/\s+/).every((term) => haystack.includes(term));
}

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useDialogA11y(panelRef, onClose);

  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const showResults = query.trim().length >= 2;

  // Debounced live search against the workspace-scoped API (names/metadata
  // only). State updates happen inside callbacks (timeout / promise), never
  // synchronously in the effect body. Short queries are gated at render.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data: { results?: SearchResult[] }) => setResults(data.results ?? []))
        .catch(() => {
          /* aborted or offline — leave prior results */
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const staticActions = useMemo(() => ACTIONS.filter((i) => matches(i, query)), [query]);
  const staticNav = useMemo(() => NAV.filter((i) => matches(i, query)), [query]);

  const groups = useMemo(() => {
    const g: { heading: string; items: FlatItem[] }[] = [];
    if (staticActions.length) g.push({ heading: "Actions", items: staticActions.map((i) => ({ id: i.id, label: i.label, hint: i.hint, icon: i.icon, href: i.href })) });
    if (showResults && results.length) g.push({ heading: "Search results", items: results.map((r) => ({ id: `r-${r.type}-${r.id}`, label: r.label, hint: r.type, icon: null, href: r.href })) });
    if (staticNav.length) g.push({ heading: "Go to", items: staticNav.map((i) => ({ id: i.id, label: i.label, hint: i.hint, icon: i.icon, href: i.href })) });
    return g;
  }, [staticActions, staticNav, results, showResults]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const safeIndex = Math.min(activeIndex, Math.max(0, flat.length - 1));
  const activeId = flat[safeIndex]?.id;

  useEffect(() => {
    if (!activeId) return;
    listRef.current?.querySelector(`[data-item="${activeId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const go = (item: FlatItem | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const count = flat.length;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (count) setActiveIndex((safeIndex + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (count) setActiveIndex((safeIndex - 1 + count) % count);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(flat[safeIndex]);
    }
    // Escape is handled by useDialogA11y.
  };

  return createPortal(
    <div className="command-layer" role="presentation">
      <button type="button" aria-label="Close command palette" onClick={onClose} tabIndex={-1} className="command-scrim" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="command-panel animate-rise"
      >
        <div className="command-search">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={activeId}
            aria-label="Search projects, secrets, services, files, and conversations"
            placeholder="Search or run a command…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          {loading && showResults ? <Loader2 className="command-spinner" aria-hidden="true" /> : <kbd>Esc</kbd>}
        </div>

        <div ref={listRef} id="command-list" role="listbox" aria-label="Commands and results" className="command-list">
          {flat.length === 0 ? (
            <p className="command-empty">No matches for “{query}”.</p>
          ) : (
            groups.map((group) => (
              <div key={group.heading} className="command-group">
                <div className="command-heading">{group.heading}</div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === activeId;
                  return (
                    <div
                      key={item.id}
                      data-item={item.id}
                      id={item.id}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActiveIndex(flat.findIndex((i) => i.id === item.id))}
                      onClick={() => go(item)}
                      className={cn("command-item", isActive && "command-item--active")}
                    >
                      <span className="command-icon">{Icon ? <Icon aria-hidden="true" /> : <Search aria-hidden="true" />}</span>
                      <span className="command-text">
                        <span className="command-label">{item.label}</span>
                        <span className="command-hint">{item.hint}</span>
                      </span>
                      {isActive ? <CornerDownLeft className="command-enter" aria-hidden="true" /> : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
