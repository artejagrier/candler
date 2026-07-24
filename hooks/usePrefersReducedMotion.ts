"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Whether the user prefers reduced motion. SSR-safe via `useSyncExternalStore`
 * (returns `false` on the server and first paint, then the real value). Gate
 * non-essential JS-driven animation on this. (CSS animations are already gated
 * via the `prefers-reduced-motion` media query in globals.css.)
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
