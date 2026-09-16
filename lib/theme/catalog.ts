export const APPEARANCE_COOKIE = "candler-appearance";
export const ACCENT_COOKIE = "candler-accent";
export const APPEARANCE_STORAGE = "candler.appearance";
export const ACCENT_STORAGE = "candler.accent";

/** @deprecated Read-only during migration from the old mode/shade/sky system. */
export const MODE_COOKIE = "candler-mode";
export const SHADE_COOKIE = "candler-shade";
export const THEME_COOKIE = "candler-theme";
export const SKY_COOKIE = "candler-sky";
export const MODE_STORAGE = "candler.mode";
export const SHADE_STORAGE = "candler.shade";
export const THEME_STORAGE = "candler.theme";
export const SKY_STORAGE = "candler.sky";

export const DEFAULT_APPEARANCE = "dark" as const;
export const DEFAULT_ACCENT = "neon-green" as const;

export type AppearanceId = "light" | "dark";
export type AccentId =
  | "neon-green"
  | "purple"
  | "burgundy"
  | "blue"
  | "hot-pink"
  | "light-pink"
  | "red"
  | "orange"
  | "yellow";

export type ColorScheme = AppearanceId;
export type ThemeTokens = Record<string, string>;

export type AccentOption = {
  id: AccentId;
  label: string;
  hex: string;
};

export const ACCENT_CATALOG: readonly AccentOption[] = [
  { id: "neon-green", label: "Neon Green", hex: "#B7FF2A" },
  { id: "purple", label: "Purple", hex: "#8B5CF6" },
  { id: "burgundy", label: "Burgundy", hex: "#8B1E4A" },
  { id: "blue", label: "Blue", hex: "#0000FF" },
  { id: "hot-pink", label: "Hot Pink", hex: "#FF2D95" },
  { id: "light-pink", label: "Light Pink", hex: "#FF9BCB" },
  { id: "red", label: "Red", hex: "#FF3B30" },
  { id: "orange", label: "Orange", hex: "#FF7A00" },
  { id: "yellow", label: "Yellow", hex: "#FFD60A" },
] as const;

export const ACCENT_IDS = ACCENT_CATALOG.map((item) => item.id);

const ACCENT_BY_ID = Object.fromEntries(ACCENT_CATALOG.map((item) => [item.id, item])) as Record<
  AccentId,
  AccentOption
>;

const LIGHT_LEGACY_MODES = new Set(["white", "day"]);

const LEGACY_ACCENT: Record<string, AccentId> = {
  burgundy: "burgundy",
  pink: "hot-pink",
  purple: "purple",
  "royal-blue": "blue",
  blue: "blue",
  green: "neon-green",
};

const SKY_TO_LEGACY: Record<string, string> = {
  morning: "sunrise",
  afternoon: "day",
  evening: "sunset",
  night: "night",
};

const SUCCESS_DARK = "#7cff4f";
const WARNING_DARK = "#fbbf24";
const DANGER_DARK = "#f87171";
const INFO_DARK = "#60A5FA";
const SUCCESS_LIGHT = "#2f7a1c";
const WARNING_LIGHT = "#b45309";
const DANGER_LIGHT = "#dc2626";
const INFO_LIGHT = "#2563EB";

function parseHex(hex: string) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

