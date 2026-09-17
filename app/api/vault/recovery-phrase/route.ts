import { z } from "zod";
import { getWorkspaceContext } from "@/lib/data/workspace";
import { safeErrorResponse } from "@/lib/security/redaction";
import {
  createVaultRecoveryPhrase,
  hasVaultRecoveryPhrase,
  readVaultUnlockStatus,
  withVaultUnlockStatus,
} from "@/lib/vault/recovery-phrase-store";
import { RECOVERY_PHRASE_MAX } from "@/lib/vault/recovery-phrase";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  const configured = await hasVaultRecoveryPhrase(context.userId);
  return Response.json({ configured }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);
  try {
    const body = z.object({
      phrase: z.string().max(RECOVERY_PHRASE_MAX),
      confirm: z.string().max(RECOVERY_PHRASE_MAX),
    }).parse(await request.json());
    const result = await createVaultRecoveryPhrase({
      userId: context.userId,
      workspaceId: context.workspaceId,
      phrase: body.phrase,
      confirm: body.confirm,
    });
    if (!result.ok) return safeErrorResponse(result.error, result.status);
    return Response.json(
      withVaultUnlockStatus(await readVaultUnlockStatus(context.userId), { ok: true, protected: true }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return safeErrorResponse("Vault Phrase could not be saved.", 400);
  }
}
