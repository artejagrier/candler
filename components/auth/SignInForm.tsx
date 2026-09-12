"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { signInAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { signInSchema, type SignInInput } from "@/lib/auth/schemas";
import { FormStatus } from "@/components/auth/FormStatus";
import { PasswordField } from "@/components/auth/PasswordField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const result = await signInAction(values, next);
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
      <div className="grid grid-cols-2 gap-2">
        <a className="secondary-button" href={`/auth/oauth?provider=github&next=${encodeURIComponent(next ?? "/app")}`}>GitHub</a>
        <a className="secondary-button" href={`/auth/oauth?provider=google&next=${encodeURIComponent(next ?? "/app")}`}>Google</a>
      </div>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-muted"><span className="h-px flex-1 bg-line"/>or email<span className="h-px flex-1 bg-line"/></div>
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

      <FormField
        label="Password"
        error={errors.password?.message}
        labelAction={
          <Link
            href={AUTH_ROUTES.forgotPassword}
            className="text-xs font-medium text-lavender transition-colors hover:text-white"
          >
            Forgot password?
          </Link>
        }
      >
        {({ id, describedBy }) => (
          <PasswordField
            id={id}
            aria-describedby={describedBy}
            autoComplete="current-password"
            placeholder="••••••••"
            invalid={Boolean(errors.password)}
            {...register("password")}
          />
        )}
      </FormField>

      <SubmitButton pending={isSubmitting} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
