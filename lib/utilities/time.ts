/**
 * Time-of-day helpers for the dynamic Candler sky.
 *
 * The period drives the atmospheric background. Ranges follow the product spec:
 *   morning    05:00–11:59
 *   afternoon  12:00–16:59
 *   evening    17:00–19:59
 *   night      20:00–04:59
 */

export type SkyPeriod = "morning" | "afternoon" | "evening" | "night";

export const SKY_PERIODS: readonly SkyPeriod[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
] as const;

/** Human-friendly label for a period (used in the dev preview + settings). */
export const SKY_PERIOD_LABELS: Record<SkyPeriod, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

/** Map an hour (0–23) to a sky period. */
export function periodForHour(hour: number): SkyPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

/**
 * Current period for a given date (defaults to now).
 *
 * A `timeZone` (IANA name, e.g. "Africa/Nairobi") can be supplied to honour a
 * saved preference; when omitted we use the runtime's local time. We resolve the
 * hour through `Intl.DateTimeFormat` so the timezone override is respected
 * without pulling in a date library.
 */
export function currentPeriod(date: Date = new Date(), timeZone?: string): SkyPeriod {
  let hour = date.getHours();

  if (timeZone) {
    try {
      const formatted = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone,
      }).format(date);
      const parsed = Number.parseInt(formatted, 10);
      if (!Number.isNaN(parsed)) hour = parsed % 24;
    } catch {
      // Invalid timeZone string — fall back to local hour.
    }
  }

  return periodForHour(hour);
}

/**
 * Milliseconds until the next period boundary, so the sky can re-evaluate at
 * exactly the right moment instead of polling on a tight interval.
 */
export function msUntilNextPeriod(date: Date = new Date()): number {
  const boundaries = [5, 12, 17, 20]; // period start hours
  const hour = date.getHours();
  const nextHour = boundaries.find((b) => b > hour) ?? 24 + boundaries[0];

  const next = new Date(date);
  next.setHours(nextHour, 0, 0, 0);
  return Math.max(1000, next.getTime() - date.getTime());
}
