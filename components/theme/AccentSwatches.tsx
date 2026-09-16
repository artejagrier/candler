"use client";

import { ACCENT_CATALOG, type AccentId } from "@/lib/theme/catalog";
import { canHoverPreview } from "@/lib/theme/storage";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utilities/cn";

export function AccentSwatches({ labelledBy }: { labelledBy?: string }) {
  const { accent, setPreviewAccent, commitAccent } = useTheme();

  const preview = (id: AccentId) => {
    if (canHoverPreview()) setPreviewAccent(id);
  };

  return (
    <div
      className="accent-swatches"
      role="radiogroup"
      aria-labelledby={labelledBy}
      onMouseLeave={() => {
        if (canHoverPreview()) setPreviewAccent(null);
      }}
    >
      {ACCENT_CATALOG.map((item) => {
        const selected = item.id === accent;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={item.label}
            className={cn("accent-swatch", selected && "is-selected")}
            onMouseEnter={() => preview(item.id)}
            onFocus={() => setPreviewAccent(item.id)}
            onPointerDown={() => {
              commitAccent(item.id);
            }}
            onClick={() => {
              commitAccent(item.id);
            }}
          >
            <span className="accent-swatch-chip" style={{ background: item.hex }} aria-hidden="true" />
            <span className="accent-swatch-name">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
