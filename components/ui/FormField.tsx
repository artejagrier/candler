import { useId } from "react";

import { cn } from "@/lib/utilities/cn";

interface FormFieldProps {
  label: string;
  /** Render prop receives the id to wire to the control + aria-describedby. */
  children: (ids: { id: string; describedBy?: string }) => React.ReactNode;
  error?: string;
  hint?: string;
  /** Optional element rendered on the right of the label row (e.g. a link). */
  labelAction?: React.ReactNode;
  className?: string;
}

/**
 * Accessible labelled field: associates a <label>, optional hint, and error
 * message with the control via ids. The control is provided by a render prop so
 * any input (text, password, code) can be dropped in while keeping the a11y
 * wiring consistent.
 */
export function FormField({
  label,
  children,
  error,
  hint,
  labelAction,
  className,
}: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    cn(hint && hintId, error && errorId).trim() || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-mist">
          {label}
        </label>
        {labelAction}
      </div>
      {children({ id, describedBy })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-fog">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
