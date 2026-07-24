"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { forgotPasswordAction } from "@/lib/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/auth/schemas";
import { FormStatus } from "@/components/auth/FormStatus";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await forgotPasswordAction(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSent(result.message ?? "Check your inbox for a reset link.");
  });

  if (sent) {
    return <FormStatus type="success" message={sent} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormStatus type="error" message={formError} />

      <FormField label="Email" error={errors.email?.message}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            icon={Mail}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            invalid={Boolean(errors.email)}
            {...register("email")}
          />
        )}
      </FormField>

      <SubmitButton pending={isSubmitting} pendingLabel="Sending link…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
