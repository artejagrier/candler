import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";

import {
  ACCENT_CATALOG,
  ACCENT_IDS,
  DEFAULT_ACCENT,
  DEFAULT_APPEARANCE,
  accentById,
  contrastRatio,
  migrateStoredPreferences,
  resolveAppearance,
  type AccentId,
  type AppearanceId,
} from "../lib/theme/catalog";
import { THEME_BOOT_SCRIPT } from "../lib/theme/storage";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/product/ProductShell.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../app/(product)/app/settings/page.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const appearance = readFileSync(new URL("../components/theme/AppearanceSettings.tsx", import.meta.url), "utf8");
const wordmark = readFileSync(new URL("../components/brand/Wordmark.tsx", import.meta.url), "utf8");
const swatches = readFileSync(new URL("../components/theme/AccentSwatches.tsx", import.meta.url), "utf8");
const toggle = readFileSync(new URL("../components/theme/AppearanceToggle.tsx", import.meta.url), "utf8");

const APPEARANCES: AppearanceId[] = ["light", "dark"];

test("default appearance is dark with neon green accent", () => {
  assert.equal(DEFAULT_APPEARANCE, "dark");
  assert.equal(DEFAULT_ACCENT, "neon-green");
  const resolved = resolveAppearance();
  assert.equal(resolved.appearance, "dark");
  assert.equal(resolved.accent, "neon-green");
  assert.equal(resolved.scheme, "dark");
  assert.equal(resolved.tokens["--background"]?.toUpperCase(), "#000000");
  assert.equal(resolved.tokens["--sidebar-bg"]?.toUpperCase(), "#000000");
  assert.equal(resolved.tokens["--workspace-bg"]?.toUpperCase(), "#000000");
  assert.equal(resolved.tokens["--topbar-bg"]?.toUpperCase(), "#000000");
  assert.equal(resolved.tokens["--accent"]?.toUpperCase(), "#B7FF2A");
  assert.equal(resolved.tokens["--accent-foreground"]?.toUpperCase(), "#0A0A0A");
});

test("catalog has exactly nine accents with the requested hex values", () => {
  assert.deepEqual(
    ACCENT_CATALOG.map((item) => [item.id, item.hex.toUpperCase()]),
    [
      ["neon-green", "#B7FF2A"],
      ["purple", "#8B5CF6"],
      ["burgundy", "#8B1E4A"],
      ["blue", "#0000FF"],
      ["hot-pink", "#FF2D95"],
      ["light-pink", "#FF9BCB"],
      ["red", "#FF3B30"],
      ["orange", "#FF7A00"],
      ["yellow", "#FFD60A"],
    ],
  );
  assert.equal(accentById("purple").label, "Purple");
});

test("light and dark surfaces stay genuine and independent of accent", () => {
  const darkGreen = resolveAppearance("dark", "neon-green");
  const darkPink = resolveAppearance("dark", "hot-pink");
  const lightGreen = resolveAppearance("light", "neon-green");
  assert.equal(darkGreen.tokens["--workspace-bg"], darkPink.tokens["--workspace-bg"]);
  assert.equal(darkGreen.tokens["--sidebar-bg"], darkPink.tokens["--sidebar-bg"]);
  assert.equal(lightGreen.tokens["--workspace-bg"]?.toUpperCase(), "#FFFFFF");
  assert.equal(lightGreen.tokens["--surface-muted"]?.toUpperCase(), "#F5F5F5");
  assert.equal(lightGreen.tokens["--text-primary"]?.toUpperCase(), "#111111");
  assert.equal(lightGreen.tokens["--border"]?.toUpperCase(), "#E5E5E5");
  assert.notEqual(darkGreen.tokens["--accent"], darkPink.tokens["--accent"]);
  assert.notEqual(lightGreen.tokens["--workspace-bg"], darkGreen.tokens["--workspace-bg"]);
});

test("every appearance + accent combination keeps readable buttons and accent text", () => {
  for (const appearance of APPEARANCES) {
    for (const accent of ACCENT_IDS) {
      const tokens = resolveAppearance(appearance, accent).tokens;
      const buttonContrast = contrastRatio(tokens["--accent"], tokens["--accent-foreground"]);
      const textContrast = contrastRatio(tokens["--accent-text"], tokens["--background"]);
      assert.ok(buttonContrast >= 3, `${appearance} ${accent} button contrast ${buttonContrast}`);
      assert.ok(textContrast >= 4.5, `${appearance} ${accent} accent text contrast ${textContrast}`);
    }
  }
});

test("high-risk accent combinations stay identifiable and readable", () => {
  const cases: Array<[AppearanceId, AccentId]> = [
    ["light", "yellow"],
    ["light", "light-pink"],
    ["light", "neon-green"],
    ["dark", "burgundy"],
    ["dark", "blue"],
  ];
  for (const [appearance, accent] of cases) {
    const tokens = resolveAppearance(appearance, accent).tokens;
    assert.ok(contrastRatio(tokens["--accent"], tokens["--accent-foreground"]) >= 3, `${appearance} ${accent}`);
    assert.ok(contrastRatio(tokens["--accent-text"], tokens["--background"]) >= 4.5, `${appearance} ${accent} text`);
    assert.equal(tokens["--accent"]?.toUpperCase(), accentById(accent).hex.toUpperCase());
  }
});

