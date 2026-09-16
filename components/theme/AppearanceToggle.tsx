"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utilities/cn";
import type { AppearanceId } from "@/lib/theme/catalog";

const OPTIONS: { id: AppearanceId; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

export function AppearanceToggle({
  compact = false,
  labelledBy,
}: {
  compact?: boolean;
  labelledBy?: string;
}) {
  const { appearance, commitAppearance } = useTheme();

  if (compact) {
    const next: AppearanceId = appearance === "dark" ? "light" : "dark";
    const Icon = appearance === "dark" ? Moon : Sun;
    return (
      <button
        type="button"
        className="appearance-toggle-compact"
        aria-label={`Appearance: ${appearance === "dark" ? "Dark" : "Light"}. Switch to ${next === "dark" ? "Dark" : "Light"}`}
        onClick={() => commitAppearance(next)}
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className="appearance-segment"
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = option.id === appearance;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn("appearance-segment-btn", selected && "is-selected")}
            onClick={() => commitAppearance(option.id)}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
