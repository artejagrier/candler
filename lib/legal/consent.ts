import "server-only";

import { emitAuditEvent } from "@/lib/audit/events";
import {
  authoritativeLegalVersions,
  consentSatisfiesCurrent,
  type LegalConsentSource,
  type StoredLegalConsent,
} from "@/lib/legal/versions";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RecordConsentResult =
  | { ok: true; created: boolean }
  | { ok: false; error: string };

function isMissingTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    (/legal_consents/i.test(message) && /does not exist|schema cache/i.test(message))
  );
}

export async function getLatestLegalConsent(userId: string): Promise<StoredLegalConsent | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("legal_consents")
    .select("terms_version,privacy_version,aup_version,accepted_at,consent_source")
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw new Error("Legal consent history could not be loaded.");
  }
  return data as StoredLegalConsent | null;
}

export async function userNeedsLegalReconsent(userId: string): Promise<boolean> {
  try {
    const latest = await getLatestLegalConsent(userId);
    return !consentSatisfiesCurrent(latest);
  } catch {
    // Missing table or transient error must not lock existing beta accounts.
    return false;
  }
}

export async function recordLegalConsent(input: {
  userId: string;
  source: LegalConsentSource;
}): Promise<RecordConsentResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, error: "Legal acceptance could not be recorded." };
  }

  const versions = authoritativeLegalVersions();
  const supabase = createAdminClient();
  const row = {
    user_id: input.userId,
    terms_version: versions.termsVersion,
    privacy_version: versions.privacyVersion,
    aup_version: versions.aupVersion,
    consent_source: input.source,
  };
  const { data, error } = await supabase
    .from("legal_consents")
    .upsert(row, { onConflict: "user_id,terms_version,privacy_version", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { ok: true, created: false };
    return { ok: false, error: "Legal acceptance could not be recorded." };
  }

  if (data?.id) {
    await emitLegalAudit(input.userId, input.source, versions);
    return { ok: true, created: true };
  }

  const { data: existing } = await supabase
    .from("legal_consents")
    .select("id")
    .eq("user_id", input.userId)
    .eq("terms_version", versions.termsVersion)
    .eq("privacy_version", versions.privacyVersion)
    .maybeSingle();
  if (existing) return { ok: true, created: false };
  return { ok: false, error: "Legal acceptance could not be recorded." };
}

async function emitLegalAudit(
  userId: string,
  source: LegalConsentSource,
  versions: ReturnType<typeof authoritativeLegalVersions>,
) {
  try {
    const admin = createAdminClient();
    const { data: workspace } = await admin
      .from("workspaces")
      .select("id")
      .eq("owner_id", userId)
      .limit(1)
      .maybeSingle();
    if (!workspace) return;
    await emitAuditEvent({
      workspaceId: workspace.id,
      actorId: userId,
      eventType: source === "signup" ? "legal.accepted" : "legal.reaccepted",
      targetType: "legal_consent",
      metadata: {
        terms_version: versions.termsVersion,
        privacy_version: versions.privacyVersion,
        aup_version: versions.aupVersion,
        source,
      },
    });
  } catch {
    // Consent row is authoritative. Audit must not roll back acceptance.
  }
}
