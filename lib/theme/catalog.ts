import type { SkyPeriod } from "@/lib/utilities/time";

export const MODE_COOKIE = "candler-mode";
export const SHADE_COOKIE = "candler-shade";
export const MODE_STORAGE = "candler.mode";
export const SHADE_STORAGE = "candler.shade";

/** @deprecated Read-only during migration from the split theme + sky system. */
export const THEME_COOKIE = "candler-theme";
export const SKY_COOKIE = "candler-sky";
export const THEME_STORAGE = "candler.theme";
export const SKY_STORAGE = "candler.sky";

export const DEFAULT_MODE = "burgundy";
export const DEFAULT_SHADE = "classic";
export const DEFAULT_THEME = DEFAULT_MODE;

export type ColorModeId =
  | "burgundy"
  | "white"
  | "dark"
  | "pink"
  | "purple"
  | "royal-blue"
  | "blue"
  | "green"
  | "teal"
  | "gray";

export type EnvironmentModeId = "sunrise" | "day" | "sunset" | "night";
export type ModeId = ColorModeId | EnvironmentModeId;
export type ThemeId = ModeId;
export type ModeGroup = "color" | "environment";

export type ColorScheme = "dark" | "light";
export type ThemeTokens = Record<string, string>;

export type ShadeOption = {
  id: string;
  label: string;
  scheme: ColorScheme;
  tokens: ThemeTokens;
};

export type ModeFamily = {
  id: ModeId;
  label: string;
  group: ModeGroup;
  defaultShade: string;
  shades: ShadeOption[];
  skyPeriod: SkyPeriod | null;
};

export type ThemeFamily = ModeFamily;

const SUCCESS = "#7cff4f";
const WARNING = "#fbbf24";
const DANGER = "#f87171";

function withSemantics(tokens: ThemeTokens): ThemeTokens {
  return {
    ...tokens,
    "--workspace-bg": tokens["--workspace-bg"] ?? tokens["--color-ink"],
    "--sidebar-bg": tokens["--sidebar-bg"] ?? tokens["--color-sidebar"],
    "--topbar-bg": tokens["--topbar-bg"] ?? tokens["--color-topbar"],
    "--surface": tokens["--surface"] ?? tokens["--color-surface"] ?? tokens["--color-ink-soft"],
    "--surface-elevated": tokens["--surface-elevated"] ?? tokens["--color-ink-raised"],
    "--surface-muted": tokens["--surface-muted"] ?? tokens["--color-ink-soft"],
    "--text-primary": tokens["--text-primary"] ?? tokens["--color-foreground"],
    "--text-secondary": tokens["--text-secondary"] ?? tokens["--color-text-muted"],
    "--text-muted": tokens["--text-muted"] ?? tokens["--color-text-subtle"],
    "--border": tokens["--border"] ?? tokens["--color-line"],
    "--accent": tokens["--accent"] ?? tokens["--color-accent"],
    "--accent-hover": tokens["--accent-hover"] ?? tokens["--color-accent-bright"],
    "--accent-foreground": tokens["--accent-foreground"] ?? tokens["--color-btn-fg"],
    "--focus": tokens["--focus"] ?? tokens["--color-focus"],
    "--success": tokens["--success"] ?? tokens["--color-success"],
    "--warning": tokens["--warning"] ?? tokens["--color-warning"],
    "--danger": tokens["--danger"] ?? tokens["--color-danger"],
  };
}

