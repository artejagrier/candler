import "server-only";

import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * The authenticated user for the current request, or null. Wrapped in React
 * `cache` so multiple Server Components in one render share a single call.
 * `getUser()` (not `getSession()`) is used because it revalidates the token
 * with the Supabase Auth server — the trustworthy check for gating UI.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export type AssuranceLevel = "aal1" | "aal2";

export interface AalStatus {
  current: AssuranceLevel | null;
  next: AssuranceLevel | null;
  /** User has an enrolled factor but hasn't completed the step-up challenge. */
  shouldStepUp: boolean;
}

/**
 * Authenticator Assurance Level for the current session. `aal1` = password
 * only; `aal2` = password + a verified MFA factor this session. When a user has
 * MFA enrolled but the session is still `aal1`, `shouldStepUp` is true.
 */
export const getAssuranceLevel = cache(async (): Promise<AalStatus> => {
  const empty: AalStatus = { current: null, next: null, shouldStepUp: false };
  if (!isSupabaseConfigured) return empty;

  const supabase = await createClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return empty;

  const current = data.currentLevel as AssuranceLevel | null;
  const next = data.nextLevel as AssuranceLevel | null;
  return {
    current,
    next,
    shouldStepUp: current === "aal1" && next === "aal2",
  };
});

export const hasVerifiedTotpFactor = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured) return false;
  const supabase = await createClient();
  const { data } = await supabase.auth.mfa.listFactors();
  return Boolean(data?.totp?.some((factor) => factor.status === "verified"));
});
