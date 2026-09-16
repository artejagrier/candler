/**
 * Cross-platform modifier shortcut helpers.
 *
 * Display and matching stay in one place so the product never hardcodes ⌘K
 * for Windows/Linux users or Ctrl+K for Mac users.
 */

export type ShortcutNavigator = {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
};

export function isAppleNavigator(nav: ShortcutNavigator | null | undefined): boolean {
  if (!nav) return false;
  const platform = `${nav.userAgentData?.platform ?? ""} ${nav.platform ?? ""}`;
  const ua = nav.userAgent ?? "";
  return /Mac|iPhone|iPad|iPod/i.test(`${platform} ${ua}`);
}

export function formatModShortcut(key: string, apple: boolean): string {
  const chord = key.trim().toUpperCase() || "K";
  return apple ? `⌘ ${chord}` : `Ctrl + ${chord}`;
}

export function modShortcutAria(key: string, apple: boolean): string {
  const chord = key.trim().toUpperCase() || "K";
  return apple ? `Meta+${chord}` : `Control+${chord}`;
}

export function isModKeyEvent(
  event: { key: string; metaKey: boolean; ctrlKey: boolean },
  key: string,
  apple: boolean,
): boolean {
  if (event.key.toLowerCase() !== key.toLowerCase()) return false;
  if (apple) return event.metaKey && !event.ctrlKey;
  return event.ctrlKey && !event.metaKey;
}
