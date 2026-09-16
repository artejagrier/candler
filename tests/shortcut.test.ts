import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  formatModShortcut,
  isAppleNavigator,
  isModKeyEvent,
  modShortcutAria,
} from "../lib/utilities/shortcut";

test("Apple platforms are detected from navigator platform and UA", () => {
  assert.equal(isAppleNavigator({ platform: "MacIntel", userAgent: "Mozilla/5.0" }), true);
  assert.equal(isAppleNavigator({ platform: "iPhone", userAgent: "Mozilla/5.0" }), true);
  assert.equal(isAppleNavigator({ userAgentData: { platform: "macOS" }, userAgent: "" }), true);
  assert.equal(isAppleNavigator({ platform: "Win32", userAgent: "Windows NT 10.0" }), false);
  assert.equal(isAppleNavigator({ platform: "Linux x86_64", userAgent: "X11; Linux x86_64" }), false);
});

test("shortcut labels match Mac vs Windows/Linux copy", () => {
  assert.equal(formatModShortcut("K", true), "⌘ K");
  assert.equal(formatModShortcut("K", false), "Ctrl + K");
  assert.equal(modShortcutAria("K", true), "Meta+K");
  assert.equal(modShortcutAria("K", false), "Control+K");
});

test("Mac keyboard matching is Meta+K without requiring Control", () => {
  assert.equal(isModKeyEvent({ key: "k", metaKey: true, ctrlKey: false }, "k", true), true);
  assert.equal(isModKeyEvent({ key: "K", metaKey: true, ctrlKey: false }, "k", true), true);
  assert.equal(isModKeyEvent({ key: "k", metaKey: false, ctrlKey: true }, "k", true), false);
  assert.equal(isModKeyEvent({ key: "k", metaKey: true, ctrlKey: true }, "k", true), false);
});

test("Windows and Linux keyboard matching is Ctrl+K without requiring Meta", () => {
  assert.equal(isModKeyEvent({ key: "k", metaKey: false, ctrlKey: true }, "k", false), true);
  assert.equal(isModKeyEvent({ key: "k", metaKey: true, ctrlKey: false }, "k", false), false);
  assert.equal(isModKeyEvent({ key: "k", metaKey: true, ctrlKey: true }, "k", false), false);
});

test("product shell and palette do not hardcode a Mac-only hint", () => {
  const shell = readFileSync(new URL("../components/product/ProductShell.tsx", import.meta.url), "utf8");
  const palette = readFileSync(new URL("../components/product/CommandPalette.tsx", import.meta.url), "utf8");
  const tour = readFileSync(new URL("../components/workspace/CandlerTour.tsx", import.meta.url), "utf8");
  const hero = readFileSync(new URL("../components/marketing/Hero.tsx", import.meta.url), "utf8");
  const features = readFileSync(new URL("../components/marketing/FeatureGrid.tsx", import.meta.url), "utf8");
  const stats = readFileSync(new URL("../components/marketing/StatsBar.tsx", import.meta.url), "utf8");
  assert.equal(shell.includes("⌘K"), false);
  assert.equal(shell.includes("<Kbd>⌘</Kbd>"), false);
  assert.equal(hero.includes("<Kbd>⌘</Kbd>"), false);
  assert.equal(hero.includes("ModShortcut"), true);
  assert.equal(shell.includes("isModKeyEvent"), true);
  assert.equal(shell.includes('addEventListener("keydown", onKeyDown, true)'), true);
  assert.equal(features.includes('|| "Ctrl + K"'), false);
  assert.equal(stats.includes('|| "Ctrl + K"'), false);
  assert.equal(tour.includes('|| "Ctrl + K"'), false);
  assert.equal(palette.includes('label: "Recovery"'), true);
  assert.equal(palette.includes('label: "Search projects"'), true);
  assert.equal(tour.includes("useModShortcutLabel"), true);
});

test("command palette lists real Candler destinations", () => {
  const palette = readFileSync(new URL("../components/product/CommandPalette.tsx", import.meta.url), "utf8");
  const required = [
    'label: "Projects"',
    'label: "Vault"',
    'label: "Cloud"',
    'label: "Agent"',
    'label: "Activity"',
    'label: "Authenticator"',
    'label: "Recovery"',
    'label: "Settings"',
    'label: "Billing"',
    'label: "Create project"',
    'label: "Search projects"',
  ];
  for (const label of required) {
    assert.equal(palette.includes(label), true, `missing ${label}`);
  }
  assert.equal(palette.includes('href: "/app/projects"'), true);
  assert.equal(palette.includes('href: "/app/vault"'), true);
  assert.equal(palette.includes('href: "/app/cloud"'), true);
  assert.equal(palette.includes('href: "/app/agent"'), true);
  assert.equal(palette.includes('href: "/app/activity"'), true);
  assert.equal(palette.includes('href: "/app/vault/authenticator"'), true);
  assert.equal(palette.includes('href: "/app/vault/recovery"'), true);
  assert.equal(palette.includes('href: "/app/settings"'), true);
  assert.equal(palette.includes('href: "/app/settings/billing"'), true);
  assert.equal(palette.includes('href: "/app/search"'), true);
  assert.equal(palette.includes('event.key === "Enter"'), true);
  assert.equal(palette.includes("useDialogA11y"), true);
});
