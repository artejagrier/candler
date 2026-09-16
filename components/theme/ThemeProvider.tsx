"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  DEFAULT_ACCENT,
  DEFAULT_APPEARANCE,
  type AccentId,
  type AppearanceId,
  resolveAppearance,
} from "@/lib/theme/catalog";
import {
  applyAppearanceToDocument,
  getAppearanceSnapshot,
  subscribeAppearance,
  writeAppearance,
} from "@/lib/theme/storage";

type AppearanceState = {
  appearance: AppearanceId;
  accent: AccentId;
};

type ThemeContextValue = AppearanceState & {
  scheme: AppearanceId;
  setPreviewAccent: (next: AccentId | null) => void;
  commitAppearance: (next: AppearanceId) => void;
  commitAccent: (next: AccentId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialAppearance = DEFAULT_APPEARANCE,
  initialAccent = DEFAULT_ACCENT,
}: {
  children: ReactNode;
  initialAppearance?: string;
  initialAccent?: string;
}) {
  const serverSnapshot = useMemo(
    () => {
      const resolved = resolveAppearance(initialAppearance, initialAccent);
      return { appearance: resolved.appearance, accent: resolved.accent };
    },
    [initialAppearance, initialAccent],
  );
  const getServerSnapshot = useCallback(() => serverSnapshot, [serverSnapshot]);
  const saved = useSyncExternalStore(subscribeAppearance, getAppearanceSnapshot, getServerSnapshot);

  const apply = useCallback((appearance: string, accent: string) => {
    applyAppearanceToDocument(appearance, accent);
  }, []);

  useLayoutEffect(() => {
    apply(saved.appearance, saved.accent);
  }, [apply, saved.appearance, saved.accent]);

  const setPreviewAccent = useCallback(
    (next: AccentId | null) => {
      if (!next) {
        const stored = getAppearanceSnapshot();
        apply(stored.appearance, stored.accent);
        return;
      }
      apply(saved.appearance, next);
    },
    [apply, saved.appearance],
  );

  const commitAppearance = useCallback(
    (next: AppearanceId) => {
      apply(next, saved.accent);
      writeAppearance(next, saved.accent);
    },
    [apply, saved.accent],
  );

  const commitAccent = useCallback(
    (next: AccentId) => {
      apply(saved.appearance, next);
      writeAppearance(saved.appearance, next);
    },
    [apply, saved.appearance],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      appearance: saved.appearance,
      accent: saved.accent,
      scheme: saved.appearance,
      setPreviewAccent,
      commitAppearance,
      commitAccent,
    }),
    [commitAccent, commitAppearance, saved.accent, saved.appearance, setPreviewAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const useMode = useTheme;
