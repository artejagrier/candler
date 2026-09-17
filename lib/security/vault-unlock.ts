import { createHmac, timingSafeEqual } from "node:crypto";
import { VAULT_UNLOCK_TTL_SECONDS } from "../vault/unlock-timer";

export const VAULT_UNLOCK_COOKIE = "candler_vault_unlock";
export { VAULT_UNLOCK_TTL_SECONDS };

function hmacKey(): Buffer {
  const encoded = process.env.CANDLER_ENCRYPTION_KEY_V1;
  if (!encoded) throw new Error("Server encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("CANDLER_ENCRYPTION_KEY_V1 must decode to 32 bytes.");
  return key;
}

export function createVaultUnlockToken(userId: string, nowSeconds = Math.floor(Date.now() / 1000), ttlSeconds = VAULT_UNLOCK_TTL_SECONDS, key = hmacKey()): string {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Invalid user id.");
  const exp = nowSeconds + ttlSeconds;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", key).update(`vault-unlock.${payload}`).digest("hex");
  return `${payload}.${sig}`;
}

export function inspectVaultUnlockToken(
  token: string | undefined,
  userId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  key = hmacKey(),
): { ok: true; expiresAt: number } | { ok: false } {
  if (!token) return { ok: false };
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return { ok: false };
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const [id, expRaw] = payload.split(".");
  const exp = Number(expRaw);
  if (id !== userId || !Number.isFinite(exp) || exp <= nowSeconds) return { ok: false };
  const expected = createHmac("sha256", key).update(`vault-unlock.${payload}`).digest("hex");
  const left = Buffer.from(sig, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.length !== right.length || !timingSafeEqual(left, right)) return { ok: false };
  return { ok: true, expiresAt: exp };
}

export function verifyVaultUnlockToken(token: string | undefined, userId: string, nowSeconds = Math.floor(Date.now() / 1000), key = hmacKey()): boolean {
  return inspectVaultUnlockToken(token, userId, nowSeconds, key).ok;
}
