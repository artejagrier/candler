"use server";

import { isSupabaseAdminConfigured } from "@/lib/env";
import { emailConfirmRedirectTo } from "@/lib/auth/oauth";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type InviteResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Send a team invitation via the Supabase Admin API. The invitee receives an
 * email whose link lands on /invitation (with a session), where they set their
 * password. Requires the server-only secret key.
 *
 * Authorization: this action must only be reachable behind an authenticated
 * workspace (the Team screen). It re-checks the caller server-side rather than
 * trusting the proxy alone.
 */
export async function inviteUserAction(email: string): Promise<InviteResult> {
  if (!isSupabaseAdminConfigured()) {
    return {
      ok: false,
      error:
        "Invitations need the server-side SUPABASE_SECRET_KEY. Add it to .env.local.",
    };
  }

  // Re-verify the caller is authenticated (defense-in-depth beyond the proxy).
  const caller = await getCurrentUser();
  if (!caller) return { ok: false, error: "You must be signed in to invite." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: emailConfirmRedirectTo(AUTH_ROUTES.invitation),
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true, message: `Invitation sent to ${email}.` };
}
