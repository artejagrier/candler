import { AppShell } from "@/components/layout/AppShell";

/**
 * Layout for authenticated workspace routes. Wraps every child in the AppShell
 * (command palette + floating dock). This route group `(workspace)` adds no URL
 * segment, so routes stay at `/dashboard`, `/projects`, etc.
 */
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
