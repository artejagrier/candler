"use client";

import { ArrowRight, Command } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { ModShortcut } from "@/components/ui/ModShortcut";
import { Surface } from "@/components/ui/Surface";
import { INTEGRATIONS } from "@/config/marketing";
import { SITE } from "@/config/site";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export function Hero() {
  return (
    <section className="flex flex-col items-center pt-16 text-center sm:pt-24">
      <Badge tone="purple">{SITE.tagline}</Badge>

      <h1 className="animate-rise mt-6 max-w-4xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl">
        Your entire development stack.{" "}
        <span className="text-glow bg-gradient-to-r from-lavender via-purple-bright to-purple bg-clip-text text-transparent">
          Connected, organized, and secure.
        </span>
      </h1>

      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-mist">
        {SITE.pitch}
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link
          href={AUTH_ROUTES.signUp}
          className={buttonClassName({ size: "lg", className: "group" })}
        >
          Create your workspace
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/features"
          className={buttonClassName({ variant: "outline", size: "lg" })}
        >
          Explore features
        </Link>
      </div>

      <p className="mt-6 text-sm text-fog">
        Free for solo developers · No credit card required
      </p>

      {/* Product glimpse */}
      <Surface
        glow
        className="animate-rise mt-16 w-full max-w-3xl overflow-hidden p-2"
      >
        <div className="rounded-2xl bg-ink/40 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 rounded-full border border-line bg-white/5 px-4 py-2.5 text-left">
            <span className="flex items-center gap-2 text-sm text-fog">
              <Command className="size-4" aria-hidden="true" />
              Search projects, secrets, and services…
            </span>
            <span className="hidden items-center gap-1 sm:flex">
              <ModShortcut className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] px-1.5 font-mono text-[11px] font-medium text-fog" />
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {INTEGRATIONS.slice(0, 6).map((integration) => (
              <div
                key={integration.name}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5"
              >
                <span
                  aria-hidden="true"
                  className="flex size-7 items-center justify-center rounded-lg bg-white/5 text-xs font-semibold"
                  style={{ color: integration.accent }}
                >
                  {integration.initial}
                </span>
                <span className="text-sm font-medium text-mist">
                  {integration.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Surface>
    </section>
  );
}
