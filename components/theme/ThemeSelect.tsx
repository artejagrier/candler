"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
import { COLOR_MODES, ENVIRONMENT_MODES, familyById, shadeById, supportsShades } from "@/lib/theme/catalog";
import { canHoverPreview } from "@/lib/theme/storage";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utilities/cn";

type ModeSelectProps = {
  compact?: boolean;
  labelledBy?: string;
};

export function ModeSelect({ compact = false, labelledBy }: ModeSelectProps) {
  const { mode, shade, setPreview, commit } = useTheme();
  const family = familyById(mode);
  const current = shadeById(family, shade);
  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState(mode);
  const [activeShade, setActiveShade] = useState(shade);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [menuBox, setMenuBox] = useState({ top: 0, left: 0, width: 0 });
  const activeFamily = familyById(activeMode);
  const showShades = supportsShades(activeMode);

  const close = useCallback(() => {
    setOpen(false);
    setPreview(null);
    setActiveMode(mode);
    setActiveShade(shade);
  }, [mode, setPreview, shade]);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.max(rect.width, compact ? 240 : 280);
    const left = Math.min(rect.left, window.innerWidth - width - 12);
    const below = rect.bottom + 8;
    const estimated = 520;
    const top = below + estimated > window.innerHeight ? Math.max(12, rect.top - estimated) : below;
    setMenuBox({ top, left: Math.max(12, left), width });
  }, [compact]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    const onReposition = () => positionMenu();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [close, open, positionMenu]);

  const openMenu = useCallback(() => {
    setActiveMode(mode);
    setActiveShade(shade);
    positionMenu();
    setOpen(true);
  }, [mode, positionMenu, shade]);

  const previewIfHover = useCallback(
    (next: { mode: string; shade?: string }) => {
      if (canHoverPreview()) setPreview(next);
    },
    [setPreview],
  );

  const shades = useMemo(() => activeFamily.shades, [activeFamily]);

  return (
    <div className={cn("theme-select", compact && "theme-select--compact")} ref={wrapRef}>
      {compact ? (
        <span className="theme-select-kicker" aria-hidden="true">
          Mode
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className="theme-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : `Mode ${family.label}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(event) => {
          if ((event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") && !open) {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span className="theme-swatch" style={{ background: current.tokens["--color-brand"] }} aria-hidden="true" />
        <span className="theme-select-copy">{family.label}</span>
        <span className="theme-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="listbox"
              aria-label="Workspace mode"
              className="theme-menu"
              style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
              onMouseLeave={() => {
                if (canHoverPreview()) setPreview(null);
              }}
            >
              <p className="theme-menu-heading">Brand / Color</p>
              <div className="theme-menu-list">
                {COLOR_MODES.map((item) => {
                  const selected = item.id === mode;
                  const focused = item.id === activeMode;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn("theme-menu-item", focused && "is-active", selected && "is-selected")}
                      onMouseEnter={() => {
                        setActiveMode(item.id);
                        setActiveShade(item.defaultShade);
                        previewIfHover({ mode: item.id, shade: item.defaultShade });
                      }}
                      onFocus={() => {
                        setActiveMode(item.id);
                        setActiveShade(item.defaultShade);
                        setPreview({ mode: item.id, shade: item.defaultShade });
                      }}
                      onClick={() => {
                        commit({ mode: item.id, shade: item.defaultShade });
                        setOpen(false);
                      }}
                    >
                      <span
                        className="theme-swatch"
                        style={{ background: shadeById(item, item.defaultShade).tokens["--color-brand"] }}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="theme-menu-heading">Special Environments</p>
              <div className="theme-menu-list">
                {ENVIRONMENT_MODES.map((item) => {
                  const selected = item.id === mode;
                  const focused = item.id === activeMode;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn("theme-menu-item", focused && "is-active", selected && "is-selected")}
                      onMouseEnter={() => {
                        setActiveMode(item.id);
                        setActiveShade(item.defaultShade);
                        previewIfHover({ mode: item.id });
                      }}
                      onFocus={() => {
                        setActiveMode(item.id);
                        setActiveShade(item.defaultShade);
                        setPreview({ mode: item.id });
                      }}
                      onClick={() => {
                        commit({ mode: item.id });
                        setOpen(false);
                      }}
                    >
                      <span
                        className="theme-swatch"
                        style={{ background: shadeById(item, item.defaultShade).tokens["--color-brand"] }}
                        aria-hidden="true"
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              {showShades ? (
                <>
                  <p className="theme-menu-heading">Shade</p>
                  <div className="theme-menu-list">
                    {shades.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={activeMode === mode && item.id === shade}
                        className={cn(
                          "theme-menu-item",
                          item.id === activeShade && "is-active",
                          activeMode === mode && item.id === shade && "is-selected",
                        )}
                        onMouseEnter={() => {
                          setActiveShade(item.id);
                          previewIfHover({ mode: activeMode, shade: item.id });
                        }}
                        onFocus={() => {
                          setActiveShade(item.id);
                          setPreview({ mode: activeMode, shade: item.id });
                        }}
                        onClick={() => {
                          commit({ mode: activeMode, shade: item.id });
                          setOpen(false);
                        }}
                      >
                        <span className="theme-swatch" style={{ background: item.tokens["--color-brand"] }} aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export const ThemeSelect = ModeSelect;

export function ShadeSelect() {
  const { mode, shade, setPreview, commit } = useTheme();
  const family = familyById(mode);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = useCallback(() => {
    setOpen(false);
    setPreview(null);
  }, [setPreview]);
  useOutsideDismiss(wrapRef, open, close);
  const current = shadeById(family, shade);
  if (!supportsShades(mode)) return null;

  return (
    <div className="theme-select" ref={wrapRef}>
      <button
        type="button"
        className="theme-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Shade"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="theme-swatch" style={{ background: current.tokens["--color-brand"] }} aria-hidden="true" />
        <span className="theme-select-copy">{current.label}</span>
        <span className="theme-select-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label="Mode shade"
          className="theme-menu theme-menu--inline"
          onMouseLeave={() => {
            if (canHoverPreview()) setPreview(null);
          }}
        >
          {family.shades.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === shade}
              className={cn("theme-menu-item", item.id === shade && "is-selected")}
              onMouseEnter={() => {
                if (canHoverPreview()) setPreview({ mode, shade: item.id });
              }}
              onFocus={() => setPreview({ mode, shade: item.id })}
              onClick={() => {
                commit({ mode, shade: item.id });
                setOpen(false);
              }}
            >
              <span className="theme-swatch" style={{ background: item.tokens["--color-brand"] }} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
