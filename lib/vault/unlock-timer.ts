/**
 * Client-safe Vault unlock countdown helpers.
 * Remaining time is derived from the server grant's expiresAt; this never extends authorization.
 */

export const VAULT_UNLOCK_TTL_SECONDS = 5 * 60;
export const VAULT_UNLOCK_WINDOW_MS = VAULT_UNLOCK_TTL_SECONDS * 1000;
export const VAULT_UNLOCK_ENDING_MS = 30_000;

export type VaultUnlockStatusPayload = {
  unlocked: boolean;
  expiresAt: number | null;
  remainingSeconds: number;
  serverNow: number;
  ttlSeconds: number;
};

export function remainingUnlockMs(expiresAtSeconds: number, nowMs: number) {
  return Math.max(0, expiresAtSeconds * 1000 - nowMs);
}

export function alignedNowMs(serverNow: number, capturedClientNow: number, clientNow = Date.now()) {
  return clientNow + (serverNow - capturedClientNow);
}

export function remainingUnlockMsFromStatus(
  status: Pick<VaultUnlockStatusPayload, "expiresAt" | "serverNow">,
  capturedClientNow: number,
  clientNow = Date.now(),
) {
  if (!status.expiresAt) return 0;
  return remainingUnlockMs(status.expiresAt, alignedNowMs(status.serverNow, capturedClientNow, clientNow));
}

export function formatUnlockCountdown(remainingMs: number) {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function unlockProgressPercent(remainingMs: number, windowMs = VAULT_UNLOCK_WINDOW_MS) {
  if (windowMs <= 0) return 0;
  return Math.max(0, Math.min(100, (remainingMs / windowMs) * 100));
}

export function isUnlockEndingSoon(remainingMs: number) {
  return remainingMs > 0 && remainingMs <= VAULT_UNLOCK_ENDING_MS;
}

export function readUnlockExpiresAt(body: { unlockExpiresAt?: unknown }) {
  return typeof body.unlockExpiresAt === "number" && Number.isFinite(body.unlockExpiresAt) && body.unlockExpiresAt > 0
    ? Math.floor(body.unlockExpiresAt)
    : null;
}
