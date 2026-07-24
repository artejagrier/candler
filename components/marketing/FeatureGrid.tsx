import { Surface } from "@/components/ui/Surface";
import { FEATURES, type Feature } from "@/config/marketing";

/** Grid of product capabilities. Defaults to the full feature set. */
export function FeatureGrid({ items = FEATURES }: { items?: Feature[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((feature) => {
        const Icon = feature.icon;
        return (
          <Surface
            key={feature.title}
            className="flex flex-col gap-3 p-6 transition-colors hover:border-line-strong"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-purple/15 text-lavender ring-1 ring-line-strong">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="text-base font-semibold text-white">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-fog">
              {feature.description}
            </p>
          </Surface>
        );
      })}
    </div>
  );
}
