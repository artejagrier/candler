"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { verifyRecoveryCodeAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { recoveryCodeSchema, type RecoveryCodeInput } from "@/lib/auth/schemas";
import { FormStatus } from "@/components/auth/FormStatus";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

export function RecoveryCodeForm({ next }: { next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecoveryCodeInput>({
    resolver: zodResolver(recoveryCodeSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await verifyRecoveryCodeAction(values);
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
        label="Recovery code"
        error={errors.code?.message}
        hint="Enter one of the one-time backup codes you saved during setup."
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            icon={LifeBuoy}
            autoComplete="one-time-code"
            placeholder="XXXXX-XXXXX"
            className="tracking-[0.2em] uppercase"
            invalid={Boolean(errors.code)}
            {...register("code")}
          />
        )}
      </FormField>

      <SubmitButton pending={isSubmitting} pendingLabel="Verifying…">
        Use recovery code
      </SubmitButton>

      <p className="text-center text-sm text-fog">
        Have your device?{" "}
        <Link
          href={next ? `${AUTH_ROUTES.mfa}?next=${encodeURIComponent(next)}` : AUTH_ROUTES.mfa}
          className="font-medium text-lavender transition-colors hover:text-white"
        >
          Enter a 6-digit code
        </Link>
      </p>
    </form>
  );
}
