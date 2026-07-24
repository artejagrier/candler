"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { acceptInvitationAction } from "@/lib/auth/actions";
import { invitationSchema, type InvitationInput } from "@/lib/auth/schemas";
import { FormStatus } from "@/components/auth/FormStatus";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";

/**
 * Invitation acceptance: an invited user arrives with a session (from the
 * invite link's OTP) and sets their initial password to activate the account.
 */
export function InvitationForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InvitationInput>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await acceptInvitationAction(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    if (result.redirectTo) {
      router.replace(result.redirectTo);
      router.refresh();
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormStatus type="error" message={formError} />

      <FormField
        label="Create a password"
        error={errors.password?.message}
        hint="At least 8 characters with upper, lower, and a number."
      >
        {({ id, describedBy }) => (
          <PasswordField
            id={id}
            aria-describedby={describedBy}
            autoComplete="new-password"
            placeholder="Create a strong password"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        )}
      </FormField>

      <FormField label="Confirm password" error={errors.confirmPassword?.message}>
        {({ id, describedBy }) => (
          <PasswordField
            id={id}
            aria-describedby={describedBy}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
        )}
      </FormField>

      <SubmitButton pending={isSubmitting} pendingLabel="Activating…">
        Accept invitation
      </SubmitButton>
    </form>
  );
}
