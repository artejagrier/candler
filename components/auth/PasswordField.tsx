"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/Input";

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  ref?: React.Ref<HTMLInputElement>;
};

/**
 * Password input with a lock icon and an accessible show/hide toggle. Spreads
 * remaining props (including React Hook Form's `register(...)`) onto the input.
 */
export function PasswordField({ invalid, ref, ...props }: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <Input
      ref={ref}
      icon={Lock}
      type={show ? "text" : "password"}
      invalid={invalid}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-fog transition-colors hover:text-white"
        >
          {show ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </button>
      }
      {...props}
    />
  );
}
