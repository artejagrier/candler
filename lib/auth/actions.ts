"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_ROUTES,
  DEFAULT_AUTHENTICATED_REDIRECT,
  safeNextPath,
} from "@/lib/auth/routes";
import {
  OAUTH_LEGAL_COOKIE,
  VERIFICATION_REQUESTED_MESSAGE,
  emailConfirmRedirectTo,
  isOAuthProvider,
  oauthStartPath,
  publicAuthError,
  type OAuthProvider,
} from "@/lib/auth/oauth";
import {
  forgotPasswordSchema,
  invitationSchema,
  recoveryCodeSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  totpSchema,
  type ForgotPasswordInput,
  type InvitationInput,
  type RecoveryCodeInput,
  type ResetPasswordInput,
  type SignInInput,
  type SignUpInput,
  type TotpInput,
} from "@/lib/auth/schemas";
import {
  regenerateRecoveryCodes,
  verifyAndConsumeRecoveryCode,
} from "@/lib/auth/recovery-codes";
import { recordLegalConsent } from "@/lib/legal/consent";
import { LEGAL_ACCEPTANCE_MESSAGE } from "@/lib/legal/versions";

/** Discriminated result every action returns to its form. */
export type ActionResult =
  | { ok: true; redirectTo?: string; message?: string }
  | { ok: false; error: string };

const NOT_CONFIGURED_MESSAGE =
  "Authentication isn't configured yet. Add your Supabase keys to .env.local to enable sign-in.";
const NOT_CONFIGURED: ActionResult = {
  ok: false,
  error: NOT_CONFIGURED_MESSAGE,
};

function firstZodError(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

// ── Sign in ──────────────────────────────────────────────────────────────────
export async function signInAction(
  input: SignInInput,
  next?: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "Invalid email or password." };

  // If the account has MFA enrolled, the session is aal1 → step up first.
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
    const target = safeNextPath(next);
    return {
      ok: true,
      redirectTo: `${AUTH_ROUTES.mfa}?next=${encodeURIComponent(target)}`,
    };
  }

  return { ok: true, redirectTo: safeNextPath(next) };
}

// ── Sign up ──────────────────────────────────────────────────────────────────
export async function signUpAction(input: SignUpInput, next?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const destination = next ? safeNextPath(next) : DEFAULT_AUTHENTICATED_REDIRECT;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: emailConfirmRedirectTo(destination),
    },
  });
  if (error) {
    return {
      ok: false,
      error: publicAuthError(error, "We couldn't create that account. Try again."),
    };
  }

  const identities = data.user?.identities ?? [];
  if (data.user && !data.session && identities.length === 0) {
    return {
      ok: false,
      error:
        "We couldn't send a verification email. Sign in if you already have an account, or try a different email.",
    };
  }

  if (data.user?.id) {
    const consent = await recordLegalConsent({ userId: data.user.id, source: "signup" });
    if (!consent.ok) {
      // Account exists. Do not invent a consent row. Re-consent will run after sign-in.
    }
  }

  // A confirmed session means email verification is disabled (dev); otherwise
  // the user must confirm via the emailed link.
  if (data.session) return { ok: true, redirectTo: destination };
  return {
    ok: true,
    redirectTo: `${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(
      parsed.data.email,
    )}`,
    message: VERIFICATION_REQUESTED_MESSAGE,
  };
}

// ── Forgot password ──────────────────────────────────────────────────────────
export async function forgotPasswordAction(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = await createClient();
  // The recovery link lands on /auth/confirm, which establishes a session and
  // forwards to the reset-password screen.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: emailConfirmRedirectTo(AUTH_ROUTES.resetPassword),
  });
  if (error) {
    return {
      ok: false,
      error: publicAuthError(
        error,
        "We couldn't send a reset email. Try again in a few minutes.",
      ),
    };
  }

  // Success means Supabase accepted the send request. Do not reveal whether the
  // address has an account.
  return {
    ok: true,
    message:
      "If an account exists for that email, a password reset link is on its way.",
  };
}

// ── Reset password (from a recovery-link session) ────────────────────────────
export async function resetPasswordAction(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "Your reset link has expired. Request a new one to continue.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, redirectTo: DEFAULT_AUTHENTICATED_REDIRECT };
}

// ── Resend verification email ────────────────────────────────────────────────
export async function resendVerificationAction(
  email: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (!email) return { ok: false, error: "No email address to resend to." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: emailConfirmRedirectTo(DEFAULT_AUTHENTICATED_REDIRECT),
    },
  });
  if (error) {
    return {
      ok: false,
      error: publicAuthError(
        error,
        "We couldn't send a verification email. Check the address and try again.",
      ),
    };
  }
  return { ok: true, message: VERIFICATION_REQUESTED_MESSAGE };
}