function dark(brand: string, brandStrong: string, brandText: string, brandDeep: string, extras: ThemeTokens = {}): ThemeTokens {
  return withSemantics({
    "--color-scheme": "dark",
    "--color-ink": "#070709",
    "--color-ink-soft": "#101014",
    "--color-ink-raised": "#17171e",
    "--color-ink-overlay": "#1c1c25",
    "--color-sidebar": extras["--color-sidebar"] ?? "#121218",
    "--color-topbar": "color-mix(in srgb, var(--color-ink) 88%, transparent)",
    "--color-mist": "#f7f7f8",
    "--color-fog": "#a2a2ae",
    "--color-slate-muted": "#6a6a77",
    "--color-white": "#ffffff",
    "--color-foreground": "#f7f7f8",
    "--color-text": "#f7f7f8",
    "--color-text-muted": "#a2a2ae",
    "--color-text-subtle": "#6a6a77",
    "--color-surface": "color-mix(in srgb, #101014 82%, transparent)",
    "--color-brand": brand,
    "--color-brand-strong": brandStrong,
    "--color-brand-text": brandText,
    "--color-purple": brand,
    "--color-purple-deep": brandDeep,
    "--color-purple-bright": brandStrong,
    "--color-lavender": brandText,
    "--color-green": extras["--color-green"] ?? "#7cff4f",
    "--color-green-bright": extras["--color-green-bright"] ?? "#b7ff2a",
    "--color-green-deep": "#2f5e1b",
    "--color-mint": extras["--color-mint"] ?? "#bef9a6",
    "--color-accent": extras["--color-accent"] ?? brandStrong,
    "--color-accent-bright": extras["--color-accent-bright"] ?? brandText,
    "--color-accent-text": extras["--color-accent-text"] ?? brandText,
    "--color-accent-foreground": extras["--color-accent-foreground"] ?? "#070709",
    "--color-line": "rgb(255 255 255 / 0.08)",
    "--color-line-strong": `color-mix(in srgb, ${brand} 32%, transparent)`,
    "--color-focus": brandStrong,
    "--color-background": "var(--color-ink)",
    "--color-border": "var(--color-line)",
    "--color-border-strong": "var(--color-line-strong)",
    "--color-btn": extras["--color-btn"] ?? brand,
    "--color-btn-fg": extras["--color-btn-fg"] ?? "#ffffff",
    "--color-success": SUCCESS,
    "--color-warning": WARNING,
    "--color-danger": DANGER,
    "--color-info": brandText,
    "--shadow-glow": `0 0 0 1px color-mix(in srgb, ${brand} 22%, transparent), 0 20px 60px -20px color-mix(in srgb, ${brand} 50%, transparent)`,
    "--shadow-glow-sm": `0 0 0 1px color-mix(in srgb, ${brand} 20%, transparent), 0 8px 30px -12px color-mix(in srgb, ${brand} 42%, transparent)`,
    ...extras,
  });
}

function light(brand: string, brandStrong: string, brandText: string, brandDeep: string, extras: ThemeTokens = {}): ThemeTokens {
  return withSemantics({
    "--color-scheme": "light",
    "--color-ink": extras["--color-ink"] ?? "#f7f7f8",
    "--color-ink-soft": "#ffffff",
    "--color-ink-raised": "#ffffff",
    "--color-ink-overlay": "#ffffff",
    "--color-sidebar": extras["--color-sidebar"] ?? "#ffffff",
    "--color-topbar": "color-mix(in srgb, #ffffff 92%, transparent)",
    "--color-mist": "#16161c",
    "--color-fog": "#5c5c68",
    "--color-slate-muted": "#6a6a77",
    "--color-white": "#ffffff",
    "--color-foreground": "#16161c",
    "--color-text": "#16161c",
    "--color-text-muted": "#5c5c68",
    "--color-text-subtle": "#6a6a77",
    "--color-surface": "#ffffff",
    "--color-brand": brand,
    "--color-brand-strong": brandStrong,
    "--color-brand-text": brandText,
    "--color-purple": brand,
    "--color-purple-deep": brandDeep,
    "--color-purple-bright": brandStrong,
    "--color-lavender": brandDeep,
    "--color-green": extras["--color-green"] ?? "#2f7a1c",
    "--color-green-bright": extras["--color-green-bright"] ?? "#3d9a24",
    "--color-green-deep": "#2f5e1b",
    "--color-mint": extras["--color-mint"] ?? "#2f7a1c",
    "--color-accent": extras["--color-accent"] ?? "#2f7a1c",
    "--color-accent-bright": extras["--color-accent-bright"] ?? "#3d9a24",
    "--color-accent-text": extras["--color-accent-text"] ?? "#2f7a1c",
    "--color-accent-foreground": "#f7f7f8",
    "--color-line": "rgb(22 22 28 / 0.12)",
    "--color-line-strong": `color-mix(in srgb, ${brand} 38%, transparent)`,
    "--color-focus": brandStrong,
    "--color-background": "var(--color-ink)",
    "--color-border": "var(--color-line)",
    "--color-border-strong": "var(--color-line-strong)",
    "--color-btn": extras["--color-btn"] ?? brand,
    "--color-btn-fg": extras["--color-btn-fg"] ?? "#ffffff",
    "--color-success": "#2f7a1c",
    "--color-warning": "#b45309",
    "--color-danger": "#dc2626",
    "--color-info": brandDeep,
    "--shadow-glow": `0 0 0 1px color-mix(in srgb, ${brand} 18%, transparent), 0 16px 40px -24px rgb(0 0 0 / 0.18)`,
    "--shadow-glow-sm": `0 0 0 1px color-mix(in srgb, ${brand} 16%, transparent), 0 8px 24px -16px rgb(0 0 0 / 0.12)`,
    ...extras,
  });
}

