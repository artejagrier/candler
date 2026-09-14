import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  COLOR_MODES,
  DEFAULT_MODE,
  DEFAULT_SHADE,
  ENVIRONMENT_MODES,
  MODE_FAMILIES,
  familyById,
  resolveAppearance,
  shadeById,
  supportsShades,
  type ModeId,
} from "../lib/theme/catalog";
import { THEME_BOOT_SCRIPT, migrateStoredMode } from "../lib/theme/storage";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/product/ProductShell.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../app/(product)/app/settings/page.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const appearance = readFileSync(new URL("../components/theme/AppearanceSettings.tsx", import.meta.url), "utf8");
const wordmark = readFileSync(new URL("../components/brand/Wordmark.tsx", import.meta.url), "utf8");
const select = readFileSync(new URL("../components/theme/ThemeSelect.tsx", import.meta.url), "utf8");

test("default Candler mode is classic burgundy", () => {
  assert.equal(DEFAULT_MODE, "burgundy");
  assert.equal(DEFAULT_SHADE, "classic");
  const resolved = resolveAppearance();
  assert.equal(resolved.mode, "burgundy");
  assert.equal(resolved.shadeId, "classic");
  assert.equal(resolved.skyPeriod, null);
  assert.equal(resolved.tokens["--color-brand"]?.toLowerCase(), "#8b1e4a");
  assert.equal(resolved.tokens["--color-btn"]?.toLowerCase(), "#b7ff2a");
  assert.equal(resolved.tokens["--sidebar-bg"]?.toLowerCase(), "#3b0a1e");
});

test("unified catalog includes color and environment modes as peers", () => {
  const ids = MODE_FAMILIES.map((family) => family.id);
  const required: ModeId[] = [
    "burgundy", "white", "dark", "pink", "purple", "royal-blue", "blue", "green", "teal", "gray",
    "sunrise", "day", "sunset", "night",
  ];
  for (const id of required) assert.equal(ids.includes(id), true, id);
  assert.equal(COLOR_MODES.length, 10);
  assert.equal(ENVIRONMENT_MODES.length, 4);
  assert.equal(familyById("sunrise").skyPeriod, "morning");
  assert.equal(familyById("day").skyPeriod, "afternoon");
  assert.equal(familyById("sunset").skyPeriod, "evening");
  assert.equal(familyById("night").skyPeriod, "night");
  assert.equal(supportsShades("burgundy"), true);
  assert.equal(supportsShades("sunrise"), false);
  assert.equal(shadeById(familyById("blue"), "classic").tokens["--color-brand"], "#0000FF");
});

test("old theme + sky cookies migrate to one mode", () => {
  assert.equal(migrateStoredMode({ theme: "burgundy", sky: "night" }).mode, "night");
  assert.equal(migrateStoredMode({ theme: "pink", sky: "auto" }).mode, "pink");
  assert.equal(migrateStoredMode({ theme: "blue", shade: "classic", sky: "morning" }).mode, "sunrise");
  assert.equal(migrateStoredMode({ mode: "day" }).mode, "day");
  assert.equal(migrateStoredMode({ mode: "burgundy", shade: "rose" }).shade, "rose");
});

test("environment modes have full workspace tokens, not just a sky flag", () => {
  for (const id of ["sunrise", "day", "sunset", "night"] as const) {
    const tokens = resolveAppearance(id).tokens;
    assert.ok(tokens["--sidebar-bg"]);
    assert.ok(tokens["--workspace-bg"]);
    assert.ok(tokens["--surface"]);
    assert.ok(tokens["--text-primary"]);
    assert.notEqual(tokens["--sidebar-bg"]?.toLowerCase(), "#3b0a1e");
  }
  assert.equal(resolveAppearance("sunrise").scheme, "light");
  assert.equal(resolveAppearance("day").scheme, "light");
  assert.equal(resolveAppearance("sunset").scheme, "dark");
  assert.equal(resolveAppearance("night").scheme, "dark");
});

