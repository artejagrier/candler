import "server-only";

import { cookies } from "next/headers";
import { emitAuditEvent } from "@/lib/audit/events";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  VAULT_UNLOCK_COOKIE,
  VAULT_UNLOCK_TTL_SECONDS,
  createVaultUnlockToken,
  inspectVaultUnlockToken,
} from "@/lib/security/vault-unlock";
import {
  VAULT_PHRASE_CONFIRM,
  VAULT_PHRASE_EXISTS,
  VAULT_PHRASE_LENGTH,
  VAULT_PHRASE_MISMATCH,
  VAULT_PHRASE_SAVE_FAILED,
  VAULT_PHRASE_SETUP_REQUIRED,
  VAULT_PHRASE_THROTTLED,
  VAULT_PHRASE_UNLOCK_REQUIRED,
  confirmVaultRecoveryPhrases,
  hashVaultRecoveryPhrase,
  isValidVaultRecoveryPhrase,
  lockDurationMs,
  verifyVaultRecoveryPhraseHash,
  type RecoveryPhraseHash,
} from "@/lib/vault/recovery-phrase";
import { type VaultUnlockStatusPayload } from "@/lib/vault/unlock-timer";

export type VaultPhraseIntent = "reveal" | "copy" | "seed" | "recovery";

export type VaultPhraseGateFailure = {
  ok: false;
  status: 403 | 429;
  code: "PHRASE_SETUP_REQUIRED" | "UNLOCK_REQUIRED" | "PHRASE_MISMATCH" | "PHRASE_THROTTLED";
  error: string;
};

export type VaultPhraseGateSuccess = { ok: true; expiresAt: number };

type PhraseRow = {
  user_id: string;
  phrase_hash: string;
  salt: string;
  kdf: string;
  kdf_n: number;
  kdf_r: number;
  kdf_p: number;
  failed_attempts: number;
  locked_until: string | null;
};

function storedHash(row: PhraseRow): RecoveryPhraseHash {
  return {
    hash: row.phrase_hash,
    salt: row.salt,
    kdf: "scrypt",
    N: row.kdf_n,
    r: row.kdf_r,
    p: row.kdf_p,
  };
}

async function loadPhraseRow(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vault_recovery_phrases")
    .select("user_id,phrase_hash,salt,kdf,kdf_n,kdf_r,kdf_p,failed_attempts,locked_until")
    .eq("user_id", userId)
    .maybeSingle();
  return { admin, row: (data as PhraseRow | null) ?? null };
}

export async function hasVaultRecoveryPhrase(userId: string) {
  try {
    const { row } = await loadPhraseRow(userId);
    return Boolean(row);
  } catch {
    return false;
  }
}

function unlockCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function lockedUnlockStatus(serverNow = Date.now()): VaultUnlockStatusPayload {
  return {
    unlocked: false,
    expiresAt: null,
    remainingSeconds: 0,
    serverNow,
    ttlSeconds: VAULT_UNLOCK_TTL_SECONDS,
  };
}

export async function grantVaultUnlockCookie(userId: string) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const token = createVaultUnlockToken(userId, nowSeconds, VAULT_UNLOCK_TTL_SECONDS);
  (await cookies()).set(VAULT_UNLOCK_COOKIE, token, unlockCookieOptions(VAULT_UNLOCK_TTL_SECONDS));
  return nowSeconds + VAULT_UNLOCK_TTL_SECONDS;
}

export async function clearVaultUnlockCookie() {
  (await cookies()).set(VAULT_UNLOCK_COOKIE, "", unlockCookieOptions(0));
}

export async function readVaultUnlockStatus(userId: string): Promise<VaultUnlockStatusPayload> {
  const serverNow = Date.now();
  try {
    const token = (await cookies()).get(VAULT_UNLOCK_COOKIE)?.value;
    const inspected = inspectVaultUnlockToken(token, userId, Math.floor(serverNow / 1000));
    if (!inspected.ok) return lockedUnlockStatus(serverNow);
    return {
      unlocked: true,
      expiresAt: inspected.expiresAt,
      remainingSeconds: Math.max(0, inspected.expiresAt - Math.floor(serverNow / 1000)),
      serverNow,
      ttlSeconds: VAULT_UNLOCK_TTL_SECONDS,
    };
  } catch {
    return lockedUnlockStatus(serverNow);
  }
}

export async function hasVaultUnlockGrant(userId: string) {
  return (await readVaultUnlockStatus(userId)).unlocked;
}

export function withVaultUnlockStatus<T extends Record<string, unknown>>(status: VaultUnlockStatusPayload, payload: T) {
  return {
    ...payload,
    unlockExpiresAt: status.expiresAt,
    unlockRemainingSeconds: status.remainingSeconds,
    unlockServerNow: status.serverNow,
  };
}

