import { Surface } from "@/components/ui/Surface";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { INTEGRATIONS } from "@/config/marketing";

/**
 * The integrations showcase. Rendered as an anchor target (`#integrations`) so
 * the marketing nav can deep-link to it from any page.
 */
export function IntegrationsSection() {
  return (
    <section
      id="integrations"
      aria-labelledby="integrations-heading"
      className="scroll-mt-28"
    >
      <SectionHeading
        eyebrow="Integrations"
        title={<span id="integrations-heading">Bridges your entire stack</span>}
        description="Candler connects the services you already use and organizes their status beneath the project they power — it never replaces them."
      />

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <Surface
            key={integration.name}
            className="flex items-center gap-4 p-5 transition-colors hover:border-line-strong"
          >
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-semibold ring-1 ring-line"
              style={{ color: integration.accent }}
            >
              {integration.initial}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {integration.name}
              </h3>
              <p className="mt-0.5 text-sm text-fog">{integration.blurb}</p>
            </div>
          </Surface>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-slate-muted">
        More integrations arrive with each release. Missing one?{" "}
        <a
          href="/contact"
          className="text-lavender transition-colors hover:text-white"
        >
          Tell us what you need.
        </a>
      </p>
    </section>
  );
}
