import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { createClient } from "@/lib/supabase/server";

/**
 * MFA recovery (backup) codes.
 *
 * Supabase's native MFA is TOTP-only and has no built-in backup codes, so this
 * implements them honestly: codes are generated server-side, shown to the user
 * exactly once, and only *salted scrypt hashes* are persisted — never the plain
 * codes. Storage lives in the `auth_recovery_codes` table (see
 * supabase/migrations/0001_auth_recovery_codes.sql) behind Row Level Security,
 * so a user can only ever read/verify their own codes.
 */

// Crockford-ish alphabet minus visually ambiguous characters (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_COUNT = 10;
const GROUP = 5;
const TABLE = "auth_recovery_codes";

export interface StoredHash {
  salt: string;
  code_hash: string;
}

/** Generate human-friendly one-time codes like `AB3KM-QR9TZ`. */
export function generatePlainCodes(count: number = CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const bytes = randomBytes(GROUP * 2);
    const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join(
      "",
    );
    codes.push(`${chars.slice(0, GROUP)}-${chars.slice(GROUP)}`);
  }
  return codes;
}

/** Strip formatting so "ab3km-qr9tz" and "AB3KMQR9TZ" compare equal. */
function normalize(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function hash(code: string, salt: string): string {
  return scryptSync(normalize(code), salt, 32).toString("hex");
}

function hashOne(code: string): StoredHash {
  const salt = randomBytes(16).toString("hex");
  return { salt, code_hash: hash(code, salt) };
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * Replace any existing recovery codes for the current user with a fresh set.
 * Returns the plain codes so the caller can display them once; only hashes are
 * stored. Runs as the signed-in user (RLS enforces ownership).
 */
export async function regenerateRecoveryCodes(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const plain = generatePlainCodes();
  const rows = plain.map((code) => ({ user_id: user.id, ...hashOne(code) }));

  // Clear old codes, then insert the new batch.
  await supabase.from(TABLE).delete().eq("user_id", user.id);
  const { error } = await supabase.from(TABLE).insert(rows);
  if (error) throw new Error(error.message);

  return plain;
}

/**
 * Verify a submitted recovery code against the user's unused codes and, on a
 * match, consume it (single-use). Constant-time comparison per candidate.
 */
export async function verifyAndConsumeRecoveryCode(
  input: string,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: rows, error } = await supabase
    .from(TABLE)
    .select("id, salt, code_hash")
    .eq("user_id", user.id)
    .is("used_at", null);
  if (error || !rows) return false;

  for (const row of rows) {
    const candidate = hash(input, row.salt);
    if (safeEqualHex(candidate, row.code_hash)) {
      await supabase
        .from(TABLE)
        .update({ used_at: new Date().toISOString() })
        .eq("id", row.id);
      return true;
    }
  }
  return false;
}

/** How many unused recovery codes remain, for the security dashboard. */
export async function countUnusedRecoveryCodes(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("used_at", null);
  return count ?? 0;
}
