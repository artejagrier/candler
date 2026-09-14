"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useSky } from "@/components/providers/SkyProvider";
import {
  DEFAULT_MODE,
  DEFAULT_SHADE,
  type ModeId,
  familyById,
  resolveAppearance,
} from "@/lib/theme/catalog";
import {
  applyModeToDocument,
  getAppearanceSnapshot,
  subscribeAppearance,
  writeAppearance,
} from "@/lib/theme/storage";
import type { SkyPeriod } from "@/lib/utilities/time";

type AppearanceState = {
  mode: ModeId;
  shade: string;
  skyPeriod: SkyPeriod | null;
};

type ThemeContextValue = AppearanceState & {
  theme: ModeId;
  setPreview: (next: { mode: string; shade?: string } | null) => void;
  commit: (next: { mode: string; shade?: string }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function appearanceFrom(mode?: string, shade?: string): AppearanceState {
  const resolved = resolveAppearance(mode, shade);
  return { mode: resolved.mode, shade: resolved.shadeId, skyPeriod: resolved.skyPeriod };
}

export function ThemeProvider({
  children,
  initialMode = DEFAULT_MODE,
  initialShade = DEFAULT_SHADE,
  initialTheme,
}: {
  children: ReactNode;
  initialMode?: string;
  initialShade?: string;
  initialTheme?: string;
}) {
  const { setOverride } = useSky();
  const serverSnapshot = useMemo(
    () => appearanceFrom(initialMode || initialTheme, initialShade),
    [initialMode, initialShade, initialTheme],
  );
  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);
  const saved = useSyncExternalStore(subscribeAppearance, getAppearanceSnapshot, getServerSnapshot);

  const apply = useCallback((mode: string, shade: string) => {
    const resolved = resolveAppearance(mode, shade);
    applyModeToDocument(resolved.mode, resolved.shadeId);
    setOverride(resolved.skyPeriod);
  }, [setOverride]);

  useLayoutEffect(() => {
    apply(saved.mode, saved.shade);
  }, [apply, saved.mode, saved.shade]);

  const setPreview = useCallback(
    (next: { mode: string; shade?: string } | null) => {
      if (!next) {
        apply(saved.mode, saved.shade);
        return;
      }
      const resolved = resolveAppearance(next.mode, next.shade ?? familyById(next.mode).defaultShade);
      apply(resolved.mode, resolved.shadeId);
    },
    [apply, saved.mode, saved.shade],
  );

  const commit = useCallback(
    (next: { mode: string; shade?: string }) => {
      const resolved = resolveAppearance(next.mode, next.shade ?? familyById(next.mode).defaultShade);
      apply(resolved.mode, resolved.shadeId);
      writeAppearance(resolved.mode, resolved.shadeId);
    },
    [apply],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ ...saved, theme: saved.mode, setPreview, commit }),
    [commit, saved, setPreview],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const useMode = useTheme;
