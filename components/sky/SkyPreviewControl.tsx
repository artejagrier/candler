"use client";

import { Moon, RotateCcw, Sun, Sunrise, Sunset } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useSky } from "@/components/providers/SkyProvider";
import { cn } from "@/lib/utilities/cn";
import { SKY_PERIOD_LABELS, type SkyPeriod } from "@/lib/utilities/time";

const OPTIONS: { period: SkyPeriod; icon: LucideIcon }[] = [
  { period: "morning", icon: Sunrise },
  { period: "afternoon", icon: Sun },
  { period: "evening", icon: Sunset },
  { period: "night", icon: Moon },
];

/**
 * Development-only control for previewing each sky period without waiting for
 * the clock. Render it only in non-production builds — it manipulates the same
 * override the future timezone setting will use.
 */
export function SkyPreviewControl() {
  const { period, isOverridden, setOverride } = useSky();

  return (
    <div
      className="glass fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full p-1.5 shadow-glow-sm"
      role="group"
      aria-label="Preview sky time of day (development)"
    >
      {OPTIONS.map(({ period: p, icon: Icon }) => {
        const active = isOverridden && period === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => setOverride(p)}
            aria-pressed={active}
            title={SKY_PERIOD_LABELS[p]}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-purple text-white"
                : "text-fog hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="sr-only">{SKY_PERIOD_LABELS[p]}</span>
          </button>
        );
      })}
      <span className="mx-0.5 h-5 w-px bg-line" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setOverride(null)}
        disabled={!isOverridden}
        title="Auto (local time)"
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          isOverridden
            ? "text-fog hover:bg-white/8 hover:text-white"
            : "text-slate-muted cursor-default",
        )}
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        <span className="sr-only">Reset to local time</span>
      </button>
    </div>
  );
}