export async function startSocialSignupAction(
  provider: OAuthProvider,
  legalAccepted: boolean,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  if (!isOAuthProvider(provider)) {
    return { ok: false, error: "That sign-in method isn't available." };
  }
  if (legalAccepted !== true) {
    return { ok: false, error: LEGAL_ACCEPTANCE_MESSAGE };
  }

  const jar = await cookies();
  jar.set(OAUTH_LEGAL_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  return { ok: true, redirectTo: oauthStartPath(provider) };
}

// ── MFA challenge (step-up at sign-in) ───────────────────────────────────────
export async function verifyMfaAction(
  input: TotpInput,
  next?: string,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = totpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = await createClient();
  const { data: factors, error: listError } =
    await supabase.auth.mfa.listFactors();
  if (listError) return { ok: false, error: listError.message };

  const totp = factors?.totp?.[0];
  if (!totp) {
    return {
      ok: false,
      error: "No authenticator app is enrolled on this account.",
    };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: totp.id });
  if (challengeError || !challenge) {
    return { ok: false, error: "Couldn't start the MFA challenge. Try again." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: totp.id,
    challengeId: challenge.id,
    code: parsed.data.code,
  });
  if (verifyError) {
    return { ok: false, error: "That code didn't match. Try again." };
  }

  return { ok: true, redirectTo: safeNextPath(next) };
}

// ── Recovery code (MFA fallback) ─────────────────────────────────────────────
export async function verifyRecoveryCodeAction(
  input: RecoveryCodeInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = recoveryCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const consumed = await verifyAndConsumeRecoveryCode(parsed.data.code);
  if (!consumed) {
    return {
      ok: false,
      error: "That recovery code is invalid or has already been used.",
    };
  }

  // A valid recovery code proves possession of a backup credential. Removing the
  // lost TOTP factor drops the account's step-up requirement so the user can
  // sign in and re-enroll a new authenticator from Security settings.
  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.totp ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  return { ok: true, redirectTo: DEFAULT_AUTHENTICATED_REDIRECT };
}

// ── Invitation acceptance ────────────────────────────────────────────────────
export async function acceptInvitationAction(
  input: InvitationInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      error: "This invitation link has expired. Ask for a fresh invite.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, redirectTo: DEFAULT_AUTHENTICATED_REDIRECT };
}

// ── MFA enrollment (Security settings) ───────────────────────────────────────
export type EnrollResult =
  | { ok: true; factorId: string; qrCode: string; secret: string; uri: string }
  | { ok: false; error: string };

/** Begin TOTP enrollment: returns a QR code + secret to show the user. */
export async function enrollMfaAction(): Promise<EnrollResult> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_MESSAGE };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
  });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't start enrollment." };
  }
  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

/** Finish TOTP enrollment by verifying the first code from the app. */
export async function confirmMfaEnrollmentAction(
  factorId: string,
  input: TotpInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;

  const parsed = totpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  const supabase = await createClient();
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challenge) {
    return { ok: false, error: "Couldn't start verification. Try again." };
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });
  if (error) return { ok: false, error: "That code didn't match. Try again." };

  return { ok: true, message: "Authenticator enrolled." };
}

/** Generate a fresh batch of recovery codes; returns the plain codes once. */
export async function generateRecoveryCodesAction(): Promise<
  { ok: true; codes: string[] } | { ok: false; error: string }
> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_MESSAGE };
  try {
    const codes = await regenerateRecoveryCodes();
    return { ok: true, codes };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Couldn't generate recovery codes.",
    };
  }
}

// ── Sign out ─────────────────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(AUTH_ROUTES.signIn);
}

export async function changePasswordAction(password: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed=resetPasswordSchema.safeParse({password,confirmPassword:password});
  if(!parsed.success)return{ok:false,error:firstZodError(parsed.error)};
  const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)return{ok:false,error:"Authentication required."};
  const{error}=await supabase.auth.updateUser({password});return error?{ok:false,error:"Password could not be changed."}:{ok:true,message:"Password changed."};
}

export async function logoutAllSessionsAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const supabase=await createClient();const{error}=await supabase.auth.signOut({scope:"global"});
  return error?{ok:false,error:"Sessions could not be revoked."}:{ok:true,redirectTo:AUTH_ROUTES.signIn};
}
