import type { Metadata } from "next";

import { Badge } from "@/components/ui/Badge";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Candler handles your information.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <Badge tone="warning">Placeholder — pending legal review</Badge>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-4 leading-relaxed text-fog">
        This is placeholder copy for the {SITE.name} Privacy Policy. A complete
        policy will replace it before any public launch.
      </p>

      <div className="mt-10 flex flex-col gap-6 text-mist">
        <section>
          <h2 className="text-lg font-semibold text-white">
            Information we handle
          </h2>
          <p className="mt-2 leading-relaxed text-fog">
            Authentication is provided by Supabase Auth. Your email and a secure
            password hash are stored by Supabase; {SITE.name} never stores your
            password in plain text and never fakes encryption.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">Connected services</h2>
          <p className="mt-2 leading-relaxed text-fog">
            When you link a provider like GitHub or Vercel, {SITE.name} stores
            only what&apos;s needed to display and organize that project&apos;s
            status. Server-only secrets are never exposed to the browser.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">Contact</h2>
          <p className="mt-2 leading-relaxed text-fog">
            Questions about privacy? Reach us at privacy@{SITE.domain}.
          </p>
        </section>
      </div>
    </article>
  );
}
