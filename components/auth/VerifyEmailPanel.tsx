"use client";

import { useState } from "react";

import { resendVerificationAction } from "@/lib/auth/actions";
import { FormStatus } from "@/components/auth/FormStatus";
import { Button } from "@/components/ui/Button";

/**
 * Post-signup panel. The confirmation link is delivered by email; this offers a
 * resend and surfaces the result. No fake "verified" state — the actual
 * verification happens when the user clicks the emailed link (→ /auth/confirm).
 */
export function VerifyEmailPanel({ email }: { email?: string }) {
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [pending, setPending] = useState(false);

  async function resend() {
    if (!email) {
      setStatus({
        type: "error",
        message: "We don't have an email on file to resend to. Sign up again.",
      });
      return;
    }
    setPending(true);
    setStatus(null);
    const result = await resendVerificationAction(email);
    setPending(false);
    setStatus(
      result.ok
        ? { type: "success", message: result.message ?? "Email sent." }
        : { type: "error", message: result.error },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {email ? (
        <p className="rounded-xl border border-line bg-white/5 px-3.5 py-2.5 text-sm text-mist">
          Sent to <span className="font-medium text-white">{email}</span>
        </p>
      ) : null}

      {status ? <FormStatus type={status.type} message={status.message} /> : null}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={resend}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Sending…" : "Resend verification email"}
      </Button>
    </div>
  );
}
