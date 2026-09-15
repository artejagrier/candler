const STEPS = [
  {
    title: "Connect",
    body: "Bring GitHub, Vercel, Supabase, Stripe, and Cloudflare into one workspace.",
  },
  {
    title: "Watch",
    body: "Candler tracks deploys, environment drift, and health signals as they happen.",
  },
  {
    title: "Collaborate",
    body: "Secrets, docs, and environments sit beside the project they belong to.",
  },
  {
    title: "Diagnose",
    body: "Agent correlates the stack and explains the likely cause in plain language.",
  },
  {
    title: "Fix",
    body: "Guided next steps — you approve every sensitive action.",
  },
  {
    title: "Focus",
    body: "Less dashboard-hopping. More time building.",
  },
] as const;

/**
 * One connected workflow, not six disconnected feature cards.
 */
export function WorkflowRail() {
  return (
    <ol className="mk-rail" aria-label="Candler workflow">
      {STEPS.map((step, index) => (
        <li key={step.title} className="mk-rail-step">
          <span className="mk-rail-node" aria-hidden>
            {index + 1}
          </span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}
