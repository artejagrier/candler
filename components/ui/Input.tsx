import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utilities/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon (decorative — label the field with a real <label>). */
  icon?: LucideIcon;
  /** Marks the field as invalid (red hairline + aria-invalid). */
  invalid?: boolean;
  /** Optional trailing control, e.g. a password show/hide toggle. */
  trailing?: React.ReactNode;
  /** Forwarded to the inner <input> (React 19 ref-as-prop, e.g. RHF register). */
  ref?: React.Ref<HTMLInputElement>;
}

/**
 * Text input on the subtle-glass surface. Consumers must associate a visible
 * <label> (or aria-label) for accessibility. Focus styling comes from the
 * global :focus-visible ring plus a purple border on focus-within.
 */
export function Input({
  icon: Icon,
  className,
  invalid = false,
  trailing,
  ref,
  ...props
}: InputProps) {
  return (
    <div
      className={cn(
        "glass-subtle group flex items-center gap-2.5 rounded-xl px-3.5",
        "transition-colors focus-within:border-line-strong",
        invalid && "border-danger/50 focus-within:border-danger/60",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className={cn(
            "size-4 shrink-0 text-fog group-focus-within:text-lavender",
            invalid && "text-danger",
          )}
          aria-hidden="true"
        />
      ) : null}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full bg-transparent text-sm text-mist outline-none",
          "placeholder:text-slate-muted",
        )}
        {...props}
      />
      {trailing}
    </div>
  );
}
