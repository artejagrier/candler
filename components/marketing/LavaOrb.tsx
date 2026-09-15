/**
 * Small signature brand moment: neon-green liquid orb.
 * Positioned as a decorative background element behind the CTA strip.
 * The goo filter lives here; no other component uses it.
 */
export function LavaOrb({
  size = "28rem",
  right = "-6%",
  top = "50%",
}: {
  size?: string;
  right?: string;
  top?: string;
}) {
  return (
    <>
      {/* Hidden SVG — defines the goo filter */}
      <svg
        aria-hidden
        focusable="false"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          <filter
            id="mk-goo"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Orb */}
      <div
        className="mk-orb"
        style={{
          width: size,
          height: size,
          right,
          top,
          transform: "translateY(-50%)",
        }}
        aria-hidden
      >
        <div className="mk-orb-field">
          <div
            className="mk-orb-blob mk-orb-blob--1"
            style={{ width: "65%", height: "65%", left: "15%", top: "5%" }}
          />
          <div
            className="mk-orb-blob mk-orb-blob--2"
            style={{ width: "50%", height: "55%", left: "30%", top: "28%" }}
          />
          <div
            className="mk-orb-blob mk-orb-blob--3"
            style={{ width: "40%", height: "50%", right: "12%", top: "18%" }}
          />
        </div>
      </div>
    </>
  );
}
