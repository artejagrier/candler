import { createHmac } from "node:crypto";

/**
 * Deterministic, non-reversible identifier for a TOTP seed.
 * Used only for duplicate detection. The HMAC output cannot recover the seed.
 */
export function totpSeedFingerprint(secret: string): string {
  const encoded = process.env.CANDLER_ENCRYPTION_KEY_V1;
  if (!encoded) throw new Error("Server encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("CANDLER_ENCRYPTION_KEY_V1 must decode to 32 bytes.");
  const normalized = secret.toUpperCase().replace(/=|\s|-/g, "");
  return createHmac("sha256", key)
    .update("candler.authenticator.seed.v1:")
    .update(normalized)
    .digest("base64url");
}
