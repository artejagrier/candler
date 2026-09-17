import { hasRecentAuthentication } from "@/lib/data/auth";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret, type EncryptedValue } from "@/lib/security/encryption";
import { emitAuditEvent } from "@/lib/audit/events";
import { safeErrorResponse } from "@/lib/security/redaction";
import {
  authorizeVaultSecretAccess,
  parseJsonObject,
  readSubmittedPhrase,
  readVaultUnlockStatus,
  vaultPhraseGateResponse,
  withVaultUnlockStatus,
} from "@/lib/vault/recovery-phrase-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  if (!(await hasRecentAuthentication())) {
    return Response.json(
      { error: "Confirm your password or complete MFA before revealing this setup key.", code: "REAUTH_REQUIRED" },
      { status: 403 },
    );
  }
  const body = await parseJsonObject(request);
  const gate = await authorizeVaultSecretAccess({
    userId: context.userId,
    workspaceId: context.workspaceId,
    phrase: readSubmittedPhrase(body),
    intent: "seed",
  });
  if (!gate.ok) return vaultPhraseGateResponse(gate);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("authenticator_entries")
    .select("id,issuer,account_name,seed_ciphertext,seed_iv,seed_auth_tag,key_version")
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (!data) return safeErrorResponse("You do not have access to this account.", 404);
  try {
    const secret = decryptSecret({
      ciphertext: data.seed_ciphertext,
      iv: data.seed_iv,
      authTag: data.seed_auth_tag,
      keyVersion: data.key_version,
      algorithm: "aes-256-gcm",
    } as EncryptedValue);
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "authenticator.seed_revealed",
      targetType: "authenticator",
      targetId: id,
      metadata: { issuer: data.issuer },
    });
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "vault_secret_reveal_authorized",
      targetType: "authenticator",
      targetId: id,
      metadata: { issuer: data.issuer },
    });
    return Response.json(
      withVaultUnlockStatus(await readVaultUnlockStatus(context.userId), {
        secret,
        issuer: data.issuer,
        accountName: data.account_name,
        hideAfterSeconds: 15,
      }),
      { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
    );
  } catch {
    return safeErrorResponse("This setup key could not be revealed.", 500);
  }
}
