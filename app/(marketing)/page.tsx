import Link from "next/link";
import {
  ArrowRight,
  CloudUpload,
  KeyRound,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { AgentStory } from "@/components/marketing/AgentStory";
import { AuthPreview } from "@/components/marketing/AuthPreview";
import { CloudViz } from "@/components/marketing/CloudViz";
import { HeroWorkspace } from "@/components/marketing/HeroWorkspace";
import { KineticHeadline } from "@/components/marketing/KineticHeadline";
import { MagneticButton } from "@/components/marketing/MagneticButton";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { StackPulse } from "@/components/marketing/StackPulse";
import { VaultPreview } from "@/components/marketing/VaultPreview";
import { WorkflowRail } from "@/components/marketing/WorkflowRail";
import { INTEGRATIONS, PRICING_TIERS } from "@/config/marketing";
import { AUTH_ROUTES } from "@/lib/auth/routes";

const TRUST_ITEMS = [
  {
    icon: Lock,
    title: "Encrypted secrets",
    body: "Vault values are encrypted at rest. Raw secret text never leaves the server without step-up authentication.",
  },
  {
    icon: Server,
    title: "Private cloud storage",
    body: "Your backups live in isolated R2 storage. No data co-mingling across workspaces.",
  },
  {
    icon: ShieldCheck,
    title: "Step-up authentication",
    body: "Every secret reveal and high-sensitivity action requires fresh confirmation — even in an active session.",
  },
  {
    icon: UserCheck,
    title: "Access isolation",
    body: "Row-level security at every database layer. A compromised token cannot cross workspace boundaries.",
  },
  {
    icon: Sparkles,
    title: "No secrets in AI context",
    body: "Candler Agent reads metadata and health signals only. Secret values are never included in model context.",
  },
  {
    icon: KeyRound,
    title: "Audited actions",
    body: "Every vault access, backup, and recovery is timestamped. You know exactly what changed and when.",
  },
];

const STACK_NAMES = INTEGRATIONS.map((item) => item.name);

export default function LandingPage() {
  return (
    <div className="mk-page">
      <section className="mk-hero">
        <div className="mk-hero-ambient" aria-hidden />
        <div className="mk-hero-stage">
          <div className="mk-hero-copy">
            <span className="lq-hero-eyebrow">Candler</span>
            <KineticHeadline />
            <p className="mk-hero-sub">
              Candler connects to your development stack, watches what
              changes, protects critical assets, and helps you understand and
              fix problems — from one place.
            </p>
            <div className="mk-hero-actions">
              <MagneticButton href={AUTH_ROUTES.signUp} variant="primary">
                Get Started <ArrowRight aria-hidden="true" />
              </MagneticButton>
              <MagneticButton href="/features" variant="ghost">
                Explore Candler
              </MagneticButton>
            </div>
          </div>
          <div className="mk-hero-visual">
            <HeroWorkspace />
          </div>
        </div>
        <div className="mk-strip">
          <div className="mk-strip-inner">
            <span className="mk-strip-label">Connects with</span>
            <div className="mk-strip-logos">
              {STACK_NAMES.map((name) => (
                <span key={name} className="mk-strip-item">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mk-dark mk-proof" aria-labelledby="proof-heading">
        <div className="mk-inner mk-inner--compact">
          <ScrollReveal>
            <p className="mk-proof-kicker">Early access</p>
            <h2 id="proof-heading" className="mk-proof-title">
              Built with developers. Built for what happens next.
            </h2>
            <p className="mk-proof-body">
              Candler is being built and tested with an early developer
              community. The stack you already use — GitHub, Vercel, Supabase,
              Stripe, Cloudflare — is the starting point, not a replacement.
            </p>
            <div className="mk-proof-logos" aria-label="Connected stack">
              {STACK_NAMES.map((name) => (
                <span key={name} className="mk-proof-logo">
                  {name}
                </span>
              ))}
            </div>
            <figure className="mk-proof-quote">
              <blockquote>
                Developer stories from early access will live here. We do not
                invent customers, logos, or usage numbers.
              </blockquote>
            </figure>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-split" aria-labelledby="chaos-heading ship-heading">
        <div className="mk-split-dark">
          <ScrollReveal>
            <span className="mk-eyebrow">Watching</span>
            <h2 id="chaos-heading" className="mk-headline mk-headline--xl">
              Fighting codebase chaos with{" "}
              <span className="lq-gradient-word--anim">AI.</span>
            </h2>
            <p className="mk-body">
              From a deploy that just shipped to a migration, an auth warning,
              or an environment that no longer matches — Candler watches the
              stack so the signal is in one place before you touch production.
            </p>
            <StackPulse />
          </ScrollReveal>
        </div>
        <div className="mk-split-green">
          <ScrollReveal>
            <span className="mk-eyebrow mk-eyebrow--on-green">Ship</span>
            <h2 id="ship-heading" className="mk-split-green-title">
              Ship with Candler.
            </h2>
            <p>
              Candler watches what changed, catches the problems that usually
              hide across dashboards, helps diagnose the likely cause, and
              guides you toward a fix — while you stay in control of every
              sensitive action.
            </p>
            <ul className="mk-split-points">
              <li>Watches deploys, environments, and configuration drift</li>
              <li>Catches mismatches before they become an incident</li>
              <li>Diagnoses in context — not a wall of logs</li>
              <li>Guides the fix. You approve the move.</li>
            </ul>
            <MagneticButton href={AUTH_ROUTES.signUp} variant="inverse">
              Get Started <ArrowRight aria-hidden="true" />
            </MagneticButton>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-dark" id="agent">
        <div className="mk-inner">
          <ScrollReveal>
            <span className="mk-eyebrow mk-eyebrow--burg">Agent</span>
            <h2 className="mk-headline">
              Something changed.
              <br />
              Candler already has the thread.
            </h2>
            <p className="mk-body">
              Agent correlates metadata across your projects and environments,
              names the likely cause, and proposes a fix. Secret values never
              enter model context. You remain the one who acts.
            </p>
            <AgentStory />
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-dark mk-workflow" aria-labelledby="workflow-heading">
        <div className="mk-inner">
          <ScrollReveal>
            <span className="mk-eyebrow">Workflow</span>
            <h2 id="workflow-heading" className="mk-headline">
              Connect. Watch. Collaborate. Diagnose. Fix. Focus.
            </h2>
            <p className="mk-body">
              One motion through the stack — not a pile of disconnected
              features.
            </p>
            <WorkflowRail />
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-dark" id="vault">
        <div className="mk-inner">
          <ScrollReveal>
            <div className="mk-row mk-row--flip">
              <div className="mk-row-copy">
                <span className="mk-eyebrow">Vault</span>
                <h2 className="mk-headline">
                  Every secret, encrypted.
                  <br />
                  Available when you need it.
                </h2>
                <p className="mk-body">
                  Organize API keys, tokens, and environment variables across
                  every project and environment. Step-up authentication
                  protects every reveal. Candler never stores plaintext values
                  or exposes them to the agent.
                </p>
                <Link href="/#vault" className="mk-section-link">
                  Explore Vault <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <div className="mk-row-visual">
                <VaultPreview />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-green" id="cloud">
        <div className="mk-inner">
          <ScrollReveal>
            <div className="mk-row">
              <div className="mk-row-copy">
                <span className="mk-eyebrow mk-eyebrow--on-green">Cloud</span>
                <h2 className="mk-headline">
                  Your projects don&apos;t disappear
                  <br />
                  with your laptop.
                </h2>
                <p className="mk-body">
                  Back up a project to Candler Cloud. Delete the local copy
                  if you want. Restore it to any device in seconds — intact,
                  verified, and ready to open.
                </p>
                <p className="mk-green-note">
                  <CloudUpload aria-hidden="true" />
                  50 GB included in Candler Pro
                </p>
              </div>
              <div className="mk-row-visual">
                <CloudViz />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-dark" id="auth">
        <div className="mk-inner">
          <ScrollReveal>
            <div className="mk-row mk-row--flip">
              <div className="mk-row-copy">
                <span className="mk-eyebrow">Authenticator</span>
                <h2 className="mk-headline">
                  Verification codes in
                  <br />
                  your secure workspace.
                </h2>
                <p className="mk-body">
                  TOTP codes for every service — secured inside your
                  encrypted Candler workspace, not a separate app. Available
                  on any device you&apos;ve verified.
                </p>
                <p className="mk-body mk-body--tight">
                  Step-up authentication protects the authenticator itself.
                  Your codes stay yours.
                </p>
              </div>
              <div className="mk-row-visual">
                <AuthPreview />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-dark">
        <div className="mk-inner">
          <ScrollReveal>
            <span className="mk-eyebrow mk-eyebrow--burg">Security</span>
            <h2 className="mk-headline">Built for security from day one.</h2>
            <p className="mk-body">
              Candler handles secrets, backups, and authentication codes —
              the most sensitive parts of your development workflow. We take
              that seriously.
            </p>
            <div className="mk-trust-grid">
              {TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
                <div key={title}>
                  <Icon className="mk-trust-icon" aria-hidden="true" />
                  <p className="mk-trust-title">{title}</p>
                  <p className="mk-trust-body">{body}</p>
                </div>
              ))}
            </div>
            <div className="mk-trust-more">
              <Link href="/security" className="mk-section-link">
                Read the security overview{" "}
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-dark" id="pricing">
        <div className="mk-inner">
          <ScrollReveal>
            <span className="mk-eyebrow">Pricing</span>
            <h2 className="mk-headline">Simple, honest pricing.</h2>
            <p className="mk-body">
              One plan covers everything. Upgrade storage when you need more
              room. No seats, no per-feature gates.
            </p>
            <div className="mk-pricing-row">
              {PRICING_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className={`mk-tier ${tier.highlighted ? "mk-tier--featured" : "mk-tier--default"}`}
                >
                  <span className="mk-tier-name">{tier.name}</span>
                  <div>
                    <span className="mk-tier-price">{tier.price}</span>
                    {tier.cadence && (
                      <span className="mk-tier-cadence">{tier.cadence}</span>
                    )}
                  </div>
                  <p className="mk-tier-desc">{tier.description}</p>
                  <ul className="mk-tier-features">
                    {tier.features.map((feature) => (
                      <li key={feature} className="mk-tier-feature">
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {tier.highlighted ? (
                    <MagneticButton href={tier.href} variant="primary">
                      {tier.cta}
                    </MagneticButton>
                  ) : (
                    <Link href={tier.href} className="mk-tier-cta">
                      {tier.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="mk-cta-green">
        <div className="mk-cta-green-grid" aria-hidden />
        <div className="mk-inner mk-inner--compact">
          <ScrollReveal>
            <div className="mk-cta mk-cta--on-green">
              <h2>Build without losing control of your stack.</h2>
              <p>
                Candler brings the development stack together so you spend
                less time hunting through dashboards and more time building.
                Vault, Agent, Cloud, Authenticator, and Recovery — one
                workspace, you in control.
              </p>
              <div className="mk-cta-actions">
                <MagneticButton href={AUTH_ROUTES.signUp} variant="inverse">
                  Get Started <ArrowRight aria-hidden="true" />
                </MagneticButton>
                <MagneticButton href="/features" variant="ghostInverse">
                  Explore Candler
                </MagneticButton>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
