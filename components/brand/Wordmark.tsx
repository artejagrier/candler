import Link from "next/link";

import { SITE } from "@/config/site";
import { cn } from "@/lib/utilities/cn";

const SIZES = {
  sm: { box: "size-8", px: 32, text: "text-base" },
  md: { box: "size-9", px: 36, text: "text-lg" },
  lg: { box: "size-12", px: 48, text: "text-2xl" },
} as const;

interface WordmarkProps {
  size?: keyof typeof SIZES;
  /** Render as a link to a destination (defaults to the marketing home). */
  href?: string | null;
  /** Hide the ".dev" text and wordmark, showing only the C mark. */
  markOnly?: boolean;
  className?: string;
}

/**
 * Canonical Candler wordmark: the iridescent C mark (transparent PNG) plus
 * the Candler.dev name. The mark is never recolored by the workspace theme.
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
        {/* Brand mark is a static PNG; next/image is unnecessary at this size. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/candler-mark.png"
          alt=""
          width={s.px}
          height={s.px}
          className="wordmark-glyph"
          draggable={false}
        />
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
