"use server";

import { getCurrentUser } from "@/lib/auth/session";
import { recordLegalConsent } from "@/lib/legal/consent";

export async function acceptCurrentLegalAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Authentication required." };
  const recorded = await recordLegalConsent({ userId: user.id, source: "reconsent" });
  if (!recorded.ok) return { ok: false, error: recorded.error };
  return { ok: true };
}
