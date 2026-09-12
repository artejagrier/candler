import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface EncryptedValue {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
  algorithm: "aes-256-gcm";
}

const ALGORITHM = "aes-256-gcm" as const;

function encryptionKey(): Buffer {
  const encoded = process.env.CANDLER_ENCRYPTION_KEY_V1;
  if (!encoded) throw new Error("Server encryption is not configured.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("CANDLER_ENCRYPTION_KEY_V1 must decode to 32 bytes.");
  return key;
}

/**
 * Cryptographic boundary: plaintext enters only on the trusted server and only
 * ciphertext + nonce + tag + version may be persisted. The key is supplied by
 * the runtime, never Postgres or the browser. V2 should resolve keyVersion via
 * KMS and use envelope encryption without changing callers or stored records.
 */
export function encryptSecret(plaintext: string): EncryptedValue {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: 1,
    algorithm: ALGORITHM,
  };
}

export function decryptSecret(value: EncryptedValue): string {
  if (value.algorithm !== ALGORITHM || value.keyVersion !== 1) {
    throw new Error("Unsupported encrypted value version.");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(value.iv, "base64"));
  decipher.setAuthTag(Buffer.from(value.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
