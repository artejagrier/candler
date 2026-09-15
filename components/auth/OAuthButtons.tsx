"use client";

import { useState } from "react";

import { startSocialSignupAction } from "@/lib/auth/actions";
import { oauthStartPath, type OAuthProvider } from "@/lib/auth/oauth";

function OAuthButton({
  label,
  disabled,
  pending,
  href,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  pending?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const className = "secondary-button";
  if (href && !onClick) {
    return (
      <a
        className={className}
        href={disabled ? undefined : href}
        aria-disabled={disabled || pending}
        onClick={(event) => {
          if (disabled || pending) event.preventDefault();
        }}
      >
        {pending ? "Connecting…" : label}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
    >
      {pending ? "Connecting…" : label}
    </button>
  );
}

export function SignInOAuthButtons({ next }: { next?: string }) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );

  function start(provider: OAuthProvider) {
    if (pendingProvider) return;
    setPendingProvider(provider);
    window.location.assign(oauthStartPath(provider, next));
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <OAuthButton
        label="GitHub"
        pending={pendingProvider === "github"}
        disabled={Boolean(pendingProvider)}
        onClick={() => start("github")}
      />
      <OAuthButton
        label="Google"
        pending={pendingProvider === "google"}
        disabled={Boolean(pendingProvider)}
        onClick={() => start("google")}
      />
    </div>
  );
}

export function SignUpOAuthButtons({
  legalAccepted,
  disabled,
}: {
  legalAccepted: boolean;
  disabled?: boolean;
}) {
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function start(provider: OAuthProvider) {
    if (disabled || pendingProvider) return;
    if (!legalAccepted) return;
    setError(null);
    setPendingProvider(provider);
    const result = await startSocialSignupAction(provider, legalAccepted);
    if (!result.ok) {
      setPendingProvider(null);
      setError(result.error);
      return;
    }
    if (result.redirectTo) {
      window.location.assign(result.redirectTo);
      return;
    }
    setPendingProvider(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <OAuthButton
          label="GitHub"
          disabled={disabled || !legalAccepted || Boolean(pendingProvider)}
          pending={pendingProvider === "github"}
          onClick={() => void start("github")}
        />
        <OAuthButton
          label="Google"
          disabled={disabled || !legalAccepted || Boolean(pendingProvider)}
          pending={pendingProvider === "google"}
          onClick={() => void start("google")}
        />
      </div>
      {!legalAccepted ? (
        <p className="text-xs text-slate-muted">
          Accept the Terms and Privacy Policy to continue with Google or GitHub.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
