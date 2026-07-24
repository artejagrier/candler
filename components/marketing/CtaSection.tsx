import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { buttonClassName } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export function CtaSection() {
  return (
    <Surface glow className="overflow-hidden px-6 py-14 text-center sm:px-12">
      <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
        Give every project a{" "}
        <span className="text-glow bg-gradient-to-r from-lavender via-purple-bright to-purple bg-clip-text text-transparent">
          secure home.
        </span>
      </h2>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-fog">
        Start free in minutes. Connect your stack, organize your secrets, and
        keep everything in one place.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          href={AUTH_ROUTES.signUp}
          className={buttonClassName({ size: "lg", className: "group" })}
        >
          Create your workspace
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
        <Link
          href="/pricing"
          className={buttonClassName({ variant: "outline", size: "lg" })}
        >
          See pricing
        </Link>
      </div>
    </Surface>
  );
}