test("status semantics stay green / amber / red across appearances and accents", () => {
  for (const appearance of APPEARANCES) {
    for (const accent of ACCENT_IDS) {
      const tokens = resolveAppearance(appearance, accent).tokens;
      if (appearance === "dark") {
        assert.equal(tokens["--color-success"]?.toLowerCase(), "#7cff4f");
        assert.equal(tokens["--color-warning"]?.toLowerCase(), "#fbbf24");
        assert.equal(tokens["--color-danger"]?.toLowerCase(), "#f87171");
      } else {
        assert.equal(tokens["--color-success"]?.toLowerCase(), "#2f7a1c");
        assert.equal(tokens["--color-warning"]?.toLowerCase(), "#b45309");
        assert.equal(tokens["--color-danger"]?.toLowerCase(), "#dc2626");
      }
      assert.notEqual(tokens["--color-danger"], tokens["--accent"]);
    }
  }
});

test("old mode / sky / theme cookies migrate to appearance + accent", () => {
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "burgundy" })),
    { appearance: "dark", accent: "burgundy" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ theme: "pink" })),
    { appearance: "dark", accent: "hot-pink" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "purple" })),
    { appearance: "dark", accent: "purple" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "blue" })),
    { appearance: "dark", accent: "blue" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "white" })),
    { appearance: "light", accent: "neon-green" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "day" })),
    { appearance: "light", accent: "neon-green" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "sunrise" })),
    { appearance: "dark", accent: "neon-green" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "sunset" })),
    { appearance: "dark", accent: "neon-green" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ mode: "night" })),
    { appearance: "dark", accent: "neon-green" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ sky: "morning", theme: "blue" })),
    { appearance: "dark", accent: "neon-green" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ appearance: "light", accent: "yellow" })),
    { appearance: "light", accent: "yellow" },
  );
  assert.deepEqual(
    pick(migrateStoredPreferences({ appearance: "dark", mode: "burgundy" })),
    { appearance: "dark", accent: "burgundy" },
  );
});

test("boot script applies appearance and accent before paint", () => {
  assert.equal(THEME_BOOT_SCRIPT.includes("candler-appearance"), true);
  assert.equal(THEME_BOOT_SCRIPT.includes("candler-accent"), true);
  assert.equal(THEME_BOOT_SCRIPT.includes("setProperty"), true);
  assert.equal(THEME_BOOT_SCRIPT.includes("fetch("), false);
  assert.equal(THEME_BOOT_SCRIPT.includes("data-appearance"), true);
  assert.equal(THEME_BOOT_SCRIPT.includes('"sunrise"'), false);
});

test("settings and sidebar expose light/dark + accents, not the old mode system", () => {
  assert.equal(shell.includes("AppearanceToggle"), true);
  assert.equal(shell.includes("ModeSelect"), false);
  assert.equal(shell.includes("SkySelect"), false);
  assert.equal(appearance.includes("AppearanceToggle"), true);
  assert.equal(appearance.includes("AccentSwatches"), true);
  assert.equal(appearance.includes(">Mode<"), false);
  assert.equal(appearance.includes("Shade"), false);
  assert.equal(appearance.includes("Environment"), false);
  assert.equal(appearance.includes("Sky"), false);
  assert.equal(toggle.includes("Light"), true);
  assert.equal(toggle.includes("Dark"), true);
  assert.equal(swatches.includes("setPreviewAccent"), true);
  assert.equal(settings.includes("AppearanceSettings"), true);
  assert.equal(layout.includes("SkyProvider"), false);
  assert.equal(layout.includes("SkyBackground"), false);
  assert.equal(layout.includes("data-sky-period"), false);
});

test("workspace CSS uses solid sidebar tokens and no sky atmosphere", () => {
  const sidebarRule = css.slice(css.indexOf(".app-sidebar{"), css.indexOf(".app-sidebar-brand"));
  assert.equal(sidebarRule.includes("var(--sidebar-bg"), true);
  assert.equal(sidebarRule.includes("backdrop-filter"), false);
  assert.equal(css.includes(".sky__stars"), false);
  assert.equal(css.includes(".sky__shooting"), false);
  assert.equal(css.includes("html[data-sky-period]"), false);
  assert.equal(css.includes("Sunrise"), false);
});

test("canonical wordmark is not accent-token colored", () => {
  assert.equal(wordmark.includes("bg-purple"), false);
  assert.equal(wordmark.includes("wordmark-mark"), true);
  assert.equal(css.includes(".wordmark-tld{color:#B7FF2A}"), true);
});

test("old sky components are gone", () => {
  assert.equal(existsSync(new URL("../components/sky/SkyBackground.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../components/providers/SkyProvider.tsx", import.meta.url)), false);
  assert.equal(existsSync(new URL("../components/theme/ThemeSelect.tsx", import.meta.url)), false);
});

function pick(resolved: ReturnType<typeof migrateStoredPreferences>) {
  return { appearance: resolved.appearance, accent: resolved.accent };
}
