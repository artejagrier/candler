/**
 * Live-feeling stack activity for the dark half of the split section.
 * Illustrative of Candler’s watch surface — not customer telemetry.
 */
const EVENTS = [
  {
    tone: "ok",
    title: "Production deploy",
    detail: "Vercel · candler-dev · main",
  },
  {
    tone: "warn",
    title: "Environment mismatch",
    detail: "Staging database URL on production",
  },
  {
    tone: "alert",
    title: "Authentication warning",
    detail: "OAuth callback host does not match site URL",
  },
  {
    tone: "ok",
    title: "Supabase migration applied",
    detail: "legal_consents · schema ready",
  },
  {
    tone: "alert",
    title: "Exposed configuration",
    detail: "Public env var used where a secret belongs",
  },
  {
    tone: "warn",
    title: "Preview build failing",
    detail: "Typecheck · 1 error on last push",
  },
] as const;

export function StackPulse() {
  return (
    <ol className="mk-pulse" aria-label="Example stack activity Candler watches">
      {EVENTS.map((event, index) => (
        <li
          key={event.title}
          className={`mk-pulse-row mk-pulse-row--${event.tone}`}
          style={{ "--pulse-delay": `${index * 140}ms` } as React.CSSProperties}
        >
          <span className="mk-pulse-dot" aria-hidden />
          <span>
            <span className="mk-pulse-title">{event.title}</span>
            <span className="mk-pulse-detail">{event.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
