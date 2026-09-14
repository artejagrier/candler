"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type AuthenticatorMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
} | { id: string; separator: true };

export function AuthenticatorMenu({
  label,
  items,
}: {
  label: string;
  items: AuthenticatorMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, sheet: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const itemCount = items.filter((item) => !("separator" in item)).length;

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function menuButtons() {
    return Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);
  }

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const node = triggerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const sheet = window.innerWidth < 640;
      const width = sheet ? Math.min(window.innerWidth - 24, 22 * 16) : 16 * 16;
      const left = sheet
        ? (window.innerWidth - width) / 2
        : Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
      const estimated = Math.min(itemCount * 48 + 16, window.innerHeight * 0.7);
      const below = rect.bottom + 8;
      const top = sheet
        ? Math.max(8, window.innerHeight - estimated - 16)
        : below + estimated > window.innerHeight - 8
          ? Math.max(8, rect.top - estimated - 8)
          : below;
      setCoords({ top, left, sheet });
    };
    place();
    const frame = window.requestAnimationFrame(() => menuButtons()[0]?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      const buttons = menuButtons();
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        buttons[(index + 1 + buttons.length) % buttons.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        buttons[(index - 1 + buttons.length) % buttons.length]?.focus();
      } else if (event.key === "Tab") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, itemCount]);

  return (
    <div className="authenticator-menu-wrap" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="authenticator-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal />
      </button>
      {open
        ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            className={coords.sheet ? "authenticator-menu authenticator-menu--sheet" : "authenticator-menu"}
            style={{ top: coords.top, left: coords.left, width: coords.sheet ? Math.min(window.innerWidth - 24, 22 * 16) : undefined }}
          >
            {items.map((item, index) => {
              if ("separator" in item) return <div key={`sep-${index}`} className="authenticator-menu-sep" role="separator" />;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={item.danger ? "authenticator-menu-item authenticator-menu-item--danger" : "authenticator-menu-item"}
                  onClick={() => {
                    close();
                    item.onSelect();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