export function mixHex(a: string, b: string, amount: number) {
  const left = parseHex(a);
  const right = parseHex(b);
  return toHex(
    left.r + (right.r - left.r) * amount,
    left.g + (right.g - left.g) * amount,
    left.b + (right.b - left.b) * amount,
  );
}

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string) {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(a: string, b: string) {
  const left = relativeLuminance(a);
  const right = relativeLuminance(b);
  const [hi, lo] = left > right ? [left, right] : [right, left];
  return (hi + 0.05) / (lo + 0.05);
}

export function pickForeground(background: string, dark = "#0A0A0A", light = "#FFFFFF") {
  return contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;
}

export function readableOn(color: string, surface: string, toward: string, minimum = 4.5) {
  if (contrastRatio(color, surface) >= minimum) return color;
  let amount = 0.08;
  let current = color;
  while (amount <= 1 && contrastRatio(current, surface) < minimum) {
    current = mixHex(color, toward, amount);
    amount += 0.08;
  }
  return current;
}

function darkSurfaces(): ThemeTokens {
  return {
    "--color-scheme": "dark",
    "--background": "#0A0A0A",
    "--workspace-bg": "#0A0A0A",
    "--surface": "#111111",
    "--surface-elevated": "#151515",
    "--surface-muted": "#191919",
    "--sidebar": "#111111",
    "--sidebar-bg": "#111111",
    "--topbar": "#0A0A0A",
    "--topbar-bg": "#0A0A0A",
    "--text-primary": "#FFFFFF",
    "--text-secondary": "#A3A3A3",
    "--text-muted": "#737373",
    "--border": "#262626",
    "--color-ink": "#0A0A0A",
    "--color-ink-soft": "#111111",
    "--color-ink-raised": "#151515",
    "--color-ink-overlay": "#191919",
    "--color-sidebar": "#111111",
    "--color-topbar": "#0A0A0A",
    "--color-mist": "#FFFFFF",
    "--color-fog": "#A3A3A3",
    "--color-slate-muted": "#737373",
    "--color-white": "#ffffff",
    "--color-foreground": "#FFFFFF",
    "--color-text": "#FFFFFF",
    "--color-text-muted": "#A3A3A3",
    "--color-text-subtle": "#737373",
    "--color-surface": "#111111",
    "--color-surface-raised": "#151515",
    "--color-surface-overlay": "#191919",
    "--color-surface-muted": "#191919",
    "--color-background": "#0A0A0A",
    "--color-line": "#262626",
    "--color-border": "#262626",
    "--color-success": SUCCESS_DARK,
    "--color-warning": WARNING_DARK,
    "--color-danger": DANGER_DARK,
    "--color-info": INFO_DARK,
    "--success": SUCCESS_DARK,
    "--warning": WARNING_DARK,
    "--danger": DANGER_DARK,
    "--color-green": SUCCESS_DARK,
    "--color-green-bright": "#b7ff2a",
    "--color-green-deep": "#2f5e1b",
    "--color-mint": "#bef9a6",
  };
}

function lightSurfaces(): ThemeTokens {
  return {
    "--color-scheme": "light",
    "--background": "#FFFFFF",
    "--workspace-bg": "#FFFFFF",
    "--surface": "#FAFAFA",
    "--surface-elevated": "#FFFFFF",
    "--surface-muted": "#F5F5F5",
    "--sidebar": "#FAFAFA",
    "--sidebar-bg": "#FAFAFA",
    "--topbar": "#FFFFFF",
    "--topbar-bg": "#FFFFFF",
    "--text-primary": "#111111",
    "--text-secondary": "#5F6368",
    "--text-muted": "#5F6368",
    "--border": "#E5E5E5",
    "--color-ink": "#FFFFFF",
    "--color-ink-soft": "#FAFAFA",
    "--color-ink-raised": "#FFFFFF",
    "--color-ink-overlay": "#FFFFFF",
    "--color-sidebar": "#FAFAFA",
    "--color-topbar": "#FFFFFF",
    "--color-mist": "#111111",
    "--color-fog": "#5F6368",
    "--color-slate-muted": "#5F6368",
    "--color-white": "#ffffff",
    "--color-foreground": "#111111",
    "--color-text": "#111111",
    "--color-text-muted": "#5F6368",
    "--color-text-subtle": "#737373",
    "--color-surface": "#FAFAFA",
    "--color-surface-raised": "#FFFFFF",
    "--color-surface-overlay": "#FFFFFF",
    "--color-surface-muted": "#F5F5F5",
    "--color-background": "#FFFFFF",
    "--color-line": "#E5E5E5",
    "--color-border": "#E5E5E5",
    "--color-success": SUCCESS_LIGHT,
    "--color-warning": WARNING_LIGHT,
    "--color-danger": DANGER_LIGHT,
    "--color-info": INFO_LIGHT,
    "--success": SUCCESS_LIGHT,
    "--warning": WARNING_LIGHT,
    "--danger": DANGER_LIGHT,
    "--color-green": SUCCESS_LIGHT,
    "--color-green-bright": "#3d9a24",
    "--color-green-deep": "#2f5e1b",
    "--color-mint": "#2f7a1c",
  };
}

export function accentTokens(appearance: AppearanceId, accentId: AccentId): ThemeTokens {
  const hex = ACCENT_BY_ID[accentId].hex;
  const dark = appearance === "dark";
  const surface = dark ? "#0A0A0A" : "#FFFFFF";
  const toward = dark ? "#FFFFFF" : "#0A0A0A";
  const foreground = pickForeground(hex);
  const text = readableOn(hex, surface, toward);
  const hover = dark ? mixHex(hex, "#FFFFFF", 0.14) : mixHex(hex, "#000000", 0.12);
  const muted = `color-mix(in srgb, ${hex} ${dark ? 18 : 14}%, transparent)`;
  const lineStrong = `color-mix(in srgb, ${hex} ${dark ? 32 : 38}%, transparent)`;
  const deep = mixHex(hex, "#000000", 0.45);

  return {
    "--accent": hex,
    "--accent-hover": hover,
    "--accent-foreground": foreground,
    "--accent-text": text,
    "--accent-muted": muted,
    "--focus-ring": hex,
    "--focus": hex,
    "--color-focus": hex,
    "--color-accent": hex,
    "--color-accent-bright": hover,
    "--color-accent-text": text,
    "--color-accent-foreground": foreground,
    "--color-btn": hex,
    "--color-btn-fg": foreground,
    "--color-brand": hex,
    "--color-brand-strong": hover,
    "--color-brand-text": text,
    "--color-purple": hex,
    "--color-purple-bright": hover,
    "--color-purple-deep": deep,
    "--color-lavender": text,
    "--color-line-strong": lineStrong,
    "--color-border-strong": lineStrong,
    "--shadow-glow": dark
      ? `0 0 0 1px color-mix(in srgb, ${hex} 22%, transparent), 0 20px 60px -20px color-mix(in srgb, ${hex} 42%, transparent)`
      : `0 0 0 1px color-mix(in srgb, ${hex} 18%, transparent), 0 16px 40px -24px rgb(0 0 0 / 0.14)`,
    "--shadow-glow-sm": dark
      ? `0 0 0 1px color-mix(in srgb, ${hex} 20%, transparent), 0 8px 30px -12px color-mix(in srgb, ${hex} 36%, transparent)`
      : `0 0 0 1px color-mix(in srgb, ${hex} 16%, transparent), 0 8px 24px -16px rgb(0 0 0 / 0.1)`,
  };
}

export const SURFACE_TOKENS: Record<AppearanceId, ThemeTokens> = {
  dark: darkSurfaces(),
  light: lightSurfaces(),
};

export function isAppearanceId(value: string | null | undefined): value is AppearanceId {
  return value === "light" || value === "dark";
}

export function isAccentId(value: string | null | undefined): value is AccentId {
  return Boolean(value && value in ACCENT_BY_ID);
}

export function accentById(id: string | null | undefined) {
  return ACCENT_BY_ID[isAccentId(id) ? id : DEFAULT_ACCENT];
}

export function resolveAppearance(appearance?: string | null, accent?: string | null) {
  const scheme: AppearanceId = isAppearanceId(appearance) ? appearance : DEFAULT_APPEARANCE;
  const accentId: AccentId = isAccentId(accent) ? accent : DEFAULT_ACCENT;
  return {
    appearance: scheme,
    accent: accentId,
    scheme,
    tokens: {
      ...SURFACE_TOKENS[scheme],
      ...accentTokens(scheme, accentId),
    },
  };
}

export function migrateStoredPreferences(input: {
  appearance?: string | null;
  accent?: string | null;
  mode?: string | null;
  theme?: string | null;
  shade?: string | null;
  sky?: string | null;
}) {
  const appearanceFromNew = isAppearanceId(input.appearance) ? input.appearance : null;
  const accentFromNew = isAccentId(input.accent) ? input.accent : null;

  const legacyId =
    (input.mode && input.mode.trim()) ||
    (input.sky && input.sky !== "auto" && SKY_TO_LEGACY[input.sky] ? SKY_TO_LEGACY[input.sky] : "") ||
    (input.theme && input.theme.trim()) ||
    "";

  const appearance =
    appearanceFromNew ?? (legacyId && LIGHT_LEGACY_MODES.has(legacyId) ? "light" : DEFAULT_APPEARANCE);
  const accent = accentFromNew ?? (legacyId ? LEGACY_ACCENT[legacyId] ?? DEFAULT_ACCENT : DEFAULT_ACCENT);

  return resolveAppearance(appearance, accent);
}

/** @deprecated Use migrateStoredPreferences. */
export const migrateStoredMode = migrateStoredPreferences;
