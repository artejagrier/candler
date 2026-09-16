/**
 * Time-of-day helpers for greeting copy on the dashboard.
 *
 * These ranges do not drive workspace appearance.
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

/** Map an hour (0–23) to a greeting period. */
export function periodForHour(hour: number): SkyPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

/**
 * Current period for a given date (defaults to now). Used for greeting copy only.
 *
 * A `timeZone` (IANA name, e.g. "Africa/Nairobi") can be supplied; when omitted
 * we use the runtime's local time. We resolve the hour through
 * `Intl.DateTimeFormat` so a timezone override is respected without a date library.
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

