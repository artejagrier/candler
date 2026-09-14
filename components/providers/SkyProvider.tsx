"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import type { SkyPeriod } from "@/lib/utilities/time";

interface SkyContextValue {
  /** Explicit environment period, or null when a standard color mode is active. */
  period: SkyPeriod | null;
  /** True only while Sunrise / Day / Sunset / Night is selected or previewed. */
  isActive: boolean;
  /** Drive the protected sky from the Mode system. Pass null to unmount it. */
  setOverride: (period: SkyPeriod | null) => void;
}

const SkyContext = createContext<SkyContextValue | null>(null);

/**
 * Holds the explicit environment period for the protected sky.
 *
 * Color modes never inherit a local-time sky. The atmosphere mounts only when
 * ThemeProvider sets an override for Sunrise, Day, Sunset, or Night.
 */
export function SkyProvider({
  children,
  initialOverride = null,
}: {
  children: React.ReactNode;
  initialOverride?: SkyPeriod | null;
}) {
  const [override, setOverride] = useState<SkyPeriod | null>(initialOverride);

  const value = useMemo<SkyContextValue>(
    () => ({
      period: override,
      isActive: override !== null,
      setOverride,
    }),
    [override],
  );

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSky(): SkyContextValue {
  const ctx = useContext(SkyContext);
  if (!ctx) throw new Error("useSky must be used within <SkyProvider>");
  return ctx;
}
