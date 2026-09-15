/**
 * SVG infrastructure visualization. Shows how services feed into Candler
 * and arrive at PROTECTED. Animated dashed lines give a "data flowing" feel.
 * Pure CSS animation on stroke-dashoffset.
 */
export function InfraViz() {
  return (
    <section className="lq-infra" id="vault">
      <div className="lq-infra-head">
        <span className="lq-infra-eyebrow">One guardian</span>
        <h2 className="lq-infra-title">Your entire stack, unified.</h2>
      </div>

      <svg
        className="lq-infra-svg"
        viewBox="0 0 440 360"
        fill="none"
        role="img"
        aria-label="Diagram: GitHub, Vault, Cloud, and Authenticator feed into Candler, which reaches Protected state"
      >
        {/* ─────── Lines from services → Candler ─────── */}
        {/* GitHub → Candler */}
        <line x1="80" y1="64" x2="200" y2="158" stroke="#7cff4f" strokeWidth="1" className="lq-infra-line" strokeOpacity="0.45" />
        {/* Vault → Candler */}
        <line x1="80" y1="176" x2="185" y2="176" stroke="#7cff4f" strokeWidth="1" className="lq-infra-line" strokeOpacity="0.45" />
        {/* Cloud → Candler */}
        <line x1="360" y1="176" x2="260" y2="176" stroke="#7cff4f" strokeWidth="1" className="lq-infra-line lq-infra-line--rev" strokeOpacity="0.45" />
        {/* Agent → Candler */}
        <line x1="360" y1="64" x2="248" y2="158" stroke="#7cff4f" strokeWidth="1" className="lq-infra-line" strokeOpacity="0.45" />
        {/* Auth → Candler */}
        <line x1="220" y1="72" x2="220" y2="148" stroke="#7cff4f" strokeWidth="1" className="lq-infra-line lq-infra-line--rev" strokeOpacity="0.45" />
        {/* Candler → Protected */}
        <line x1="220" y1="204" x2="220" y2="290" stroke="#7cff4f" strokeWidth="1.5" className="lq-infra-line" strokeOpacity="0.6" />

        {/* ─────── Service nodes ─────── */}
        {/* GitHub */}
        <circle cx="80" cy="64" r="22" fill="#8B1E4A" stroke="#C84B7A" strokeWidth="1" fillOpacity="0.8" />
        <text x="80" y="69" textAnchor="middle" fill="#f7f7f8" fontSize="9" fontFamily="monospace" fontWeight="600">GH</text>
        <text x="80" y="100" textAnchor="middle" fill="#a2a2ae" fontSize="9" fontFamily="monospace">GitHub</text>

        {/* Vault */}
        <circle cx="80" cy="176" r="22" fill="#8B1E4A" stroke="#C84B7A" strokeWidth="1" fillOpacity="0.8" />
        <text x="80" y="181" textAnchor="middle" fill="#f7f7f8" fontSize="9" fontFamily="monospace" fontWeight="600">VT</text>
        <text x="80" y="212" textAnchor="middle" fill="#a2a2ae" fontSize="9" fontFamily="monospace">Vault</text>

        {/* Auth */}
        <circle cx="220" cy="52" r="22" fill="#8B1E4A" stroke="#C84B7A" strokeWidth="1" fillOpacity="0.8" />
        <text x="220" y="57" textAnchor="middle" fill="#f7f7f8" fontSize="9" fontFamily="monospace" fontWeight="600">2FA</text>
        <text x="220" y="88" textAnchor="middle" fill="#a2a2ae" fontSize="9" fontFamily="monospace">Auth</text>

        {/* Cloud */}
        <circle cx="360" cy="176" r="22" fill="#8B1E4A" stroke="#C84B7A" strokeWidth="1" fillOpacity="0.8" />
        <text x="360" y="181" textAnchor="middle" fill="#f7f7f8" fontSize="9" fontFamily="monospace" fontWeight="600">CL</text>
        <text x="360" y="212" textAnchor="middle" fill="#a2a2ae" fontSize="9" fontFamily="monospace">Cloud</text>

        {/* Agent */}
        <circle cx="360" cy="64" r="22" fill="#8B1E4A" stroke="#C84B7A" strokeWidth="1" fillOpacity="0.8" />
        <text x="360" y="69" textAnchor="middle" fill="#f7f7f8" fontSize="9" fontFamily="monospace" fontWeight="600">AI</text>
        <text x="360" y="100" textAnchor="middle" fill="#a2a2ae" fontSize="9" fontFamily="monospace">Agent</text>

        {/* ─────── Candler (center) ─────── */}
        <circle cx="220" cy="176" r="34" fill="#54102A" stroke="#C84B7A" strokeWidth="1.5" fillOpacity="0.95" />
        <circle cx="220" cy="176" r="38" fill="none" stroke="#C84B7A" strokeWidth="0.5" strokeOpacity="0.25" />
        <text x="220" y="172" textAnchor="middle" fill="#f7f7f8" fontSize="10" fontFamily="monospace" fontWeight="700">CANDLER</text>
        <text x="220" y="184" textAnchor="middle" fill="#C84B7A" fontSize="7" fontFamily="monospace">GUARDIAN</text>

        {/* ─────── Protected state ─────── */}
        <rect x="168" y="290" width="104" height="36" rx="18" fill="none" stroke="#7cff4f" strokeWidth="1" fillOpacity="0" />
        <rect x="168" y="290" width="104" height="36" rx="18" fill="#7cff4f" fillOpacity="0.07" />
        <circle cx="188" cy="308" r="3.5" fill="#7cff4f" />
        <text x="204" y="313" fill="#7cff4f" fontSize="9.5" fontFamily="monospace" fontWeight="700">PROTECTED</text>
      </svg>
    </section>
  );
}
