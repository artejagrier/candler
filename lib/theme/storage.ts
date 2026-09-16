import {
  ACCENT_COOKIE,
  ACCENT_IDS,
  ACCENT_STORAGE,
  APPEARANCE_COOKIE,
  APPEARANCE_STORAGE,
  DEFAULT_ACCENT,
  DEFAULT_APPEARANCE,
  MODE_COOKIE,
  MODE_STORAGE,
  SHADE_COOKIE,
  SHADE_STORAGE,
  SKY_COOKIE,
  SKY_STORAGE,
  SURFACE_TOKENS,
  THEME_COOKIE,
  THEME_STORAGE,
  accentTokens,
  migrateStoredPreferences,
  type AccentId,
  type AppearanceId,
} from "@/lib/theme/catalog";

export function readCookie(source: string | undefined, name: string) {
  if (!source) return "";
  const match = source.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function expireCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function writeAppearance(appearance: string, accent: string) {
  const resolved = migrateStoredPreferences({ appearance, accent });
  const year = 60 * 60 * 24 * 365;
  document.cookie = `${APPEARANCE_COOKIE}=${encodeURIComponent(resolved.appearance)}; Path=/; Max-Age=${year}; SameSite=Lax`;
  document.cookie = `${ACCENT_COOKIE}=${encodeURIComponent(resolved.accent)}; Path=/; Max-Age=${year}; SameSite=Lax`;
  expireCookie(MODE_COOKIE);
  expireCookie(SHADE_COOKIE);
  expireCookie(THEME_COOKIE);
  expireCookie(SKY_COOKIE);
  try {
    localStorage.setItem(APPEARANCE_STORAGE, resolved.appearance);
    localStorage.setItem(ACCENT_STORAGE, resolved.accent);
    localStorage.removeItem(MODE_STORAGE);
    localStorage.removeItem(SHADE_STORAGE);
    localStorage.removeItem(THEME_STORAGE);
    localStorage.removeItem(SKY_STORAGE);
  } catch {
    // Private mode can block storage; cookies still persist this browser.
  }
  notifyAppearance();
}

const APPEARANCE_EVENT = "candler-appearance";
let appearanceSnapshot: { appearance: AppearanceId; accent: AccentId } | null = null;

export function getAppearanceSnapshot() {
  const stored = readStoredAppearance();
  if (
    appearanceSnapshot &&
    appearanceSnapshot.appearance === stored.appearance &&
    appearanceSnapshot.accent === stored.accent
  ) {
    return appearanceSnapshot;
  }
  appearanceSnapshot = { appearance: stored.appearance, accent: stored.accent };
  return appearanceSnapshot;
}

export function subscribeAppearance(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(APPEARANCE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(APPEARANCE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function notifyAppearance() {
  appearanceSnapshot = null;
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}

function readRawAppearance() {
  const cookie = typeof document === "undefined" ? "" : document.cookie;
  const readLs = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return "";
    }
  };
  return {
    appearance: readCookie(cookie, APPEARANCE_COOKIE) || readLs(APPEARANCE_STORAGE),
    accent: readCookie(cookie, ACCENT_COOKIE) || readLs(ACCENT_STORAGE),
    mode: readCookie(cookie, MODE_COOKIE) || readLs(MODE_STORAGE),
    theme: readCookie(cookie, THEME_COOKIE) || readLs(THEME_STORAGE),
    shade: readCookie(cookie, SHADE_COOKIE) || readLs(SHADE_STORAGE),
    sky: readCookie(cookie, SKY_COOKIE) || readLs(SKY_STORAGE),
  };
}

export function readStoredAppearance() {
  return migrateStoredPreferences(readRawAppearance());
}

export function applyAppearanceToDocument(appearance: string, accent: string) {
  const resolved = migrateStoredPreferences({ appearance, accent });
  const root = document.documentElement;
  root.dataset.appearance = resolved.appearance;
  root.dataset.accent = resolved.accent;
  root.dataset.scheme = resolved.scheme;
  delete root.dataset.mode;
  delete root.dataset.theme;
  delete root.dataset.themeShade;
  delete root.dataset.skyPeriod;
  root.style.colorScheme = resolved.scheme;
  for (const [key, value] of Object.entries(resolved.tokens)) {
    root.style.setProperty(key, value);
  }
}

export const applyModeToDocument = applyAppearanceToDocument;
export const applyThemeToDocument = applyAppearanceToDocument;

const TOKEN_PACK = {
  surfaces: SURFACE_TOKENS,
  accents: Object.fromEntries(
    ACCENT_IDS.map((id) => [
      id,
      {
        dark: accentTokens("dark", id),
        light: accentTokens("light", id),
      },
    ]),
  ),
};

const LIGHT_LEGACY = ["white", "day"];
const ACCENT_LEGACY: Record<string, AccentId> = {
  burgundy: "burgundy",
  pink: "hot-pink",
  purple: "purple",
  "royal-blue": "blue",
  blue: "blue",
  green: "neon-green",
};
const SKY_TO_LEGACY: Record<string, string> = {
  morning: "night",
  afternoon: "day",
  evening: "night",
  night: "night",
};

export const THEME_BOOT_SCRIPT = `(function(){try{var P=${JSON.stringify(TOKEN_PACK)};var LIGHT=${JSON.stringify(LIGHT_LEGACY)};var AMAP=${JSON.stringify(ACCENT_LEGACY)};var SKY=${JSON.stringify(SKY_TO_LEGACY)};var c=document.cookie||"";function g(n){var m=c.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));return m?decodeURIComponent(m[1]):""}function ls(k){try{return localStorage.getItem(k)||""}catch(e){return ""}}function isApp(v){return v==="light"||v==="dark"}function isAcc(v){return !!P.accents[v]}var appearance=g("${APPEARANCE_COOKIE}")||ls("${APPEARANCE_STORAGE}");var accent=g("${ACCENT_COOKIE}")||ls("${ACCENT_STORAGE}");if(!isApp(appearance)||!isAcc(accent)){var mode=g("${MODE_COOKIE}")||ls("${MODE_STORAGE}");var sky=g("${SKY_COOKIE}")||ls("${SKY_STORAGE}");var theme=g("${THEME_COOKIE}")||ls("${THEME_STORAGE}");var legacy=mode||(sky&&sky!=="auto"&&SKY[sky])||theme||"";if(!isApp(appearance))appearance=LIGHT.indexOf(legacy)>=0?"light":"${DEFAULT_APPEARANCE}";if(!isAcc(accent))accent=AMAP[legacy]||"${DEFAULT_ACCENT}";}if(!isApp(appearance))appearance="${DEFAULT_APPEARANCE}";if(!isAcc(accent))accent="${DEFAULT_ACCENT}";var surf=P.surfaces[appearance]||P.surfaces.${DEFAULT_APPEARANCE};var acc=(P.accents[accent]||P.accents["${DEFAULT_ACCENT}"])[appearance];var root=document.documentElement;root.setAttribute("data-appearance",appearance);root.setAttribute("data-accent",accent);root.setAttribute("data-scheme",appearance);root.style.colorScheme=appearance;root.removeAttribute("data-mode");root.removeAttribute("data-theme");root.removeAttribute("data-theme-shade");root.removeAttribute("data-sky-period");function apply(tok){if(!tok)return;for(var k in tok)root.style.setProperty(k,tok[k])}apply(surf);apply(acc);if(!g("${APPEARANCE_COOKIE}")||!g("${ACCENT_COOKIE}")){var y=60*60*24*365;document.cookie="${APPEARANCE_COOKIE}="+encodeURIComponent(appearance)+"; Path=/; Max-Age="+y+"; SameSite=Lax";document.cookie="${ACCENT_COOKIE}="+encodeURIComponent(accent)+"; Path=/; Max-Age="+y+"; SameSite=Lax";["${MODE_COOKIE}","${SHADE_COOKIE}","${THEME_COOKIE}","${SKY_COOKIE}"].forEach(function(n){document.cookie=n+"=; Path=/; Max-Age=0; SameSite=Lax"});try{localStorage.setItem("${APPEARANCE_STORAGE}",appearance);localStorage.setItem("${ACCENT_STORAGE}",accent);["${MODE_STORAGE}","${SHADE_STORAGE}","${THEME_STORAGE}","${SKY_STORAGE}"].forEach(function(k){localStorage.removeItem(k)})}catch(e){}}}catch(e){}})();`;

export function canHoverPreview() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
