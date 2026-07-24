"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  currentPeriod,
  msUntilNextPeriod,
  type SkyPeriod,
} from "@/lib/utilities/time";

interface SkyContextValue {
  /** The period currently driving the background. */
  period: SkyPeriod;
  /** Whether the period is auto (from local time) or manually overridden. */
  isOverridden: boolean;
  /** Force a period (dev preview + future saved preference). Pass null to clear. */
  setOverride: (period: SkyPeriod | null) => void;
}

const SkyContext = createContext<SkyContextValue | null>(null);

/**
 * Provides the current time-of-day period to the app.
 *
 * SSR/first render uses a stable `"night"` default (dark, matches the app
 * chrome, so there's no bright flash) and switches to the real local period
 * after mount — this keeps hydration deterministic. It re-evaluates exactly at
 * the next period boundary rather than polling.
 *
 * A future settings screen can pass a saved IANA timezone; the plumbing lives
 * in `currentPeriod(date, timeZone)`.
 */
export function SkyProvider({ children }: { children: React.ReactNode }) {
  const [autoPeriod, setAutoPeriod] = useState<SkyPeriod>("night");
  const [override, setOverride] = useState<SkyPeriod | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      setAutoPeriod(currentPeriod());
      // Re-evaluate right when the next period begins.
      timer = setTimeout(tick, msUntilNextPeriod());
    };

    tick();
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo<SkyContextValue>(
    () => ({
      period: override ?? autoPeriod,
      isOverridden: override !== null,
      setOverride,
    }),
    [override, autoPeriod],
  );

  return <SkyContext.Provider value={value}>{children}</SkyContext.Provider>;
}

export function useSky(): SkyContextValue {
  const ctx = useContext(SkyContext);
  if (!ctx) throw new Error("useSky must be used within <SkyProvider>");
  return ctx;
}
