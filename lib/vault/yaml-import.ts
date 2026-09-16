import { detectService, type EnvEntry } from "./env-import";

const SAFE_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const BANNED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Parses flat YAML key-value configs into Vault entries.
 * Handles only single-level string values. Nested mappings, lists,
 * block scalars, and anchors are intentionally skipped.
 */
export function parseYamlConfig(text: string): EnvEntry[] | null {
  const entries: EnvEntry[] = [];

  for (const raw of text.split(/\r?\n/)) {
    // Skip blank lines, comments, YAML doc markers, and indented/continuation lines
    if (!raw || /^\s/.test(raw) || raw.startsWith("#") || raw === "---" || raw === "...") continue;

    const line = raw.trim();
    const colonIdx = line.indexOf(":");
    if (colonIdx < 1) continue;

    const key = line.slice(0, colonIdx).trim();
    const afterColon = line.slice(colonIdx + 1).trim();

    if (!SAFE_KEY.test(key) || BANNED_KEYS.has(key)) continue;
    // Skip empty / null / block-scalar / nested-mapping / list markers
    if (!afterColon || afterColon === "~" || /^null$/i.test(afterColon)) continue;
    if (afterColon === "|" || afterColon === ">" || afterColon.endsWith(":")) continue;
    if (afterColon.startsWith("[") || afterColon.startsWith("{")) continue;

    const value = afterColon.replace(/^(['"])(.*)\1$/, "$2").trim();
    if (!value) continue;

    entries.push({
      name: key,
      value,
      serviceName: detectService(key),
      isPublic: key.startsWith("NEXT_PUBLIC_") || key.startsWith("VITE_"),
    });
  }

  return entries.length ? entries : null;
}
