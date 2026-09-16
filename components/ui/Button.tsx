import { cn } from "@/lib/utilities/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-btn)] text-[var(--color-btn-fg)] hover:brightness-110 shadow-glow-sm hover:shadow-glow",
  secondary:
    "glass-subtle text-foreground hover:bg-[color-mix(in_srgb,var(--color-foreground)_8%,transparent)] hover:text-foreground",
  ghost:
    "text-fog hover:bg-[color-mix(in_srgb,var(--color-foreground)_6%,transparent)] hover:text-foreground",
  outline:
    "border border-line-strong text-[var(--color-brand-text)] hover:bg-purple/12 hover:text-foreground",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
  icon: "size-11 justify-center",
};

/**
 * Shared button styling. Exported so link-shaped buttons (e.g. a Next.js
 * <Link>) can look identical without nesting an <a> inside a <button>.
 */
export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center rounded-full font-medium",
    "transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/**
 * Primary interactive control. Renders a real <button> (accessible by default);
 * pass `type="submit"` for forms. Icons should be sized ~1em and marked
 * aria-hidden with an accessible label on the button for icon-only use. For
 * navigation, use a <Link> with {buttonClassName(...)} instead.
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {children}
    </button>
  );
}
