import type { Metadata } from "next";

import { CtaSection } from "@/components/marketing/CtaSection";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { SectionHeading } from "@/components/marketing/SectionHeading";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Candler, security, and pricing.",
};

export default function FaqPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-16 px-4 py-16 sm:px-6">
      <header className="flex flex-col items-center pt-8 text-center">
        <SectionHeading
          eyebrow="FAQ"
          title="Frequently asked questions"
          description="Can't find what you're looking for? Reach out on the contact page."
        />
      </header>

      <FaqAccordion />
      <CtaSection />
    </div>
  );
}