export async function createVaultRecoveryPhrase(input: {
  userId: string;
  workspaceId: string;
  phrase: string;
  confirm: string;
}) {
  if (!confirmVaultRecoveryPhrases(input.phrase, input.confirm)) {
    if (!isValidVaultRecoveryPhrase(input.phrase) || !isValidVaultRecoveryPhrase(input.confirm)) {
      return { ok: false as const, status: 400, error: VAULT_PHRASE_LENGTH };
    }
    return { ok: false as const, status: 400, error: VAULT_PHRASE_CONFIRM };
  }
  const { admin, row } = await loadPhraseRow(input.userId);
  if (row) {
    return { ok: false as const, status: 409, error: VAULT_PHRASE_EXISTS };
  }
  const hashed = hashVaultRecoveryPhrase(input.phrase);
  const { error } = await admin.from("vault_recovery_phrases").insert({
    user_id: input.userId,
    phrase_hash: hashed.hash,
    salt: hashed.salt,
    kdf: hashed.kdf,
    kdf_n: hashed.N,
    kdf_r: hashed.r,
    kdf_p: hashed.p,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false as const, status: 409, error: VAULT_PHRASE_EXISTS };
    }
    throw new Error(VAULT_PHRASE_SAVE_FAILED);
  }
  await emitAuditEvent({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    eventType: "vault_recovery_phrase_created",
    targetType: "vault",
    targetId: input.userId,
    metadata: {},
  });
  const expiresAt = await grantVaultUnlockCookie(input.userId);
  return { ok: true as const, expiresAt };
}

export async function authorizeVaultSecretAccess(input: {
  userId: string;
  workspaceId: string;
  phrase?: string | null;
  intent: VaultPhraseIntent;
}): Promise<VaultPhraseGateSuccess | VaultPhraseGateFailure> {
  const existing = await readVaultUnlockStatus(input.userId);
  if (existing.unlocked && existing.expiresAt) {
    return { ok: true, expiresAt: existing.expiresAt };
  }

  let row: PhraseRow | null = null;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    const loaded = await loadPhraseRow(input.userId);
    admin = loaded.admin;
    row = loaded.row;
  } catch {
    return { ok: false, status: 403, code: "PHRASE_SETUP_REQUIRED", error: VAULT_PHRASE_SETUP_REQUIRED };
  }

  if (!row) {
    return { ok: false, status: 403, code: "PHRASE_SETUP_REQUIRED", error: VAULT_PHRASE_SETUP_REQUIRED };
  }

  if (row.locked_until && Date.parse(row.locked_until) > Date.now()) {
    return { ok: false, status: 429, code: "PHRASE_THROTTLED", error: VAULT_PHRASE_THROTTLED };
  }

  const submitted = typeof input.phrase === "string" ? input.phrase : "";
  if (!submitted) {
    return { ok: false, status: 403, code: "UNLOCK_REQUIRED", error: VAULT_PHRASE_UNLOCK_REQUIRED };
  }

  const matched = verifyVaultRecoveryPhraseHash(submitted, storedHash(row));
  if (!matched) {
    const failedAttempts = (row.failed_attempts ?? 0) + 1;
    const lockMs = lockDurationMs(failedAttempts);
    await admin.from("vault_recovery_phrases").update({
      failed_attempts: failedAttempts,
      locked_until: lockMs ? new Date(Date.now() + lockMs).toISOString() : row.locked_until,
      updated_at: new Date().toISOString(),
    }).eq("user_id", input.userId);
    await emitAuditEvent({
      workspaceId: input.workspaceId,
      actorId: input.userId,
      eventType: "vault_recovery_phrase_verification_failed",
      targetType: "vault",
      targetId: input.userId,
      metadata: { intent: input.intent },
    });
    if (lockMs) {
      return { ok: false, status: 429, code: "PHRASE_THROTTLED", error: VAULT_PHRASE_THROTTLED };
    }
    return { ok: false, status: 403, code: "PHRASE_MISMATCH", error: VAULT_PHRASE_MISMATCH };
  }

  await admin.from("vault_recovery_phrases").update({
    failed_attempts: 0,
    locked_until: null,
    last_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("user_id", input.userId);
  const expiresAt = await grantVaultUnlockCookie(input.userId);
  return { ok: true, expiresAt };
}

export function vaultPhraseGateResponse(result: VaultPhraseGateFailure) {
  return Response.json(
    { error: result.error, code: result.code },
    {
      status: result.status,
      headers: result.code === "PHRASE_THROTTLED" ? { "Retry-After": "60" } : undefined,
    },
  );
}

export async function parseJsonObject(request: Request) {
  try {
    const text = await request.text();
    if (!text.trim()) return {} as Record<string, unknown>;
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, unknown>;
    return value as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export function readSubmittedPhrase(body: Record<string, unknown>) {
  return typeof body.recoveryPhrase === "string" ? body.recoveryPhrase : "";
}

export function readPhraseIntent(body: Record<string, unknown>, fallback: VaultPhraseIntent): VaultPhraseIntent {
  const intent = body.intent;
  if (intent === "reveal" || intent === "copy" || intent === "seed" || intent === "recovery") return intent;
  return fallback;
}