test("boot script applies unified mode tokens before paint", () => {
  assert.equal(THEME_BOOT_SCRIPT.includes("candler-mode"), true);
  assert.equal(THEME_BOOT_SCRIPT.includes("setProperty"), true);
  assert.equal(THEME_BOOT_SCRIPT.includes("fetch("), false);
  assert.equal(THEME_BOOT_SCRIPT.includes("sunrise"), true);
});

test("status semantics stay green / amber / red across modes", () => {
  for (const family of MODE_FAMILIES) {
    for (const shade of family.shades) {
      if (shade.scheme === "dark") {
        assert.equal(shade.tokens["--color-success"]?.toLowerCase(), "#7cff4f");
        assert.equal(shade.tokens["--color-warning"]?.toLowerCase(), "#fbbf24");
        assert.equal(shade.tokens["--color-danger"]?.toLowerCase(), "#f87171");
      }
    }
  }
});

test("one Mode dropdown exists and Sky selector / hover control are gone", () => {
  assert.equal(shell.includes("ModeSelect"), true);
  assert.equal(shell.includes("SkySelect"), false);
  assert.equal(select.includes("Brand / Color"), true);
  assert.equal(select.includes("Special Environments"), true);
  assert.equal(select.includes("function SkySelect"), false);
  assert.equal(appearance.includes("SkySelect"), false);
  assert.equal(appearance.includes(">Sky<"), false);
  assert.equal(appearance.includes(">Mode<"), true);
  assert.equal(appearance.includes("optional environments"), true);
  assert.equal(layout.includes("SkyPreviewControl"), false);
  assert.equal(settings.includes("AppearanceSettings"), true);
});

test("workspace CSS uses solid sidebar tokens", () => {
  const sidebarRule = css.slice(css.indexOf(".app-sidebar{"), css.indexOf(".app-sidebar-brand"));
  assert.equal(sidebarRule.includes("var(--sidebar-bg"), true);
  assert.equal(sidebarRule.includes("backdrop-filter"), false);
  assert.equal(css.includes(".sky__stars"), true);
  assert.equal(css.includes(".sky__shooting"), true);
});

test("standard color modes keep a solid workspace; sky wash is environment-only", () => {
  const start = css.indexOf(".app-shell{");
  const envWash = css.indexOf("html[data-sky-period] .app-shell");
  const defaultShell = css.slice(start, envWash === -1 ? css.indexOf(".app-sidebar{") : envWash);
  assert.equal(defaultShell.includes("var(--workspace-bg"), true);
  assert.equal(defaultShell.includes("55%, transparent"), false);
  assert.equal(envWash >= 0, true);
  assert.equal(css.includes(".sky:not([data-period])"), true);
});

test("canonical wordmark is not mode-token colored", () => {
  assert.equal(wordmark.includes("bg-purple"), false);
  assert.equal(wordmark.includes("wordmark-mark"), true);
});

test("protected sky contract remains intact", () => {
  for (const expected of [
    ".sky__stars",
    ".sky__shooting",
    "transition: background 1200ms ease",
    "animation: star-twinkle 6s ease-in-out infinite",
    "animation: shooting 11s ease-in 3s infinite",
    "animation: cloud-drift 90s linear infinite",
  ]) {
    assert.equal(css.includes(expected), true, expected);
  }
});

test("sky is opt-in: no local-time auto period and layers unmount on color modes", () => {
  const skyProvider = readFileSync(new URL("../components/providers/SkyProvider.tsx", import.meta.url), "utf8");
  const skyBackground = readFileSync(new URL("../components/sky/SkyBackground.tsx", import.meta.url), "utf8");
  const greeting = readFileSync(new URL("../components/workspace/Greeting.tsx", import.meta.url), "utf8");
  assert.equal(skyProvider.includes("currentPeriod"), false);
  assert.equal(skyProvider.includes("msUntilNextPeriod"), false);
  assert.equal(skyProvider.includes("autoPeriod"), false);
  assert.equal(skyProvider.includes("setTimeout"), false);
  assert.equal(skyBackground.includes("return null"), true);
  assert.equal(greeting.includes("useSky"), false);
  assert.equal(COLOR_MODES.every((family) => family.skyPeriod === null), true);
});
