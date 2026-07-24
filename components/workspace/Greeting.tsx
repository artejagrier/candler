"use client";

import { useSky } from "@/components/providers/SkyProvider";
import type { SkyPeriod } from "@/lib/utilities/time";

const SALUTATION: Record<SkyPeriod, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Good evening",
};

/**
 * Time-aware greeting for the dashboard. Reads the same sky period that drives
 * the background, so the words match the light outside. Name is mock prototype
 * data for now; it will come from the authenticated session later.
 */
export function Greeting({ name }: { name: string }) {
  const { period } = useSky();

  return (
    <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
      {SALUTATION[period]}, {name}.
    </h1>
  );
}
