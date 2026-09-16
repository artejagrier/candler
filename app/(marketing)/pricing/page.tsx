import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/CtaSection";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { PricingTable } from "@/components/marketing/PricingTable";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { FAQ } from "@/config/marketing";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free with 10 GB. Upgrade to Candler Pro, Pro + Cloud 500, or Pro + Cloud 1 TB.",
};

export default async function PricingPage() {
  let authenticated = false;

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      authenticated = Boolean(data.user);
    } catch {
      // If auth check fails, treat as guest — safe default.
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:gap-28">
      <header className="flex flex-col items-center pt-8 text-center">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple, honest pricing"
          description="No per-seat surprises on the free plan, no fake urgency. Pick the plan that fits how you build."
        />
      </header>

      <PricingTable authenticated={authenticated} />

      <section aria-labelledby="pricing-faq" className="mx-auto w-full max-w-3xl">
        <SectionHeading
          title={<span id="pricing-faq">Pricing questions</span>}
        />
        <div className="mt-10">
          <FaqAccordion items={FAQ.slice(3)} />
        </div>
      </section>

      <CtaSection />
    </div>
  );
}
