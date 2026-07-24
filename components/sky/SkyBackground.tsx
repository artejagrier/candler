"use client";

import { useSky } from "@/components/providers/SkyProvider";

/**
 * The atmospheric Candler background. Purely decorative (aria-hidden) and
 * non-interactive; all styling + motion (and reduced-motion handling) lives in
 * globals.css under `.sky`. Layers are always mounted; the active period is
 * driven by the `data-period` attribute so transitions are pure CSS.
 */
export function SkyBackground() {
  const { period } = useSky();

  return (
    <div className="sky" data-period={period} aria-hidden="true">
      <div className="sky__clouds" />
      <div className="sky__stars" />
      <div className="sky__shooting" />
    </div>
  );
}
