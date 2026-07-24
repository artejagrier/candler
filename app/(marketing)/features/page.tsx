import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/CtaSection";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { IntegrationsSection } from "@/components/marketing/IntegrationsSection";
import { SectionHeading } from "@/components/marketing/SectionHeading";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Every project, secret, environment, domain, and service — organized in one secure workspace.",
};

export default function FeaturesPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-16 sm:px-6 sm:gap-32">
      <header className="flex flex-col items-center pt-8 text-center">
        <SectionHeading
          eyebrow="Features"
          title="Built around the project"
          description="Modern development is spread across a dozen tools. Candler pulls the essentials together and organizes them where they belong."
        />
      </header>

      <FeatureGrid />
      <HowItWorks />
      <IntegrationsSection />
      <CtaSection />
    </div>
  );
}
