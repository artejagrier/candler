import { detectService, parseEnvFile, type EnvEntry } from "./env-import";
import { parseYamlConfig } from "./yaml-import";

export type ImportSource = "paste" | "file" | "screenshot";

export function detectEnvironmentFromFilename(filename: string): string | null {
  const lower = filename.toLowerCase();
  if (/\.prod(uction)?(\.|$)/.test(lower) || lower.endsWith(".prod")) return "Production";
  if (/\.dev(elopment)?(\.|$)/.test(lower)) return "Development";
  if (/\.stag(ing|e)?(\.|$)/.test(lower)) return "Staging";
  if (/\.test(\.|$)/.test(lower)) return "Test";
  if (/\.preview(\.|$)/.test(lower)) return "Preview";
  return null;
}

export function detectImportFormat(text: string): "env" | "json" | "yaml" | "unknown" {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{")) return "json";
  if (trimmed.includes("=")) return "env";
  // YAML: uppercase-or-underscore key followed by ": " and a non-empty value
  if (/^[A-Za-z_][A-Za-z0-9_]*:\s+\S/m.test(trimmed)) return "yaml";
  return "unknown";
}

const SAFE_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const BANNED_PROTO_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function parseJsonConfig(text: string): EnvEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const obj = parsed as Record<string, unknown>;
  const entries: EnvEntry[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (BANNED_PROTO_KEYS.has(key)) continue;
    if (!SAFE_KEY.test(key)) continue;
    if (typeof val !== "string" || !val) continue;
    entries.push({
      name: key,
      value: val,
      serviceName: detectService(key),
      isPublic: key.startsWith("NEXT_PUBLIC_") || key.startsWith("VITE_"),
    });
  }
  return entries.length ? entries : null;
}

export function parseImportText(text: string): EnvEntry[] {
  const format = detectImportFormat(text);
  if (format === "json") {
    const json = parseJsonConfig(text);
    if (json) return json;
  }
  if (format === "yaml") {
    const yaml = parseYamlConfig(text);
    if (yaml) return yaml;
  }
  return parseEnvFile(text);
}
