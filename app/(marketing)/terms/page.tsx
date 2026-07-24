import type { Metadata } from "next";

import { Badge } from "@/components/ui/Badge";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of Candler.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <Badge tone="warning">Placeholder — pending legal review</Badge>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-4 leading-relaxed text-fog">
        This is placeholder copy for the {SITE.name} Terms of Service. Real terms
        will replace it before any public launch. It is included so the product
        experience is complete and every link resolves.
      </p>

      <div className="mt-10 flex flex-col gap-6 text-mist">
        <section>
          <h2 className="text-lg font-semibold text-white">1. Using Candler</h2>
          <p className="mt-2 leading-relaxed text-fog">
            {SITE.name} organizes your projects and bridges third-party services
            you connect. You are responsible for the accounts and credentials you
            link, and for complying with each provider&apos;s own terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">2. Your data</h2>
          <p className="mt-2 leading-relaxed text-fog">
            You retain ownership of the content and configuration you store. See
            the Privacy Policy for how information is handled.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">3. Changes</h2>
          <p className="mt-2 leading-relaxed text-fog">
            These terms will evolve as {SITE.name} grows. Material changes will be
            communicated before they take effect.
          </p>
        </section>
      </div>
    </article>
  );
}
