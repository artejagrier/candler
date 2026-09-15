/**
 * Authenticator TOTP preview — masked code rows with countdown timers.
 * The active row (GitHub) shows slightly revealed codes to convey the real UI.
 */
const CODES = [
  { name: "GitHub", timer: "18s", active: true },
  { name: "Vercel", timer: "24s", active: false },
  { name: "Supabase", timer: "46s", active: false },
  { name: "Stripe", timer: "8s", active: false },
];

export function AuthPreview() {
  return (
    <div
      className="mk-card"
      role="img"
      aria-label="Candler Authenticator example"
    >
      <div className="mk-card-titlebar">
        <span className="mk-card-title">Authenticator</span>
        <span className="mk-card-badge mk-card-badge--green">
          <span className="mk-card-dot" />
          4 accounts
        </span>
      </div>

      {CODES.map((c) => (
        <div
          key={c.name}
          className={`mk-auth-row${c.active ? " mk-auth-row--active" : ""}`}
        >
          <span className="mk-auth-name">{c.name}</span>
          <span className="mk-auth-code">
            ●●●<span className="mk-auth-sep">&nbsp;</span>●●●
          </span>
          <span className="mk-auth-timer">{c.timer}</span>
        </div>
      ))}

      <div className="mk-auth-footer">
        Secured inside your encrypted workspace
      </div>
    </div>
  );
}
