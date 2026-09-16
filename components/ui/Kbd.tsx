import { cn } from "@/lib/utilities/cn";

/** A keyboard-key hint, e.g. inside the command palette trigger. */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5",
        "border border-line bg-[color-mix(in_srgb,var(--color-foreground)_5%,transparent)] font-mono text-[11px] font-medium text-fog",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
