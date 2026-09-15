/**
 * Hero product diagram: 4 stack inputs → CANDLER → 4 outputs.
 * Thin animated dashed lines, neon green connections, burgundy identity node.
 * Pure SVG — no JS.
 */
export function StackDiagram() {
  const inputs = [
    { label: "GitHub", cx: 60 },
    { label: "Vercel", cx: 180 },
    { label: "Supabase", cx: 300 },
    { label: "Stripe", cx: 420 },
  ];
  const outputs = [
    { label: "WATCH", cx: 60 },
    { label: "PROTECT", cx: 180 },
    { label: "EXPLAIN", cx: 300 },
    { label: "RESTORE", cx: 420 },
  ];
  const candlerCX = 240;
  const candlerY = 130;
  const candlerH = 36;
  const inputLineY = 50;
  const outputLineY = 190;

  return (
    <div className="mk-stack-diagram" aria-hidden>
      <svg
        viewBox="0 0 480 255"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mk-stack-svg"
      >
        {/* Input → Candler lines */}
        {inputs.map((n) => (
          <line
            key={`in-${n.label}`}
            x1={n.cx}
            y1={inputLineY}
            x2={candlerCX}
            y2={candlerY}
            stroke="rgba(183,255,42,0.38)"
            strokeWidth="1"
            className="mk-stack-line"
          />
        ))}

        {/* Candler → Output lines */}
        {outputs.map((n) => (
          <line
            key={`out-${n.label}`}
            x1={candlerCX}
            y1={candlerY + candlerH}
            x2={n.cx}
            y2={outputLineY}
            stroke="rgba(183,255,42,0.28)"
            strokeWidth="1"
            className="mk-stack-line mk-stack-line--rev"
          />
        ))}

        {/* Input nodes */}
        {inputs.map((n) => (
          <g key={n.label}>
            <rect
              x={n.cx - 36}
              y={21}
              width={72}
              height={28}
              rx={6}
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.13)"
            />
            <text
              x={n.cx}
              y={38}
              textAnchor="middle"
              fill="rgba(255,255,255,0.52)"
              fontSize="9.5"
              fontFamily="var(--font-mono)"
              fontWeight="600"
              letterSpacing="0.04em"
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* Connection dot at Candler top */}
        <circle cx={candlerCX} cy={candlerY} r={3} fill="rgba(183,255,42,0.55)" />

        {/* CANDLER identity node */}
        <rect
          x={candlerCX - 100}
          y={candlerY}
          width={200}
          height={candlerH}
          rx={8}
          fill="rgba(139,30,74,0.22)"
          stroke="rgba(194,24,91,0.42)"
        />
        {/* Subtle inner glow */}
        <rect
          x={candlerCX - 100}
          y={candlerY}
          width={200}
          height={1}
          rx={0}
          fill="rgba(194,24,91,0.35)"
        />
        <text
          x={candlerCX}
          y={candlerY + candlerH / 2 + 4}
          textAnchor="middle"
          fill="#f5f5f5"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fontWeight="700"
          letterSpacing="0.22em"
        >
          CANDLER
        </text>

        {/* Connection dot at Candler bottom */}
        <circle
          cx={candlerCX}
          cy={candlerY + candlerH}
          r={3}
          fill="rgba(183,255,42,0.45)"
        />

        {/* Output labels */}
        {outputs.map((n) => (
          <g key={n.label}>
            <text
              x={n.cx}
              y={outputLineY + 18}
              textAnchor="middle"
              fill="rgba(183,255,42,0.55)"
              fontSize="8.5"
              fontFamily="var(--font-mono)"
              fontWeight="600"
              letterSpacing="0.14em"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
