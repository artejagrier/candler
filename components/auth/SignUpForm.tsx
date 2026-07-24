"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { signUpAction } from "@/lib/auth/actions";
import { signUpSchema, type SignUpInput } from "@/lib/auth/schemas";
import { FormStatus } from "@/components/auth/FormStatus";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signUpAction(values);
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

      <FormField label="Full name" error={errors.name?.message}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            icon={User}
            autoComplete="name"
            placeholder="Ada Lovelace"
            invalid={Boolean(errors.name)}
            {...register("name")}
          />
        )}
      </FormField>

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

      <FormField
        label="Password"
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

      <SubmitButton pending={isSubmitting} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