export const COLOR_MODE_DEFS: Omit<ModeFamily, "group" | "skyPeriod">[] = [
  {
    id: "burgundy",
    label: "Burgundy",
    defaultShade: "classic",
    shades: [
      { id: "deep", label: "Deep Burgundy", scheme: "dark", tokens: dark("#6D1535", "#8B1E4A", "#C84B7A", "#3B0A1E", { "--color-sidebar": "#3B0A1E", "--color-btn": "#B7FF2A", "--color-btn-fg": "#070709", "--color-accent": "#B7FF2A" }) },
      { id: "classic", label: "Classic Burgundy", scheme: "dark", tokens: dark("#8B1E4A", "#9C2457", "#C84B7A", "#54102A", { "--color-sidebar": "#3B0A1E", "--color-btn": "#B7FF2A", "--color-btn-fg": "#070709", "--color-accent": "#B7FF2A" }) },
      { id: "rose", label: "Rose Burgundy", scheme: "dark", tokens: dark("#9C2457", "#C84B7A", "#F0A8C0", "#6D1535", { "--color-sidebar": "#54102A", "--color-btn": "#9EFF32", "--color-btn-fg": "#070709", "--color-accent": "#9EFF32" }) },
    ],
  },
  {
    id: "white",
    label: "White",
    defaultShade: "soft",
    shades: [
      { id: "pure", label: "Pure White", scheme: "light", tokens: light("#7A183C", "#8B1E4A", "#9C2457", "#54102A", { "--color-ink": "#ffffff", "--color-sidebar": "#ffffff" }) },
      { id: "soft", label: "Soft White", scheme: "light", tokens: light("#7A183C", "#8B1E4A", "#9C2457", "#54102A", { "--color-ink": "#f7f7f8", "--color-sidebar": "#f3f3f5" }) },
      { id: "warm", label: "Warm White", scheme: "light", tokens: light("#7A183C", "#8B1E4A", "#9C2457", "#54102A", { "--color-ink": "#faf6f2", "--color-sidebar": "#f4eee8" }) },
    ],
  },
  {
    id: "dark",
    label: "Dark",
    defaultShade: "near",
    shades: [
      { id: "carbon", label: "Carbon", scheme: "dark", tokens: dark("#8B8B96", "#C8C8D0", "#D8D8DE", "#3A3A42", { "--color-sidebar": "#111114", "--color-btn": "#f7f7f8", "--color-btn-fg": "#070709", "--color-accent": "#7cff4f" }) },
      { id: "graphite", label: "Graphite", scheme: "dark", tokens: dark("#9A9AA6", "#D0D0D8", "#E4E4EA", "#2A2A30", { "--color-sidebar": "#16161c", "--color-ink": "#101014", "--color-btn": "#f7f7f8", "--color-btn-fg": "#070709" }) },
      { id: "near", label: "Near Black", scheme: "dark", tokens: dark("#A2A2AE", "#F7F7F8", "#F7F7F8", "#1A1A20", { "--color-sidebar": "#070709", "--color-btn": "#B7FF2A", "--color-btn-fg": "#070709" }) },
    ],
  },
  {
    id: "pink",
    label: "Pink",
    defaultShade: "soft",
    shades: [
      { id: "soft", label: "Soft Pink", scheme: "dark", tokens: dark("#D48AA8", "#E8A8BE", "#F3C9D6", "#7A3A52", { "--color-sidebar": "#1A1014" }) },
      { id: "hot", label: "Hot Pink", scheme: "dark", tokens: dark("#E11D8F", "#F43FA8", "#F9A8D4", "#831843", { "--color-sidebar": "#1A0A14" }) },
      { id: "dusty", label: "Dusty Pink", scheme: "dark", tokens: dark("#B76E79", "#C98B94", "#E4C2C7", "#6B3A42", { "--color-sidebar": "#161012" }) },
      { id: "berry", label: "Berry Pink", scheme: "dark", tokens: dark("#9D174D", "#BE185D", "#F9A8D4", "#500724", { "--color-sidebar": "#1A0810" }) },
    ],
  },
  {
    id: "purple",
    label: "Purple",
    defaultShade: "electric",
    shades: [
      { id: "electric", label: "Electric Purple", scheme: "dark", tokens: dark("#8B5CF6", "#A855F7", "#C4B5FD", "#4C1D95", { "--color-sidebar": "#140F1C" }) },
      { id: "royal", label: "Royal Purple", scheme: "dark", tokens: dark("#6D28D9", "#7C3AED", "#C4B5FD", "#3B0764", { "--color-sidebar": "#12081C" }) },
      { id: "lavender", label: "Lavender Purple", scheme: "dark", tokens: dark("#A78BFA", "#C4B5FD", "#EDE9FE", "#5B21B6", { "--color-sidebar": "#16121F" }) },
      { id: "plum", label: "Deep Plum", scheme: "dark", tokens: dark("#6B21A8", "#7E22CE", "#D8B4FE", "#3B0764", { "--color-sidebar": "#140816" }) },
    ],
  },
  {
    id: "royal-blue",
    label: "Royal Blue",
    defaultShade: "classic",
    shades: [
      { id: "deep", label: "Deep Royal", scheme: "dark", tokens: dark("#1E3A8A", "#1D4ED8", "#93C5FD", "#172554", { "--color-sidebar": "#0B1224" }) },
      { id: "classic", label: "Classic Royal", scheme: "dark", tokens: dark("#2742C7", "#4169E1", "#93C5FD", "#1E3A8A", { "--color-sidebar": "#0E1730" }) },
      { id: "bright", label: "Bright Royal", scheme: "dark", tokens: dark("#4169E1", "#5B7CFF", "#BFDBFE", "#1D4ED8", { "--color-sidebar": "#101A38" }) },
    ],
  },
  {
    id: "blue",
    label: "Blue",
    defaultShade: "classic",
    shades: [
      { id: "classic", label: "Classic Blue", scheme: "dark", tokens: dark("#0000FF", "#3355FF", "#9DB4FF", "#0000AA", { "--color-sidebar": "#070720" }) },
      { id: "deep", label: "Deep Blue", scheme: "dark", tokens: dark("#0033CC", "#1A4DFF", "#8FB0FF", "#001A80", { "--color-sidebar": "#060818" }) },
      { id: "electric", label: "Electric Blue", scheme: "dark", tokens: dark("#2563EB", "#3B82F6", "#93C5FD", "#1E3A8A", { "--color-sidebar": "#0A1224" }) },
      { id: "soft", label: "Soft Blue", scheme: "dark", tokens: dark("#60A5FA", "#93C5FD", "#DBEAFE", "#1D4ED8", { "--color-sidebar": "#101824" }) },
    ],
  },
  {
    id: "green",
    label: "Green",
    defaultShade: "neon",
    shades: [
      { id: "neon", label: "Neon Green", scheme: "dark", tokens: dark("#7CFF4F", "#B7FF2A", "#BEF9A6", "#2F5E1B", { "--color-sidebar": "#0C1408", "--color-btn": "#B7FF2A", "--color-btn-fg": "#070709", "--color-accent": "#B7FF2A" }) },
      { id: "forest", label: "Forest Green", scheme: "dark", tokens: dark("#166534", "#22C55E", "#86EFAC", "#052E16", { "--color-sidebar": "#07140C" }) },
      { id: "emerald", label: "Emerald", scheme: "dark", tokens: dark("#059669", "#10B981", "#6EE7B7", "#064E3B", { "--color-sidebar": "#071410" }) },
    ],
  },
  {
    id: "teal",
    label: "Teal",
    defaultShade: "deep",
    shades: [
      { id: "aqua", label: "Aqua Teal", scheme: "dark", tokens: dark("#2DD4BF", "#5EEAD4", "#99F6E4", "#0F766E", { "--color-sidebar": "#081412" }) },
      { id: "deep", label: "Deep Teal", scheme: "dark", tokens: dark("#0F766E", "#14B8A6", "#5EEAD4", "#134E4A", { "--color-sidebar": "#071210" }) },
      { id: "cyan", label: "Cyan Teal", scheme: "dark", tokens: dark("#06B6D4", "#22D3EE", "#A5F3FC", "#155E75", { "--color-sidebar": "#07141A" }) },
    ],
  },
  {
    id: "gray",
    label: "Gray",
    defaultShade: "neutral",
    shades: [
      { id: "cool", label: "Cool Gray", scheme: "dark", tokens: dark("#94A3B8", "#CBD5E1", "#E2E8F0", "#334155", { "--color-sidebar": "#10141A" }) },
      { id: "neutral", label: "Neutral Gray", scheme: "dark", tokens: dark("#A1A1AA", "#D4D4D8", "#E4E4E7", "#3F3F46", { "--color-sidebar": "#121214" }) },
      { id: "charcoal", label: "Charcoal Gray", scheme: "dark", tokens: dark("#71717A", "#A1A1AA", "#D4D4D8", "#27272A", { "--color-sidebar": "#0C0C0E" }) },
    ],
  },
];

