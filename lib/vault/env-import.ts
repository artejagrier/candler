export interface EnvEntry { name: string; value: string; serviceName: string; isPublic: boolean }

export const KNOWN_SERVICES = [
  "Stripe", "Supabase", "OpenAI", "Anthropic", "Resend",
  "Vercel", "Cloudflare", "Cloudflare R2", "GitHub", "Paddle", "AWS",
  "Google", "Database", "Redis", "Twilio", "Custom",
] as const;

export function detectService(key: string): string {
  if (/STRIPE/i.test(key)) return "Stripe";
  if (/PADDLE/i.test(key)) return "Paddle";
  if (/SUPABASE/i.test(key)) return "Supabase";
  if (/OPENAI|OPEN_AI/i.test(key)) return "OpenAI";
  if (/ANTHROPIC/i.test(key)) return "Anthropic";
  if (/RESEND/i.test(key)) return "Resend";
  if (/VERCEL/i.test(key)) return "Vercel";
  if (/^R2_/i.test(key)) return "Cloudflare R2";
  if (/CLOUDFLARE|^CF_/i.test(key)) return "Cloudflare";
  if (/GITHUB|^GH_/i.test(key)) return "GitHub";
  if (/^AWS_|AMAZON/i.test(key)) return "AWS";
  if (/^GOOGLE_|^GCP_|FIREBASE/i.test(key)) return "Google";
  if (/DATABASE|POSTGRES|^PG[A-Z_]|^DB_/i.test(key)) return "Database";
  if (/REDIS|UPSTASH/i.test(key)) return "Redis";
  if (/TWILIO/i.test(key)) return "Twilio";
  return "Custom";
}

export function parseEnvFile(text: string): EnvEntry[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const s = line.trim();
      return s.startsWith("export ") ? s.slice(7) : s;
    })
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      const name = line.slice(0, i).trim();
      let raw = line.slice(i + 1);
      if (!/^\s*['"]/.test(raw)) raw = raw.replace(/\s+#.*$/, "");
      const value = raw.trim().replace(/^(['"])(.*)\1$/, "$2");
      return { name, value, serviceName: detectService(name), isPublic: name.startsWith("NEXT_PUBLIC_") || name.startsWith("VITE_") };
    })
    .filter((x) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(x.name) && Boolean(x.value));
}
