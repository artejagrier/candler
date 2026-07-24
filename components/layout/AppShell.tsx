import { CommandPaletteProvider } from "@/components/navigation/CommandPaletteProvider";
import { Dock } from "@/components/navigation/Dock";

/**
 * Chrome shared by every authenticated workspace route: the command palette
 * (⌘K) and the floating dock. Marketing and auth routes deliberately omit this
 * so they don't show workspace navigation. Content is padded at the bottom so
 * the floating dock never overlaps it. The Dock lives inside the provider
 * because it opens the palette via `useCommandPalette()`.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="min-h-dvh pb-28">{children}</div>
      <Dock />
    </CommandPaletteProvider>
  );
}
