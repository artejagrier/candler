/**
 * The Candler shield mark as raw SVG, shared by the generated app icons and
 * Open Graph images (which render via `next/og`). Kept dependency-free so it
 * works inside the ImageResponse runtime.
 */
export function shieldSvg(stroke: string = "#ffffff", check: string = "#7cff4f"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="${stroke}" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path stroke="${check}" d="m9 12 2 2 4-4"/></svg>`;
}

/** The shield mark as a data URI, usable as an <img src> inside ImageResponse. */
export function shieldDataUri(stroke: string = "#ffffff", check: string = "#7cff4f"): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(shieldSvg(stroke, check))}`;
}

/**
 * Brand palette constants for image generation. Mirrors the app tokens in
 * globals.css: Electric Purple (intelligence) + Neon Green (action/protection).
 */
export const BRAND = {
  purple: "#8b5cf6",
  purpleBright: "#a855f7",
  purpleDeep: "#4c1d95",
  lavender: "#c4b5fd",
  green: "#7cff4f",
  greenBright: "#b7ff2a",
  ink: "#070709",
  white: "#ffffff",
} as const;
