import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Surface } from "@/components/ui/Surface";

interface Zone {
  title: string;
  note: string;
}

interface WorkspacePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  /** Which build phase delivers the real screen. */
  phase: string;
  zones?: Zone[];
  /** Optional custom header content (e.g. a personalized greeting). */
  header?: React.ReactNode;
}

/**
 * Honest, on-brand scaffold for workspace routes whose full experience ships in
 * a later phase. It exercises the real design system (so the foundation is
 * visible and navigable) without faking functionality that doesn't exist yet.
 */
export function WorkspacePlaceholder({
  eyebrow,
  title,
  description,
  phase,
  zones = [],
  header,
}: WorkspacePlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-10 sm:px-8 sm:pt-16">
      <div className="animate-rise">
        <p className="text-sm font-medium uppercase tracking-widest text-lavender/80">
          {eyebrow}
        </p>
        {header ?? (
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
        )}
        <p className="mt-3 max-w-2xl text-base text-fog">{description}</p>
        <div className="mt-4">
          <Badge tone="purple" icon={Sparkles}>
            Arriving in {phase}
          </Badge>
        </div>
      </div>

      {zones.length > 0 ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <Surface key={zone.title} subtle className="p-5">
              <h2 className="text-sm font-semibold text-white">{zone.title}</h2>
              <p className="mt-1.5 text-sm text-fog">{zone.note}</p>
              <div className="mt-4 space-y-2" aria-hidden="true">
                <div className="h-2.5 w-3/4 rounded-full bg-white/6" />
                <div className="h-2.5 w-1/2 rounded-full bg-white/6" />
              </div>
            </Surface>
          ))}
        </div>
      ) : null}
    </div>
  );
}