const ENVIRONMENT_MODE_DEFS: ModeFamily[] = [
  {
    id: "sunrise",
    label: "Sunrise",
    group: "environment",
    defaultShade: "canonical",
    skyPeriod: "morning",
    shades: [
      {
        id: "canonical",
        label: "Sunrise",
        scheme: "light",
        tokens: light("#C45C4A", "#D4784A", "#8B3A2A", "#7A2E24", {
          "--color-ink": "#F7EDE4",
          "--color-ink-soft": "#FFF8F2",
          "--color-ink-raised": "#FFFFFF",
          "--color-ink-overlay": "#FFF6EE",
          "--color-sidebar": "#F3D5C0",
          "--color-topbar": "#F7EDE4",
          "--color-mist": "#2A1810",
          "--color-fog": "#6E4A3A",
          "--color-slate-muted": "#8A6A58",
          "--color-foreground": "#2A1810",
          "--color-text": "#2A1810",
          "--color-text-muted": "#6E4A3A",
          "--color-text-subtle": "#8A6A58",
          "--color-surface": "#FFF8F2",
          "--color-btn": "#C45C4A",
          "--color-btn-fg": "#FFF8F2",
          "--color-accent": "#C4893A",
          "--color-line": "rgb(42 24 16 / 0.12)",
        }),
      },
    ],
  },
  {
    id: "day",
    label: "Day",
    group: "environment",
    defaultShade: "canonical",
    skyPeriod: "afternoon",
    shades: [
      {
        id: "canonical",
        label: "Day",
        scheme: "light",
        tokens: light("#1D4ED8", "#2563EB", "#1E3A8A", "#1E3A8A", {
          "--color-ink": "#F5F8FC",
          "--color-ink-soft": "#FFFFFF",
          "--color-ink-raised": "#FFFFFF",
          "--color-ink-overlay": "#FFFFFF",
          "--color-sidebar": "#EEF3F8",
          "--color-topbar": "#F7F9FC",
          "--color-mist": "#152033",
          "--color-fog": "#4A5A70",
          "--color-foreground": "#152033",
          "--color-text": "#152033",
          "--color-text-muted": "#4A5A70",
          "--color-surface": "#FFFFFF",
          "--color-btn": "#1D4ED8",
          "--color-btn-fg": "#FFFFFF",
          "--color-accent": "#2563EB",
          "--color-line": "rgb(21 32 51 / 0.12)",
        }),
      },
    ],
  },
  {
    id: "sunset",
    label: "Sunset",
    group: "environment",
    defaultShade: "canonical",
    skyPeriod: "evening",
    shades: [
      {
        id: "canonical",
        label: "Sunset",
        scheme: "dark",
        tokens: dark("#C84B7A", "#E07A4A", "#F0C4A8", "#4A1830", {
          "--color-ink": "#1A0C12",
          "--color-ink-soft": "#241018",
          "--color-ink-raised": "#2E1520",
          "--color-ink-overlay": "#321820",
          "--color-sidebar": "#3A1524",
          "--color-topbar": "#241018",
          "--color-mist": "#F7EDE4",
          "--color-fog": "#D4B4A4",
          "--color-foreground": "#F7EDE4",
          "--color-text": "#F7EDE4",
          "--color-text-muted": "#D4B4A4",
          "--color-surface": "#241018",
          "--color-btn": "#E07A4A",
          "--color-btn-fg": "#1A0C12",
          "--color-accent": "#E8A05A",
        }),
      },
    ],
  },
  {
    id: "night",
    label: "Night",
    group: "environment",
    defaultShade: "canonical",
    skyPeriod: "night",
    shades: [
      {
        id: "canonical",
        label: "Night",
        scheme: "dark",
        tokens: dark("#8B9DFF", "#A8B4E8", "#C5CCF0", "#1A2040", {
          "--color-ink": "#04040a",
          "--color-ink-soft": "#080C18",
          "--color-ink-raised": "#0E1424",
          "--color-ink-overlay": "#12182A",
          "--color-sidebar": "#070B16",
          "--color-topbar": "#050814",
          "--color-mist": "#E8ECF8",
          "--color-fog": "#A8B0C8",
          "--color-foreground": "#E8ECF8",
          "--color-text": "#E8ECF8",
          "--color-text-muted": "#A8B0C8",
          "--color-surface": "#080C18",
          "--color-btn": "#8B9DFF",
          "--color-btn-fg": "#070B16",
          "--color-accent": "#A8B4E8",
        }),
      },
    ],
  },
];

