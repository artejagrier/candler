import type { Metadata } from "next";
import { Compass, Heart, Lock, Sparkles } from "lucide-react";

import { CtaSection } from "@/components/marketing/CtaSection";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { Surface } from "@/components/ui/Surface";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Candler exists: a calm, secure home for every software project — bridging your stack instead of replacing it.",
};

const VALUES = [
  {
    title: "Bridge, don't replace",
    description:
      "Your tools are good. Candler connects them and gives them a shared home, rather than asking you to abandon what works.",
    icon: Compass,
  },
  {
    title: "Honest security",
    description:
      "Real authentication, real session handling, no theater. We never ship fake encryption or pretend a placeholder is protection.",
    icon: Lock,
  },
  {
    title: "Calm by design",
    description:
      "A dynamic sky, a floating dock, and a command palette — an interface that feels alive without getting in your way.",
    icon: Sparkles,
  },
  {
    title: "For builders",
    description:
      "Made by a developer who was tired of hunting across a dozen dashboards to answer one simple question about a project.",
    icon: Heart,
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-20 px-4 py-16 sm:px-6">
      <header className="flex flex-col items-center pt-8 text-center">
        <SectionHeading
          eyebrow="About"
          title="A home for every software project"
          description={SITE.pitch}
        />
      </header>

      <section className="prose-none flex flex-col gap-5 text-lg leading-relaxed text-mist">
        <p>
          Every project you build has the same sprawl: a repo here, a deploy
          there, secrets in a fourth tab, a domain in a fifth, and the one
          command you always forget somewhere in your shell history.{" "}
          {SITE.name} exists to end the tab-hunting.
        </p>
        <p>
          Instead of replacing GitHub, Vercel, Supabase, Stripe, or Cloudflare,{" "}
          {SITE.name} sits above them — organizing each project&apos;s services,
          environments, and documentation into one secure workspace, and linking
          out to the tools you already trust.
        </p>
      </section>

      <section aria-labelledby="values-heading">
        <SectionHeading
          title={<span id="values-heading">What we believe</span>}
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => {
            const Icon = value.icon;
            return (
              <Surface key={value.title} className="flex flex-col gap-3 p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-purple/15 text-lavender ring-1 ring-line-strong">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold text-white">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-fog">
                  {value.description}
                </p>
              </Surface>
            );
          })}
        </div>
      </section>

      <CtaSection />
    </div>
  );
}
