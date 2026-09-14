import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { SITE } from "@/config/site";
import { cn } from "@/lib/utilities/cn";

const SIZES = {
  sm: { box: "size-7 rounded-lg", icon: "size-4", text: "text-base" },
  md: { box: "size-8 rounded-lg", icon: "size-5", text: "text-lg" },
  lg: { box: "size-11 rounded-xl", icon: "size-6", text: "text-2xl" },
} as const;

interface WordmarkProps {
  size?: keyof typeof SIZES;
  /** Render as a link to a destination (defaults to the marketing home). */
  href?: string | null;
  /** Hide the ".dev" text and wordmark, showing only the shield mark. */
  markOnly?: boolean;
  className?: string;
}

/**
 * Canonical Candler wordmark: burgundy shield + neon-green check. The mark is
 * never recolored by the workspace theme; surrounding type uses foreground
 * tokens so it stays readable on light and dark surfaces.
 */
export function Wordmark({
  size = "md",
  href = "/",
  markOnly = false,
  className,
}: WordmarkProps) {
  const s = SIZES[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("wordmark-mark flex items-center justify-center", s.box)}>
        <ShieldCheck className={cn(s.icon, "wordmark-glyph")} aria-hidden="true" />
      </span>
      {!markOnly ? (
        <span className={cn("wordmark-name font-semibold tracking-tight", s.text)}>
          {SITE.name}
          <span className="wordmark-tld">.dev</span>
        </span>
      ) : null}
    </span>
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      aria-label={href === "/app" ? `${SITE.name} Dashboard` : `${SITE.name} home`}
      className="inline-flex rounded-lg transition-opacity hover:opacity-90"
    >
      {content}
    </Link>
  );
}
