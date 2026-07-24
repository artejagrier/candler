import { cn } from "@/lib/utilities/cn";

type SurfaceElement = "div" | "section" | "article" | "aside" | "header";

interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  /** Semantic element to render. Defaults to a div. */
  as?: SurfaceElement;
  /** Add the signature purple glow ring for emphasized panels. */
  glow?: boolean;
  /** Use the lighter nested-glass treatment. */
  subtle?: boolean;
}

/**
 * Candler's black-glass panel — the base building block for every workspace
 * zone. Server-safe (no client hooks), so it can be used in Server Components.
 */
export function Surface({
  as: Tag = "div",
  glow = false,
  subtle = false,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <Tag
      className={cn(
        subtle ? "glass-subtle" : "glass",
        "rounded-2xl",
        glow && "ring-glow",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
