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
 * The Candler wordmark: a purple glass shield + "Candler.dev". Shared by the
 * marketing header, footer, and every auth screen so the brand stays identical.
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
      <span
        className={cn(
          "flex items-center justify-center bg-purple shadow-glow-sm",
          s.box,
        )}
      >
        <ShieldCheck className={cn(s.icon, "text-white")} aria-hidden="true" />
      </span>
      {!markOnly ? (
        <span className={cn("font-semibold tracking-tight text-white", s.text)}>
          {SITE.name}
          <span className="text-lavender">.dev</span>
        </span>
      ) : null}
    </span>
  );

  if (href === null) return content;

  return (
    <Link
      href={href}
      aria-label={`${SITE.name} home`}
      className="inline-flex rounded-lg transition-opacity hover:opacity-90"
    >
      {content}
    </Link>
  );
}
