import {
  DEFAULT_MODE,
  MODE_COOKIE,
  MODE_FAMILIES,
  MODE_STORAGE,
  SHADE_COOKIE,
  SHADE_STORAGE,
  SKY_COOKIE,
  SKY_STORAGE,
  SKY_TO_MODE,
  THEME_COOKIE,
  THEME_STORAGE,
  isModeId,
  resolveAppearance,
  type ModeId,
} from "@/lib/theme/catalog";
import type { SkyPeriod } from "@/lib/utilities/time";

export function readCookie(source: string | undefined, name: string) {
  if (!source) return "";
  const match = source.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

export function migrateStoredMode(input: {
  mode?: string | null;
  theme?: string | null;
  shade?: string | null;
  sky?: string | null;
}) {
  if (input.mode && isModeId(input.mode)) {
    const resolved = resolveAppearance(input.mode, input.shade);
    return { mode: resolved.mode, shade: resolved.shadeId, scheme: resolved.scheme, tokens: resolved.tokens, skyPeriod: resolved.skyPeriod, group: resolved.group };
  }
  if (input.sky && input.sky !== "auto" && input.sky in SKY_TO_MODE) {
    const mode = SKY_TO_MODE[input.sky as SkyPeriod];
    const resolved = resolveAppearance(mode);
    return { mode: resolved.mode, shade: resolved.shadeId, scheme: resolved.scheme, tokens: resolved.tokens, skyPeriod: resolved.skyPeriod, group: resolved.group };
  }
  const resolved = resolveAppearance(input.theme, input.shade);
  return { mode: resolved.mode, shade: resolved.shadeId, scheme: resolved.scheme, tokens: resolved.tokens, skyPeriod: resolved.skyPeriod, group: resolved.group };
}

export function parseStoredTheme(theme?: string | null, shade?: string | null) {
  const resolved = resolveAppearance(theme, shade);
  return { theme: resolved.mode, mode: resolved.mode, shade: resolved.shadeId, scheme: resolved.scheme, tokens: resolved.tokens };
}

function expireCookie(name: string) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function writeAppearance(mode: string, shade: string) {
  const resolved = resolveAppearance(mode, shade);
  const year = 60 * 60 * 24 * 365;
  document.cookie = `${MODE_COOKIE}=${encodeURIComponent(resolved.mode)}; Path=/; Max-Age=${year}; SameSite=Lax`;
  document.cookie = `${SHADE_COOKIE}=${encodeURIComponent(resolved.shadeId)}; Path=/; Max-Age=${year}; SameSite=Lax`;
  expireCookie(THEME_COOKIE);
  expireCookie(SKY_COOKIE);
  try {
    localStorage.setItem(MODE_STORAGE, resolved.mode);
    localStorage.setItem(SHADE_STORAGE, resolved.shadeId);
    localStorage.removeItem(THEME_STORAGE);
    localStorage.removeItem(SKY_STORAGE);
  } catch {
    // Private mode can block storage; cookies still persist this browser.
  }
  notifyAppearance();
}

const APPEARANCE_EVENT = "candler-appearance";
let appearanceSnapshot: { mode: ModeId; shade: string; skyPeriod: SkyPeriod | null } | null = null;

export function getAppearanceSnapshot() {
  const stored = readStoredAppearance();
  if (
    appearanceSnapshot &&
    appearanceSnapshot.mode === stored.mode &&
    appearanceSnapshot.shade === stored.shade &&
    appearanceSnapshot.skyPeriod === stored.skyPeriod
  ) {
    return appearanceSnapshot;
  }
  appearanceSnapshot = { mode: stored.mode, shade: stored.shade, skyPeriod: stored.skyPeriod };
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
    mode: readCookie(cookie, MODE_COOKIE) || readLs(MODE_STORAGE),
    theme: readCookie(cookie, THEME_COOKIE) || readLs(THEME_STORAGE),
    shade: readCookie(cookie, SHADE_COOKIE) || readLs(SHADE_STORAGE),
    sky: readCookie(cookie, SKY_COOKIE) || readLs(SKY_STORAGE),
  };
}

export function readStoredAppearance() {
  return migrateStoredMode(readRawAppearance());
}

export function applyModeToDocument(mode: string, shade: string) {
  const resolved = resolveAppearance(mode, shade);
  const root = document.documentElement;
  root.dataset.mode = resolved.mode;
  root.dataset.theme = resolved.mode;
  root.dataset.themeShade = resolved.shadeId;
  root.dataset.scheme = resolved.scheme;
  if (resolved.skyPeriod) root.dataset.skyPeriod = resolved.skyPeriod;
  else delete root.dataset.skyPeriod;
  root.style.colorScheme = resolved.scheme;
  for (const [key, value] of Object.entries(resolved.tokens)) {
    root.style.setProperty(key, value);
  }
}

export const applyThemeToDocument = applyModeToDocument;

const MODE_TOKEN_MAP = Object.fromEntries(
  MODE_FAMILIES.map((family) => [
    family.id,
    Object.fromEntries(
      family.shades.map((shade) => [
        shade.id,
        { scheme: shade.scheme, tokens: shade.tokens, sky: family.skyPeriod, defaultShade: family.defaultShade },
      ]),
    ),
  ]),
);

export const THEME_BOOT_SCRIPT = `(function(){try{var M=${JSON.stringify(MODE_TOKEN_MAP)};var SKYMAP=${JSON.stringify(SKY_TO_MODE)};var c=document.cookie||"";function g(n){var m=c.match(new RegExp("(?:^|; )"+n+"=([^;]*)"));return m?decodeURIComponent(m[1]):"";}function ls(k){try{return localStorage.getItem(k)||""}catch(e){return ""}}var mode=g("${MODE_COOKIE}")||ls("${MODE_STORAGE}");var shade=g("${SHADE_COOKIE}")||ls("${SHADE_STORAGE}");if(!mode){var sky=g("${SKY_COOKIE}")||ls("${SKY_STORAGE}");var theme=g("${THEME_COOKIE}")||ls("${THEME_STORAGE}");mode=SKYMAP[sky]||theme||"${DEFAULT_MODE}";}var fam=M[mode]||M["${DEFAULT_MODE}"];var pack=fam[shade]||fam[Object.keys(fam)[0]];var root=document.documentElement;root.setAttribute("data-mode",mode);root.setAttribute("data-theme",mode);root.setAttribute("data-theme-shade",pack&&pack.defaultShade?shade||Object.keys(fam)[0]:shade||"");if(pack){root.setAttribute("data-scheme",pack.scheme);root.style.colorScheme=pack.scheme;if(pack.sky)root.setAttribute("data-sky-period",pack.sky);else root.removeAttribute("data-sky-period");var tok=pack.tokens;for(var k in tok)root.style.setProperty(k,tok[k]);}}catch(e){}})();`;

export function canHoverPreview() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}
