"use client";

import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utilities/cn";
import {
  formatModShortcut,
  isAppleNavigator,
  modShortcutAria,
} from "@/lib/utilities/shortcut";

function subscribe() {
  return () => {};
}

export function useApplePlatform() {
  return useSyncExternalStore(
    subscribe,
    () => isAppleNavigator(navigator),
    () => false,
  );
}

export function useHasMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function useModShortcutLabel(key = "K") {
  const mounted = useHasMounted();
  const apple = useApplePlatform();
  if (!mounted) return "";
  return formatModShortcut(key, apple);
}

export function useModShortcutAria(key = "K") {
  const mounted = useHasMounted();
  const apple = useApplePlatform();
  if (!mounted) return undefined;
  return modShortcutAria(key, apple);
}

export function ModShortcut({
  keyName = "K",
  className,
}: {
  keyName?: string;
  className?: string;
}) {
  const label = useModShortcutLabel(keyName);
  return (
    <kbd className={cn(className)} suppressHydrationWarning>
      {label}
    </kbd>
  );
}
