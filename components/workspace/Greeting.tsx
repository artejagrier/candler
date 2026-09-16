import { currentPeriod, type SkyPeriod } from "@/lib/utilities/time";

const SALUTATION: Record<SkyPeriod, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good evening",
};

/**
 * Time-aware greeting for the dashboard. Uses the clock for copy only —
 * it does not drive workspace appearance.
 */
export function Greeting({ name }: { name: string }) {
  const period = currentPeriod();

  return (
    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
      {SALUTATION[period]}, {name}.
    </h1>
  );
}
