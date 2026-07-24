"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { verifyMfaAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { totpSchema, type TotpInput } from "@/lib/auth/schemas";
import { FormStatus } from "@/components/auth/FormStatus";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

export function MfaForm({ next }: { next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TotpInput>({
    resolver: zodResolver(totpSchema),
    defaultValues: { code: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await verifyMfaAction(values, next);
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

      <FormField label="6-digit code" error={errors.code?.message}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            icon={KeyRound}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="tracking-[0.3em]"
            invalid={Boolean(errors.code)}
            {...register("code")}
          />
        )}
      </FormField>

      <SubmitButton pending={isSubmitting} pendingLabel="Verifying…">
        Verify
      </SubmitButton>

      <p className="text-center text-sm text-fog">
        Lost your device?{" "}
        <Link
          href={next ? `${AUTH_ROUTES.recoveryCode}?next=${encodeURIComponent(next)}` : AUTH_ROUTES.recoveryCode}
          className="font-medium text-lavender transition-colors hover:text-white"
        >
          Use a recovery code
        </Link>
      </p>
    </form>
  );
}
