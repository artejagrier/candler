import { getWorkspaceContext } from "@/lib/data/workspace";
import { safeErrorResponse } from "@/lib/security/redaction";
import { clearVaultUnlockCookie, readVaultUnlockStatus } from "@/lib/vault/recovery-phrase-store";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  const status = await readVaultUnlockStatus(context.userId);
  return Response.json(status, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}

export async function DELETE() {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  await clearVaultUnlockCookie();
  const status = await readVaultUnlockStatus(context.userId);
  return Response.json(status, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
}
