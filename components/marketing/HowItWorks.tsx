import { SectionHeading } from "@/components/marketing/SectionHeading";
import { HOW_IT_WORKS } from "@/config/marketing";

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading">
      <SectionHeading
        eyebrow="How it works"
        title={<span id="how-heading">From scattered tabs to one workspace</span>}
        description="Four steps to bring every project, service, and secret under one secure roof."
      />

      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HOW_IT_WORKS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="relative flex flex-col gap-3 rounded-2xl border border-line bg-white/[0.02] p-6"
            >
              <span className="text-sm font-semibold text-slate-muted">
                0{index + 1}
              </span>
              <span className="flex size-11 items-center justify-center rounded-xl bg-purple/15 text-lavender ring-1 ring-line-strong">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="text-base font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-fog">
                {step.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
