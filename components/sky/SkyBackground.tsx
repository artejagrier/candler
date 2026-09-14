"use client";

import { useSky } from "@/components/providers/SkyProvider";

/**
 * The atmospheric Candler background. Purely decorative (aria-hidden) and
 * non-interactive; all styling + motion (and reduced-motion handling) lives in
 * globals.css under `.sky`.
 *
 * Layers are mounted only while an environment mode is explicitly selected or
 * previewed. Color modes render no sky, clouds, stars, or flying star.
 */
export function SkyBackground() {
  const { period, isActive } = useSky();

  if (!isActive || !period) return null;

  return (
    <div className="sky" data-period={period} aria-hidden="true">
      <div className="sky__clouds" />
      <div className="sky__stars" />
      <div className="sky__shooting" />
    </div>
  );
}
