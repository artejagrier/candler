/**
 * Signature lava moment — neon green liquid, pure CSS animation.
 * The goo SVG filter lives here since this is its sole consumer.
 * Two sparse symbols drift through the liquid; meant to be discovered,
 * not immediately read.
 */
export function LavaLamp() {
  return (
    <div className="lq-lava" aria-hidden>
      {/* Goo filter — referenced by lq-lava-field below */}
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

      {/* Three green blobs through the goo filter */}
      <div className="lq-lava-field">
        <div className="lq-lava-blob lq-lava-blob--1" />
        <div className="lq-lava-blob lq-lava-blob--2" />
        <div className="lq-lava-blob lq-lava-blob--3" />
      </div>

      {/* Two sparse symbols — discovered in the liquid, not a code wall */}
      <div className="lq-lava-stream">
        <span
          className="lq-lava-token"
          style={
            {
              left: "28%",
              top: "50%",
              "--dur": "12s",
              "--delay": "0s",
            } as React.CSSProperties
          }
        >
          01010101
        </span>
        <span
          className="lq-lava-token"
          style={
            {
              left: "65%",
              top: "50%",
              "--dur": "9s",
              "--delay": "4.5s",
            } as React.CSSProperties
          }
        >
          ✓
        </span>
      </div>

      {/* Caption */}
      <div className="lq-lava-caption">
        <span className="lq-lava-caption-text">data in motion</span>
      </div>
    </div>
  );
}
