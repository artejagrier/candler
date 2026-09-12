import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createStepUpToken, STEP_UP_COOKIE, STEP_UP_TTL_SECONDS, verifyStepUpToken } from "@/lib/security/step-up";

export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Strongest practical V1 step-up:
 * - MFA-assured sessions (aal2) are accepted.
 * - Otherwise a password re-authentication cookie, issued only after
 *   signInWithPassword succeeds, is required. JWT `iat` is NOT used because
 *   refreshed access tokens would make every request look "recent".
 */
export async function hasRecentAuthentication(): Promise<boolean> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return false;
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") return true;
  } catch {
    // AAL lookup must not 500 reveal/recovery. Missing session.user.factors is
    // treated as not aal2; the short-lived password step-up cookie still applies.
  }
  try {
    const token = (await cookies()).get(STEP_UP_COOKIE)?.value;
    return verifyStepUpToken(token, user.id);
  } catch {
    return false;
  }
}

export async function grantStepUpCookie(userId: string): Promise<void> {
  const token = createStepUpToken(userId);
  (await cookies()).set(STEP_UP_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: STEP_UP_TTL_SECONDS,
  });
}
