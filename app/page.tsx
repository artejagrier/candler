import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { SITE } from "@/config/site";
import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { FoundationPreview } from "@/components/marketing/FoundationPreview";

/**
 * Phase 1A foundation landing.
 *
 * A branded hero over the dynamic sky plus an interactive tour of the design
 * system. The full marketing landing (messaging, sections, responsive nav)
 * replaces this in Phase 1B; the workspace lives at /dashboard.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-10 sm:px-8 sm:py-16">
      {/* Wordmark */}
      <div className="flex items-center gap-2.5 animate-rise">
        <span className="flex size-8 items-center justify-center rounded-lg bg-purple shadow-glow-sm">
          <ShieldCheck className="size-5 text-white" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-white">
          {SITE.name}
          <span className="text-lavender">.dev</span>
        </span>
      </div>

      {/* Hero */}
      <section className="animate-rise flex flex-1 flex-col justify-center py-16 sm:py-24">
        <Badge tone="purple">{SITE.tagline}</Badge>
        <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
          Your entire development stack.
          <br />
          <span className="text-glow bg-gradient-to-r from-lavender via-purple-bright to-purple bg-clip-text text-transparent">
            Connected, organized, and secure.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-mist">
          {SITE.description}
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className={buttonClassName({ size: "lg", className: "group" })}
          >
            Create your workspace
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="/dashboard"
            className={buttonClassName({ variant: "outline", size: "lg" })}
          >
            Explore Candler
          </Link>
        </div>

        <p className="mt-6 text-sm text-fog">
          Candler bridges GitHub, Vercel, Supabase, Stripe, and Cloudflare — it
          doesn&apos;t replace them.
        </p>
      </section>

      {/* Design-system preview */}
      <section aria-label="Design system preview" className="pb-8">
        <FoundationPreview />
      </section>

      <footer className="border-t border-line pt-6 text-sm text-slate-muted">
        {SITE.name} · Phase 1A foundation build · The dynamic sky follows your
        local time.
      </footer>
    </main>
  );
}
