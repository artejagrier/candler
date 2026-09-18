/**
 * Vault UI copy and search helpers. Never include secret values.
 */

export type VaultPendingAuth = { id: string; intent: "reveal" | "copy" };

export function vaultSearchHaystack(row: {
  name: string;
  notes?: string | null;
  tags?: string[] | null;
  services?: { name: string } | null;
  projects?: { name: string } | null;
  environments?: { name: string } | null;
}) {
  return [row.name, ...(row.tags ?? []), row.services?.name, row.projects?.name, row.environments?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function vaultUserError(fallback: string, error?: string, status?: number) {
  if (status === 401) return "Authentication required.";
  if (status === 403) {
    if (error?.includes("Vault Phrase") || error?.includes("Recovery Phrase")) return error;
    if (error?.includes("password") || error?.includes("MFA")) return error ?? "Authentication required.";
    return "Authentication required.";
  }
  if (status === 429 && error?.includes("attempts")) return error;
  if (status === 404) return "You do not have access to this secret.";
  const text = (error ?? "").trim();
  if (/decrypt/i.test(text)) return "Secret could not be decrypted.";
  if (/authentication required/i.test(text)) return "Authentication required.";
  if (/not found|workspace unavailable|not have access/i.test(text)) return "You do not have access to this secret.";
  if (text && text.length < 90 && !/stack|cipher|sql|supabase|token|key_version/i.test(text)) return text;
  return fallback;
}

const SAVE_INTERNALS = /stack|cipher|sql|supabase|token|key_version|zod|audit event/i;

export function vaultSaveError(error?: unknown) {
  const text = (error instanceof Error ? error.message : typeof error === "string" ? error : "").trim();
  if (/choose a project/i.test(text) || /project not found/i.test(text)) return "Choose a project before saving.";
  if (/valid environment/i.test(text) || /environment not found/i.test(text)) return "Choose a valid environment before saving.";
  if (/key \/ variable name/i.test(text) || /enter a key/i.test(text)) return "Enter a key / variable name.";
  if (/paste the secret value/i.test(text) || /secret value is too large/i.test(text)) {
    return text.length < 90 ? text : "Paste the actual key, token, password, or secret here.";
  }
  if (/choose a provider/i.test(text) || /provider name is too long/i.test(text)) return text;
  if (/notes are too long/i.test(text)) return "Notes are too long.";
  if (/authentication required/i.test(text)) return "Authentication required.";
  if (text && text.length < 90 && !SAVE_INTERNALS.test(text)) return text;
  return "Couldn't save this secret. Please try again.";
}

export function vaultSecretDisplayName(row: { name: string; tags?: string[] | null }) {
  const label = row.tags?.[0]?.trim();
  return label || row.name;
}
