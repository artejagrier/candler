"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getCommandGroups } from "@/config/commands";
import { cn } from "@/lib/utilities/cn";
import { Kbd } from "@/components/ui/Kbd";
import type { CommandGroup, CommandItem } from "@/types/navigation";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** Case-insensitive match across label, hint, and keywords. */
function matches(item: CommandItem, query: string): boolean {
  if (!query) return true;
  const haystack = [item.label, item.hint ?? "", ...(item.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}

/**
 * The ⌘K / Ctrl+K command palette (Phase 1 shell).
 *
 * The outer component is a portal guard; the inner component holds the search
 * state so it resets naturally each time the palette opens (fresh mount) — no
 * reset effects, no mounted flag. `open` only flips via client interaction, so
 * `document.body` is always available when we render.
 */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  if (!open) return null;
  return createPortal(<CommandPaletteInner onClose={onClose} />, document.body);
}

function CommandPaletteInner({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo<CommandGroup[]>(() => getCommandGroups(), []);

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => matches(item, query)),
        }))
        .filter((group) => group.items.length > 0),
    [groups, query],
  );

  // Flat list of visible items so arrow keys can traverse across groups.
  const flatItems = useMemo(
    () => filteredGroups.flatMap((group) => group.items),
    [filteredGroups],
  );

  // Clamp during render (not via an effect) so results changing can't leave the
  // selection out of range.
  const safeIndex = Math.min(activeIndex, Math.max(0, flatItems.length - 1));
  const activeId = flatItems[safeIndex]?.id;

  // Focus the input on open (DOM side-effect only).
  useEffect(() => {
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  // Keep the active option scrolled into view (DOM side-effect only).
  useEffect(() => {
    if (!activeId) return;
    listRef.current
      ?.querySelector(`[data-item-id="${activeId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const activate = (item: CommandItem | undefined) => {
    if (!item?.href) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const count = flatItems.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (count) setActiveIndex((safeIndex + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (count) setActiveIndex((safeIndex - 1 + count) % count);
        break;
      case "Enter":
        event.preventDefault();
        activate(flatItems[safeIndex]);
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-ink/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onKeyDown}
        className="glass ring-glow animate-rise relative w-full max-w-xl overflow-hidden rounded-3xl"
      >
        {/* Search row */}
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="size-5 shrink-0 text-lavender" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={activeId}
            aria-label="Search projects, secrets, integrations, and more"
            placeholder="Search projects, secrets, integrations…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-14 w-full bg-transparent text-base text-mist outline-none placeholder:text-slate-muted"
          />
          <Kbd>Esc</Kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          aria-label="Results"
          className="max-h-[52vh] overflow-y-auto p-2"
        >
          {flatItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-fog">
              No results for “{query}”.
            </p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="mb-1">
                <div className="px-3 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-slate-muted">
                  {group.heading}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === activeId;
                  return (
                    <div
                      key={item.id}
                      id={item.id}
                      data-item-id={item.id}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() =>
                        setActiveIndex(flatItems.findIndex((i) => i.id === item.id))
                      }
                      onClick={() => activate(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                        isActive ? "bg-purple/18 text-white" : "text-mist",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg",
                          isActive ? "bg-purple/30" : "bg-white/5",
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {item.label}
                        </span>
                        {item.hint ? (
                          <span className="block truncate text-xs text-fog">
                            {item.hint}
                          </span>
                        ) : null}
                      </span>
                      {isActive ? (
                        <CornerDownLeft
                          className="size-4 shrink-0 text-lavender"
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
