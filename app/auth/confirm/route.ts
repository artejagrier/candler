import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { publicOriginFromRequest } from "@/lib/auth/oauth";
import { AUTH_ROUTES, DEFAULT_AUTHENTICATED_REDIRECT, safeNextPath } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.includes(value as EmailOtpType));
}

/**
 * Email link confirmation (signup, magic link, recovery, invite). Verifies the
 * `token_hash` OTP to establish a session, then forwards to `next`. This is the
 * SSR-friendly counterpart to the `?code` callback above.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOriginFromRequest(request);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNextPath(
    searchParams.get("next"),
    type === "recovery" ? AUTH_ROUTES.resetPassword : DEFAULT_AUTHENTICATED_REDIRECT,
  );

  if (tokenHash && isEmailOtpType(type) && isSupabaseConfigured) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}${AUTH_ROUTES.signIn}?error=verify`);
}
