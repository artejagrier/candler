import { CtaSection } from "@/components/marketing/CtaSection";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { IntegrationsSection } from "@/components/marketing/IntegrationsSection";
import { PricingTable } from "@/components/marketing/PricingTable";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { StatsBar } from "@/components/marketing/StatsBar";
import { FAQ } from "@/config/marketing";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";

export default function LandingPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 pb-8 sm:px-6 sm:gap-32">
      <Hero />

      <StatsBar />

      <section aria-labelledby="features-heading">
        <SectionHeading
          eyebrow="Features"
          title={
            <span id="features-heading">
              Everything a project needs, in one place
            </span>
          }
          description="Candler organizes the sprawl of modern development around the thing that matters — the project."
        />
        <div className="mt-12">
          <FeatureGrid />
        </div>
      </section>

      <IntegrationsSection />

      <HowItWorks />

      <section aria-labelledby="pricing-heading">
        <SectionHeading
          eyebrow="Pricing"
          title={<span id="pricing-heading">Simple, honest pricing</span>}
          description="Start free. Upgrade when your team grows. No surprises."
        />
        <div className="mt-12">
          <PricingTable />
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="mx-auto w-full max-w-3xl">
        <SectionHeading
          eyebrow="FAQ"
          title={<span id="faq-heading">Questions, answered</span>}
        />
        <div className="mt-12">
          <FaqAccordion items={FAQ.slice(0, 4)} />
        </div>
      </section>

      <CtaSection />
    </div>
  );
}
