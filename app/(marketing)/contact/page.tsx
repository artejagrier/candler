import type { Metadata } from "next";
import { Code2, Mail, MessageSquare } from "lucide-react";

import { ContactForm } from "@/components/marketing/ContactForm";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { Surface } from "@/components/ui/Surface";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Candler team — questions, feedback, or sales.",
};

const CHANNELS = [
  {
    title: "Email",
    value: `hello@${SITE.domain}`,
    href: `mailto:hello@${SITE.domain}`,
    icon: Mail,
  },
  {
    title: "GitHub",
    value: "Report an issue or request a feature",
    href: SITE.social.github,
    icon: Code2,
  },
  {
    title: "Sales",
    value: "Talk about Team & Enterprise",
    href: `mailto:sales@${SITE.domain}`,
    icon: MessageSquare,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <header className="flex flex-col items-center pt-8 text-center">
        <SectionHeading
          eyebrow="Contact"
          title="Get in touch"
          description="Questions, feedback, or just want to say hello? We'd love to hear from you."
        />
      </header>

      <div className="mt-16 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Surface glow className="p-6 sm:p-8">
          <ContactForm />
        </Surface>

        <div className="flex flex-col gap-3">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <a
                key={channel.title}
                href={channel.href}
                className="glass flex items-start gap-4 rounded-2xl p-5 transition-colors hover:border-line-strong"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple/15 text-lavender ring-1 ring-line-strong">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {channel.title}
                  </span>
                  <span className="mt-0.5 block text-sm text-fog">
                    {channel.value}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
