export const SECRET_TYPES = [
  { id: "api_key", label: "API Key" },
  { id: "env_var", label: "Environment Variable" },
  { id: "access_token", label: "Access Token" },
  { id: "database", label: "Database Credential" },
  { id: "password", label: "Password / Secret" },
  { id: "webhook", label: "Webhook Secret" },
  { id: "private_key", label: "Private Key" },
  { id: "custom", label: "Custom" },
] as const;

export type SecretTypeId = (typeof SECRET_TYPES)[number]["id"];

export const SECRET_TYPE_IDS = SECRET_TYPES.map((item) => item.id) as [SecretTypeId, ...SecretTypeId[]];

export const SECRET_PROVIDERS = [
  "OpenAI",
  "Supabase",
  "GitHub",
  "Cloudflare",
  "Paddle",
  "Vercel",
  "Custom",
] as const;

export type SecretTypeHelp = {
  nameExample: string;
  keyExample: string;
  valuePlaceholder: string;
  provider: string;
};

export const SECRET_TYPE_HELP: Record<SecretTypeId, SecretTypeHelp> = {
  api_key: {
    nameExample: "OpenAI Production API Key",
    keyExample: "OPENAI_API_KEY",
    valuePlaceholder: "sk-proj-••••••••••••••••",
    provider: "OpenAI",
  },
  env_var: {
    nameExample: "NEXT_PUBLIC_SUPABASE_URL",
    keyExample: "NEXT_PUBLIC_SUPABASE_URL",
    valuePlaceholder: "https://example.supabase.co",
    provider: "Supabase",
  },
  access_token: {
    nameExample: "GitHub Deployment Token",
    keyExample: "GITHUB_TOKEN",
    valuePlaceholder: "ghp_••••••••••••••••",
    provider: "GitHub",
  },
  database: {
    nameExample: "Production Database",
    keyExample: "DATABASE_URL",
    valuePlaceholder: "postgresql://user:••••••••@host:5432/db",
    provider: "Custom",
  },
  password: {
    nameExample: "Production Service Credential",
    keyExample: "APP_SECRET",
    valuePlaceholder: "••••••••••••••••••",
    provider: "Custom",
  },
  webhook: {
    nameExample: "Paddle Webhook Secret",
    keyExample: "PADDLE_WEBHOOK_SECRET",
    valuePlaceholder: "whsec_••••••••••••",
    provider: "Paddle",
  },
  private_key: {
    nameExample: "Cloudflare R2 Access Key",
    keyExample: "R2_ACCESS_KEY_ID",
    valuePlaceholder: "••••••••••••••••••",
    provider: "Cloudflare",
  },
  custom: {
    nameExample: "Production Service Credential",
    keyExample: "SERVICE_CREDENTIAL",
    valuePlaceholder: "••••••••••••••••••",
    provider: "Custom",
  },
};

export const COMMON_PROVIDER_EXAMPLES = [
  { provider: "OpenAI", keys: ["OPENAI_API_KEY"] },
  { provider: "Supabase", keys: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY"] },
  { provider: "Paddle", keys: ["PADDLE_API_KEY", "PADDLE_WEBHOOK_SECRET"] },
  { provider: "Cloudflare / R2", keys: ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] },
  { provider: "GitHub", keys: ["GITHUB_TOKEN"] },
  { provider: "Vercel", keys: ["VERCEL_TOKEN"] },
  { provider: "Database", keys: ["DATABASE_URL"] },
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function optionalUuid(value: unknown): string | null {
  const text = emptyToNull(value);
  if (!text) return null;
  return UUID_RE.test(text) ? text : null;
}

export function isSecretTypeId(value: string): value is SecretTypeId {
  return SECRET_TYPE_IDS.includes(value as SecretTypeId);
}

const SERVICE_PROVIDERS = new Set(["github", "supabase", "stripe", "vercel", "cloudflare", "openai", "anthropic", "resend"]);

export function serviceProviderForName(serviceName: string) {
  const lower = serviceName.trim().toLowerCase();
  if (lower === "cloudflare r2" || lower.startsWith("cloudflare")) return "cloudflare";
  if (SERVICE_PROVIDERS.has(lower)) return lower;
  return "custom";
}

export function parseCreateSecretInput(raw: {
  projectId?: unknown;
  environmentId?: unknown;
  serviceName?: unknown;
  name?: unknown;
  label?: unknown;
  value?: unknown;
  secretType?: unknown;
  notes?: unknown;
}) {
  const projectId = String(raw.projectId ?? "").trim();
  if (!UUID_RE.test(projectId)) throw new Error("Choose a project before saving.");
  const environmentRaw = emptyToNull(raw.environmentId);
  if (environmentRaw && !UUID_RE.test(environmentRaw)) throw new Error("Choose a valid environment before saving.");
  const keyName = String(raw.name ?? "").trim();
  if (!keyName) throw new Error("Enter a key / variable name.");
  if (keyName.length > 120) throw new Error("Key / variable name is too long.");
  const value = String(raw.value ?? "");
  if (!value.trim()) throw new Error("Paste the secret value before saving.");
  if (value.length > 65536) throw new Error("Secret value is too large.");
  const secretTypeRaw = String(raw.secretType ?? "api_key").trim() || "api_key";
  const secretType = isSecretTypeId(secretTypeRaw) ? secretTypeRaw : "custom";
  const serviceName = String(raw.serviceName ?? "").trim() || SECRET_TYPE_HELP[secretType].provider;
  if (!serviceName) throw new Error("Choose a provider.");
  if (serviceName.length > 80) throw new Error("Provider name is too long.");
  const label = emptyToNull(raw.label);
  const notes = emptyToNull(raw.notes);
  if (notes && notes.length > 4000) throw new Error("Notes are too long.");
  return {
    projectId,
    environmentId: environmentRaw && UUID_RE.test(environmentRaw) ? environmentRaw : null,
    serviceName,
    name: keyName,
    label,
    value,
    secretType,
    notes,
  };
}
