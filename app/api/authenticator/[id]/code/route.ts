import { getWorkspaceContext } from "@/lib/data/workspace";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret, type EncryptedValue } from "@/lib/security/encryption";
import { generateTotp } from "@/lib/vault/totp";
import { safeErrorResponse } from "@/lib/security/redaction";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("authenticator_entries")
    .select("id,seed_ciphertext,seed_iv,seed_auth_tag,key_version")
    .eq("id", id)
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .maybeSingle();
  if (!data) return safeErrorResponse("Authenticator not found.", 404);
  try {
    const seed = decryptSecret({
      ciphertext: data.seed_ciphertext,
      iv: data.seed_iv,
      authTag: data.seed_auth_tag,
      keyVersion: data.key_version,
      algorithm: "aes-256-gcm",
    } as EncryptedValue);
    const now = Date.now();
    const code = generateTotp(seed, now);
    return Response.json(
      { code, validFor: 30 - Math.floor(now / 1000) % 30 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return safeErrorResponse("Code could not be generated.", 500);
  }
}
