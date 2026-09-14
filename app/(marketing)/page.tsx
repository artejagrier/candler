import Link from "next/link";
import { ArrowRight, Eye, Brain, MessageSquareText, Wrench, ShieldCheck, Sparkles, Check } from "lucide-react";
import { AUTH_ROUTES } from "@/lib/auth/routes";

// The guardian narrative: problem → watches → understands → explains →
// recommends → protected. Purple carries intelligence, green carries protection.
const arc = [
  { tone: "intel", icon: Eye, title: "Candler watches", copy: "Every secret, environment, service, and backup sits under one guardian. Candler keeps a continuous, read-only view of your stack — nothing scattered, nothing forgotten." },
  { tone: "intel", icon: Brain, title: "Candler understands", copy: "It correlates metadata across projects and environments — spotting expiring credentials, missing counterparts, and drift, without ever touching a raw secret value." },
  { tone: "intel", icon: MessageSquareText, title: "Candler explains", copy: "Ask in plain language. Candler answers from your real configuration and health signals, so complex infrastructure becomes something you can actually read." },
  { tone: "protect", icon: Wrench, title: "Candler recommends", copy: "Clear, prioritized findings tell you what to rotate, back up, or fix first — with the exact project and environment in context." },
  { tone: "protect", icon: ShieldCheck, title: "Your work is protected", copy: "Encrypted secrets, verified backups, and step-up authentication on every reveal. When everything checks out, Candler simply shows you green." },
] as const;

export default function LandingPage() {
  return (
    <div className="reset-marketing">
      <section className="reset-hero">
        <p className="eyebrow">CANDLER</p>
        <h1>
          Your codebase
          <br />
          has a guardian.
        </h1>
        <p>
          Candler watches your secrets, environments, and backups — understands how they fit
          together, explains what it finds, and protects your work. One calm home for the things
          you can&apos;t afford to lose.
        </p>
        <div>
          <Link className="primary-button" href={AUTH_ROUTES.signUp}>
            Get Candler <ArrowRight />
          </Link>
          <Link className="secondary-button" href={AUTH_ROUTES.signIn}>
            Sign In
          </Link>
        </div>
        <span className="hero-security">
          <ShieldCheck />
          Encrypted by default. Raw secrets stay out of AI context.
        </span>
      </section>

      <section className="problem-statement">
        <p className="eyebrow">The problem</p>
        <h2>
          Secrets scattered across a dozen tools. Backups you meant to make.{" "}
          <span>Config that quietly drifts between environments — until something breaks.</span>
        </h2>
      </section>

      {/* Show Candler working — illustrative product glimpse in the real language. */}
      <section className="landing-glimpse" aria-label="A glimpse of Candler">
        <div className="glimpse-head">
          <span className="health-badge" data-state="protected">
            <span className="dot" aria-hidden="true" />
            Protected
          </span>
          <span className="hero-security" style={{ marginTop: 0 }}>
            <Check style={{ color: "var(--color-green)" }} />
            42 secrets verified · 0 issues
          </span>
        </div>
        <h3>
          Everything is <em>protected</em>.
        </h3>
        <p className="glimpse-sub">
          Candler checked your credentials, environments, and backups. Nothing needs your attention
          right now.
        </p>
        <div className="glimpse-agent">
          <Sparkles aria-hidden="true" />
          Candler analyzed 6 projects and correlated health across every environment — read-only, no
          secrets shared.
        </div>
      </section>

      <section className="guardian-arc">
        {arc.map(({ tone, icon: Icon, title, copy }, i) => (
          <article key={title} data-tone={tone}>
            <span className="step">0{i + 1}</span>
            <div>
              <h3>
                <Icon aria-hidden="true" />
                {title}
              </h3>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="pro-callout">
        <div>
          <p className="eyebrow">Candler Pro</p>
          <h2>Start protecting your stack.</h2>
          <p>Vault, Agent, Secret Health, Authenticator, Recovery, and 50 GB of verified Cloud backup.</p>
        </div>
        <div>
          <strong>
            $18<small>/month</small>
          </strong>
          <Link className="primary-button" href={AUTH_ROUTES.signUp}>
            Get Candler Pro <ArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
