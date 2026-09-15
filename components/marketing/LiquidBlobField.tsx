/**
 * Hero background: SVG goo filter + animated blobs.
 * Blob 1–3: burgundy (Candler identity backdrop).
 * Blob green: subtle neon-green entry from lower-right (Candler protection energy).
 * Pure CSS animations — no JS.
 */
export function LiquidBlobField() {
  return (
    <>
      {/* Hidden SVG — defines the goo filter referenced by .lq-blobs */}
      <svg
        aria-hidden
        focusable="false"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          <filter
            id="lq-goo"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="lq-blobs" aria-hidden>
        {/* Burgundy backdrop — Candler identity */}
        <div className="lq-blob lq-blob--1" />
        <div className="lq-blob lq-blob--2" />
        <div className="lq-blob lq-blob--3" />
        {/* Neon green — protection energy entering from lower-right */}
        <div className="lq-blob lq-blob--green" />
      </div>
    </>
  );
}
