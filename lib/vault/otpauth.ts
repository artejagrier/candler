/**
 * Client-safe TOTP setup parsing. Does not generate codes and never logs secrets.
 * QR payloads are untrusted: only otpauth://totp with a valid seed is accepted.
 */

export type ParsedTotpSetup = {
  secret: string;
  label: string;
  issuer: string;
  accountName: string;
  algorithm: "SHA1";
  digits: 6;
  period: 30;
};

export const AUTHENTICATOR_UNREADABLE =
  "Candler couldn't read this authenticator setup. Try scanning the QR code again or enter the setup key manually.";
export const AUTHENTICATOR_UNSUPPORTED =
  "This authenticator uses a format Candler doesn't support yet. Use a 6-digit code that refreshes every 30 seconds.";
export const AUTHENTICATOR_BAD_KEY =
  "That setup key doesn't look valid. Check for missing characters and try again.";

const KNOWN_ISSUERS: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  gmail: "Google",
  microsoft: "Microsoft",
  outlook: "Microsoft",
  azure: "Microsoft",
  stripe: "Stripe",
  cloudflare: "Cloudflare",
  supabase: "Supabase",
  vercel: "Vercel",
  aws: "AWS",
  amazon: "AWS",
  discord: "Discord",
  slack: "Slack",
  notion: "Notion",
  linear: "Linear",
  figma: "Figma",
  apple: "Apple",
  openai: "OpenAI",
  anthropic: "Anthropic",
  twitter: "X",
};

export function recognizeIssuer(value: string): { key: string; displayName: string } {
  const trimmed = value.trim();
  if (!trimmed) return { key: "generic", displayName: "Account" };
  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const direct = lookupKnown(normalized);
  if (direct) return direct;
  if (trimmed.includes("@")) {
    const domain = trimmed.split("@")[1]?.split(".")[0] ?? "";
    const fromEmail = lookupKnown(domain.toLowerCase().replace(/[^a-z0-9]+/g, ""));
    if (fromEmail) return fromEmail;
  }
  return { key: "generic", displayName: trimmed };
}

function lookupKnown(normalized: string): { key: string; displayName: string } | null {
  if (!normalized) return null;
  for (const [key, displayName] of Object.entries(KNOWN_ISSUERS)) {
    if (normalized === key) return { key, displayName };
    if (key.length >= 4 && (normalized.includes(key) || normalized.startsWith(key))) {
      return { key, displayName };
    }
  }
  return null;
}

export function issuerInitial(issuer: string) {
  return (issuer.trim()[0] ?? "?").toUpperCase();
}

export function formatTotpCode(code: string) {
  const digits = code.replace(/\s/g, "");
  if (digits.length === 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  if (digits.length === 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return digits;
}

export function normalizeTotpSecret(raw: string) {
  const clean = raw.toUpperCase().replace(/=|\s|-/g, "");
  if (clean.length < 8 || clean.length > 128 || !/^[A-Z2-7]+$/.test(clean)) {
    throw new Error(AUTHENTICATOR_BAD_KEY);
  }
  return clean;
}

export function authenticatorSetupError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message === AUTHENTICATOR_UNREADABLE || message === AUTHENTICATOR_UNSUPPORTED || message === AUTHENTICATOR_BAD_KEY) {
    return message;
  }
  if (/unsupported|algorithm|digits|period/i.test(message)) return AUTHENTICATOR_UNSUPPORTED;
  if (/base32|setup key|secret/i.test(message)) return AUTHENTICATOR_BAD_KEY;
  return AUTHENTICATOR_UNREADABLE;
}

export function parseOtpAuthUri(uri: string): ParsedTotpSetup {
  let parsed: URL;
  try {
    parsed = new URL(uri.trim());
  } catch {
    throw new Error(AUTHENTICATOR_UNREADABLE);
  }
  if (parsed.protocol !== "otpauth:" || parsed.hostname !== "totp") {
    throw new Error(AUTHENTICATOR_UNREADABLE);
  }
  const secretParam = parsed.searchParams.get("secret");
  if (!secretParam) throw new Error(AUTHENTICATOR_UNREADABLE);

  const algorithm = (parsed.searchParams.get("algorithm") ?? "SHA1").toUpperCase().replace("SHA-1", "SHA1");
  const digits = Number(parsed.searchParams.get("digits") ?? 6);
  const period = Number(parsed.searchParams.get("period") ?? 30);
  if (algorithm !== "SHA1" || digits !== 6 || period !== 30) {
    throw new Error(AUTHENTICATOR_UNSUPPORTED);
  }

  const secret = normalizeTotpSecret(secretParam);
  const label = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const issuerParam = parsed.searchParams.get("issuer")?.trim() ?? "";
  let issuer = issuerParam;
  let accountName = label;
  const colon = label.indexOf(":");
  if (colon >= 0) {
    issuer = issuer || label.slice(0, colon);
    accountName = label.slice(colon + 1);
  }
  if (issuer) issuer = recognizeIssuer(issuer).displayName;
  else if (accountName && !accountName.includes("@")) issuer = recognizeIssuer(accountName).displayName;
  else if (accountName.includes("@")) issuer = recognizeIssuer(accountName).displayName;
  accountName = accountName.trim();
  if (!accountName) accountName = issuer;
  return { secret, label, issuer, accountName, algorithm: "SHA1", digits: 6, period: 30 };
}

export function parseTotpSetup(input: { accountName?: string; secret?: string; uri?: string }): ParsedTotpSetup {
  const uri = input.uri?.trim();
  if (uri) return parseOtpAuthUri(uri);
  const secretRaw = input.secret?.trim() ?? "";
  if (secretRaw.toLowerCase().startsWith("otpauth://")) return parseOtpAuthUri(secretRaw);
  const secret = normalizeTotpSecret(secretRaw);
  const typed = (input.accountName ?? "").trim();
  if (!typed) throw new Error("Enter an account name so you can recognize this code later.");
  const recognized = recognizeIssuer(typed);
  const accountName = typed.includes("@") ? typed : recognized.displayName;
  return {
    secret,
    label: typed,
    issuer: recognized.displayName,
    accountName,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  };
}
