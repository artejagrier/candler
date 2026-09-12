import { z } from "zod";
import { hasRecentAuthentication } from "@/lib/data/auth";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret, type EncryptedValue } from "@/lib/security/encryption";
import { emitAuditEvent } from "@/lib/audit/events";
import { safeErrorResponse } from "@/lib/security/redaction";

async function load(id: string, userId: string, workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recovery_code_sets")
    .select("id,service,codes_ciphertext,codes_iv,codes_auth_tag,key_version,total_count,remaining_count")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();
  return { data, supabase };
}

function reauth() {
  return Response.json({ error: "Confirm your password or complete MFA before revealing recovery codes.", code: "REAUTH_REQUIRED" }, { status: 403 });
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  if (!(await hasRecentAuthentication())) return reauth();
  const { id } = await params;
  const { data } = await load(id, context.userId, context.workspaceId);
  if (!data) return safeErrorResponse("Recovery set not found.", 404);
  try {
    const codes = JSON.parse(decryptSecret({
      ciphertext: data.codes_ciphertext,
      iv: data.codes_iv,
      authTag: data.codes_auth_tag,
      keyVersion: data.key_version,
      algorithm: "aes-256-gcm",
    } as EncryptedValue)) as (string | null)[];
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "recovery.revealed",
      targetType: "recovery_set",
      targetId: id,
      metadata: { service: data.service, remaining: data.remaining_count },
    });
    return Response.json({ codes, hideAfterSeconds: 15 }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return safeErrorResponse("Recovery codes could not be decrypted.", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  if (!(await hasRecentAuthentication())) return reauth();
  const { id } = await params;
  const index = z.object({ index: z.number().int().nonnegative() }).parse(await request.json()).index;
  const { data, supabase } = await load(id, context.userId, context.workspaceId);
  if (!data) return safeErrorResponse("Recovery set not found.", 404);
  try {
    const codes = JSON.parse(decryptSecret({
      ciphertext: data.codes_ciphertext,
      iv: data.codes_iv,
      authTag: data.codes_auth_tag,
      keyVersion: data.key_version,
      algorithm: "aes-256-gcm",
    } as EncryptedValue)) as (string | null)[];
    if (index >= codes.length || codes[index] === null) return safeErrorResponse("Code is already used or unavailable.", 409);
    codes[index] = null;
    const encrypted = encryptSecret(JSON.stringify(codes));
    const remaining = codes.filter(Boolean).length;
    const { error } = await supabase.from("recovery_code_sets").update({
      codes_ciphertext: encrypted.ciphertext,
      codes_iv: encrypted.iv,
      codes_auth_tag: encrypted.authTag,
      key_version: encrypted.keyVersion,
      remaining_count: remaining,
      updated_at: new Date().toISOString(),
    }).eq("id", id).eq("owner_id", context.userId);
    if (error) throw new Error();
    await emitAuditEvent({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      eventType: "recovery.code_used",
      targetType: "recovery_set",
      targetId: id,
      metadata: { service: data.service, remaining },
    });
    return Response.json({ remaining });
  } catch {
    return safeErrorResponse("Code could not be marked used.", 500);
  }
}
