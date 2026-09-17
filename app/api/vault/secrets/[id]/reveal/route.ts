import { hasRecentAuthentication } from "@/lib/data/auth";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret, type EncryptedValue } from "@/lib/security/encryption";
import { emitAuditEvent } from "@/lib/audit/events";
import { safeErrorResponse } from "@/lib/security/redaction";
import {
  authorizeVaultSecretAccess,
  parseJsonObject,
  readPhraseIntent,
  readSubmittedPhrase,
  readVaultUnlockStatus,
  vaultPhraseGateResponse,
  withVaultUnlockStatus,
} from "@/lib/vault/recovery-phrase-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  if (!(await hasRecentAuthentication())) {
    return Response.json({ error: "Confirm your password or complete MFA before revealing secrets.", code: "REAUTH_REQUIRED" }, { status: 403 });
  }
  const body = await parseJsonObject(request);
  const intent = readPhraseIntent(body, "reveal");
  const gate = await authorizeVaultSecretAccess({
    userId: context.userId,
    workspaceId: context.workspaceId,
    phrase: readSubmittedPhrase(body),
    intent: intent === "copy" ? "copy" : "reveal",
  });
  if (!gate.ok) return vaultPhraseGateResponse(gate);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("secrets")
    .select("id,name,ciphertext,iv,auth_tag,key_version,algorithm")
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (!data) return safeErrorResponse("Secret not found.", 404);
  try {
    const value = decryptSecret({
      ciphertext: data.ciphertext,
      iv: data.iv,
      authTag: data.auth_tag,
      keyVersion: data.key_version,
      algorithm: data.algorithm,
    } as EncryptedValue);
    await supabase.from("secrets").update({ last_accessed_at: new Date().toISOString() }).eq("id", id).eq("owner_id", context.userId);
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "secret.revealed",
      targetType: "secret",
      targetId: id,
      metadata: { name: data.name },
    });
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: intent === "copy" ? "vault_secret_copy_authorized" : "vault_secret_reveal_authorized",
      targetType: "secret",
      targetId: id,
      metadata: { name: data.name },
    });
    return Response.json(
      withVaultUnlockStatus(await readVaultUnlockStatus(context.userId), { value, hideAfterSeconds: 15 }),
      { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
    );
  } catch {
    return safeErrorResponse("Secret could not be decrypted.", 500);
  }
}
