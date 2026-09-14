/**
 * Vault UI copy and search helpers. Never include secret values.
 */

export type VaultPendingAuth = { id: string; intent: "reveal" | "copy" };

export function vaultSearchHaystack(row: {
  name: string;
  notes?: string | null;
  services?: { name: string } | null;
  projects?: { name: string } | null;
  environments?: { name: string } | null;
}) {
  return [row.name, row.services?.name, row.projects?.name, row.environments?.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function vaultUserError(fallback: string, error?: string, status?: number) {
  if (status === 401) return "Authentication required.";
  if (status === 403) return error?.includes("password") || error?.includes("MFA")
    ? (error ?? "Authentication required.")
    : "Authentication required.";
  if (status === 404) return "You do not have access to this secret.";
  const text = (error ?? "").trim();
  if (/decrypt/i.test(text)) return "Secret could not be decrypted.";
  if (/authentication required/i.test(text)) return "Authentication required.";
  if (/not found|workspace unavailable|not have access/i.test(text)) return "You do not have access to this secret.";
  if (text && text.length < 90 && !/stack|cipher|sql|supabase|token|key_version/i.test(text)) return text;
  return fallback;
}