export const MODE_FAMILIES: ModeFamily[] = [
  ...COLOR_MODE_DEFS.map((family) => ({ ...family, group: "color" as const, skyPeriod: null })),
  ...ENVIRONMENT_MODE_DEFS,
];

export const THEME_FAMILIES = MODE_FAMILIES.filter((family) => family.group === "color");
export const ENVIRONMENT_MODES = MODE_FAMILIES.filter((family) => family.group === "environment");
export const COLOR_MODES = THEME_FAMILIES;

export const SKY_TO_MODE: Record<Exclude<SkyPeriod, never>, EnvironmentModeId> = {
  morning: "sunrise",
  afternoon: "day",
  evening: "sunset",
  night: "night",
};

export function familyById(id: string | null | undefined) {
  return MODE_FAMILIES.find((family) => family.id === id) ?? MODE_FAMILIES[0];
}

export function shadeById(family: ModeFamily, shadeId: string | null | undefined) {
  return family.shades.find((shade) => shade.id === shadeId) ?? family.shades.find((shade) => shade.id === family.defaultShade) ?? family.shades[0];
}

export function resolveAppearance(modeId?: string | null, shadeId?: string | null) {
  const family = familyById(modeId);
  const shade = shadeById(family, shadeId);
  return {
    family,
    shade,
    mode: family.id,
    theme: family.id,
    shadeId: shade.id,
    scheme: shade.scheme,
    tokens: shade.tokens,
    skyPeriod: family.skyPeriod,
    group: family.group,
  };
}

export function isModeId(value: string): value is ModeId {
  return MODE_FAMILIES.some((family) => family.id === value);
}

export function isThemeId(value: string): value is ModeId {
  return isModeId(value);
}

export function supportsShades(modeId: string | null | undefined) {
  return familyById(modeId).group === "color" && familyById(modeId).shades.length > 1;
}
