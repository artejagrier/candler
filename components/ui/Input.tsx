import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utilities/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional leading icon (decorative — label the field with a real <label>). */
  icon?: LucideIcon;
}

/**
 * Text input on the subtle-glass surface. Consumers must associate a visible
 * <label> (or aria-label) for accessibility. Focus styling comes from the
 * global :focus-visible ring plus a purple border on focus-within.
 */
export function Input({ icon: Icon, className, ...props }: InputProps) {
  return (
    <div
      className={cn(
        "glass-subtle group flex items-center gap-2.5 rounded-xl px-3.5",
        "transition-colors focus-within:border-line-strong",
        className,
      )}
    >
      {Icon ? (
        <Icon
          className="size-4 shrink-0 text-fog group-focus-within:text-lavender"
          aria-hidden="true"
        />
      ) : null}
      <input
        className={cn(
          "h-11 w-full bg-transparent text-sm text-mist outline-none",
          "placeholder:text-slate-muted",
        )}
        {...props}
      />
    </div>
  );
}
