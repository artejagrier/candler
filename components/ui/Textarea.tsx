import { cn } from "@/lib/utilities/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: React.Ref<HTMLTextAreaElement>;
}

/** Multi-line input matching the subtle-glass field styling. */
export function Textarea({ className, invalid = false, ref, ...props }: TextareaProps) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "glass-subtle w-full rounded-xl px-3.5 py-2.5 text-sm text-mist outline-none",
        "placeholder:text-slate-muted transition-colors focus-within:border-line-strong",
        "focus:border-line-strong resize-y min-h-24",
        invalid && "border-danger/50",
        className,
      )}
      {...props}
    />
  );
}
