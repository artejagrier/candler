import { Check } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { PRICING_TIERS } from "@/config/marketing";
import { cn } from "@/lib/utilities/cn";

export function PricingTable() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {PRICING_TIERS.map((tier) => (
        <Surface
          key={tier.name}
          glow={tier.highlighted}
          className={cn(
            "relative flex flex-col p-7",
            tier.highlighted && "border-line-strong",
          )}
        >
          {tier.highlighted ? (
            <div className="absolute -top-3 left-7">
              <Badge tone="purple">Most popular</Badge>
            </div>
          ) : null}

          <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-white">
              {tier.price}
            </span>
            {tier.cadence ? (
              <span className="text-sm text-fog">{tier.cadence}</span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-fog">
            {tier.description}
          </p>

          <ul className="mt-6 flex flex-1 flex-col gap-3">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-mist">
                <Check
                  className="mt-0.5 size-4 shrink-0 text-lavender"
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href={tier.href}
            className={buttonClassName({
              variant: tier.highlighted ? "primary" : "outline",
              size: "lg",
              className: "mt-8 w-full",
            })}
          >
            {tier.cta}
          </Link>
        </Surface>
      ))}
    </div>
  );
}
