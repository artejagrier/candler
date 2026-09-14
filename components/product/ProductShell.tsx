"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, Search, ShieldCheck, X } from "lucide-react";
import { Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { PRIMARY_NAV, PROJECT_GLOBAL_NAV, PROJECT_NAV, SIDEBAR_FOOTER } from "@/config/product";
import { Wordmark } from "@/components/brand/Wordmark";
import { AccountMenu } from "@/components/product/AccountMenu";
import { NotificationsMenu } from "@/components/product/NotificationsMenu";
import { CommandPalette } from "@/components/product/CommandPalette";
import { ModeSelect } from "@/components/theme/ThemeSelect";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { cn } from "@/lib/utilities/cn";

const PROJECT_PATH = /^\/app\/projects\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isActive(pathname: string, href: string, match: "exact" | "prefix" | "vault") {
  if (match === "exact") return pathname === href;
  if (match === "vault") {
    if (pathname === "/app/vault" || pathname.startsWith("/app/vault/recovery")) return true;
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function crumb(pathname: string, projectName?: string) {
  if (pathname === "/app") return "Dashboard";
  if (pathname.startsWith("/app/projects/") && projectName) return `Projects / ${projectName}`;
  if (pathname === "/app/projects") return "Projects";
  if (pathname.startsWith("/app/vault/authenticator")) return "Authenticator";
  if (pathname.startsWith("/app/vault/recovery")) return "Vault / Recovery";
  if (pathname.startsWith("/app/vault")) return projectName ? `${projectName} / Vault` : "Vault";
  if (pathname.startsWith("/app/cloud")) return projectName ? `${projectName} / Cloud` : "Cloud";
  if (pathname.startsWith("/app/agent")) return projectName ? `${projectName} / Agent` : "Agent";
  if (pathname.startsWith("/app/activity")) return projectName ? `${projectName} / Activity` : "Activity";
  if (pathname.startsWith("/app/settings/billing")) return "Billing";
  if (pathname.startsWith("/app/settings/security")) return "Account";
  if (pathname.startsWith("/app/settings")) return "Settings";
  if (pathname.startsWith("/app/onboarding")) return "Welcome";
  if (pathname.startsWith("/app/search")) return "Search";
  return "Candler";
}

function projectHref(id: string, key: (typeof PROJECT_NAV)[number]["key"]) {
  switch (key) {
    case "overview":
      return `/app/projects/${id}`;
    case "vault":
      return `/app/vault?project=${id}`;
    case "authenticator":
      return `/app/vault/authenticator?project=${id}`;
    case "cloud":
      return `/app/cloud?project=${id}`;
    case "agent":
      return `/app/agent?project=${id}`;
    case "activity":
      return `/app/activity?project=${id}`;
  }
}

function projectLinkActive(
  pathname: string,
  queryProject: string | undefined,
  projectId: string,
  key: (typeof PROJECT_NAV)[number]["key"],
) {
  const q = queryProject === projectId;
  switch (key) {
    case "overview":
      return pathname === `/app/projects/${projectId}`;
    case "vault":
      return pathname === "/app/vault" && q;
    case "authenticator":
      return pathname.startsWith("/app/vault/authenticator") && (!queryProject || q);
    case "cloud":
      return pathname.startsWith("/app/cloud") && q;
    case "agent":
      return pathname.startsWith("/app/agent") && (!queryProject || q);
    case "activity":
      return pathname.startsWith("/app/activity") && (!queryProject || q);
  }
}

export function ProductShell(props: {
  children: React.ReactNode;
  userName: string;
  workspaceName: string;
  projects?: { id: string; name: string }[];
}) {
  return (
    <Suspense fallback={<ProductChrome {...props} pathname="/app" projectId={undefined} projectName={undefined} queryProject={undefined} />}>
      <ProductShellReady {...props} />
    </Suspense>
  );
}

function ProductShellReady({
  children,
  userName,
  workspaceName,
  projects = [],
}: {
  children: React.ReactNode;
  userName: string;
  workspaceName: string;
  projects?: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const pathProject = pathname.match(PROJECT_PATH)?.[1];
  const rawQuery = searchParams.get("project");
  const queryProject = rawQuery && UUID.test(rawQuery) ? rawQuery : undefined;
  const projectId = pathProject ?? queryProject;
  const projectName = projects.find((p) => p.id === projectId)?.name;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ProductChrome
      pathname={pathname}
      projectId={projectName ? projectId : undefined}
      projectName={projectName}
      queryProject={queryProject}
      workspaceName={workspaceName}
      userName={userName}
      paletteOpen={paletteOpen}
      drawerOpen={drawerOpen}
      onOpenPalette={() => setPaletteOpen(true)}
      onClosePalette={closePalette}
      onOpenDrawer={() => setDrawerOpen(true)}
      onCloseDrawer={closeDrawer}
    >
      {children}
    </ProductChrome>
  );
}

function ProductChrome({
  children,
  userName,
  workspaceName,
  pathname,
  projectId,
  projectName,
  queryProject,
  paletteOpen = false,
  drawerOpen = false,
  onOpenPalette,
  onClosePalette,
  onOpenDrawer,
  onCloseDrawer,
}: {
  children: React.ReactNode;
  userName: string;
  workspaceName: string;
  pathname: string;
  projectId?: string;
  projectName?: string;
  queryProject?: string;
  paletteOpen?: boolean;
  drawerOpen?: boolean;
  onOpenPalette?: () => void;
  onClosePalette?: () => void;
  onOpenDrawer?: () => void;
  onCloseDrawer?: () => void;
}) {
  return (
    <div className="app-shell">
      <Sidebar
        pathname={pathname}
        projectId={projectId}
        projectName={projectName}
        queryProject={queryProject}
        workspaceName={workspaceName}
      />

      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-left">
            <button
              type="button"
              className="app-menu-toggle"
              aria-label="Open navigation"
              onClick={onOpenDrawer}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <p className="app-crumb">{crumb(pathname, projectName)}</p>
          </div>

          <button
            type="button"
            className="app-search"
            onClick={onOpenPalette}
            aria-label="Search and commands"
            aria-keyshortcuts="Meta+K Control+K"
          >
            <Search className="size-4" aria-hidden="true" />
            <span className="app-search-label">Search…</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="app-topbar-right">
            <span className="app-status">
              <ShieldCheck aria-hidden="true" />
              <span>Protected</span>
            </span>
            <NotificationsMenu />
            <AccountMenu userName={userName} workspaceName={workspaceName} />
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>

      {drawerOpen && onCloseDrawer ? (
        <MobileDrawer
          pathname={pathname}
          projectId={projectId}
          projectName={projectName}
          queryProject={queryProject}
          workspaceName={workspaceName}
          onClose={onCloseDrawer}
        />
      ) : null}

      {paletteOpen && onClosePalette ? <CommandPalette onClose={onClosePalette} /> : null}
    </div>
  );
}

function Sidebar({
  pathname,
  projectId,
  projectName,
  queryProject,
  workspaceName,
}: {
  pathname: string;
  projectId?: string;
  projectName?: string;
  queryProject?: string;
  workspaceName: string;
}) {
  const globalNav = projectId ? PROJECT_GLOBAL_NAV : PRIMARY_NAV;
  return (
    <aside className="app-sidebar" aria-label="Workspace">
      <div className="app-sidebar-brand">
        <Wordmark href="/app" size="sm" />
      </div>
      <p className="app-sidebar-workspace">{workspaceName}</p>
      <nav className="app-sidebar-nav" aria-label="Primary">
        {globalNav.map((item) => (
          <SideLink key={item.href} pathname={pathname} item={item} />
        ))}
      </nav>
      {projectId && projectName ? (
        <ProjectNav pathname={pathname} projectId={projectId} projectName={projectName} queryProject={queryProject} />
      ) : null}
      <nav className="app-sidebar-footer" aria-label="Account">
        {SIDEBAR_FOOTER.map((item) => (
          <span key={`${item.href}-${item.label}`} className="app-sidebar-footer-item">
            <SideLink pathname={pathname} item={item} />
            {item.label === "Settings" ? <ModeSelect compact /> : null}
          </span>
        ))}
      </nav>
    </aside>
  );
}

function ProjectNav({
  pathname,
  projectId,
  projectName,
  queryProject,
  onNavigate,
}: {
  pathname: string;
  projectId: string;
  projectName: string;
  queryProject?: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="app-sidebar-project" aria-label={`${projectName} project`}>
      <p className="app-sidebar-heading">{projectName}</p>
      {PROJECT_NAV.map((item) => {
        const href = projectHref(projectId, item.key);
        const Icon = item.icon;
        const active = projectLinkActive(pathname, queryProject, projectId, item.key);
        return (
          <Link
            key={item.key}
            href={href}
            className={cn("app-sidebar-link", active && "app-sidebar-link--active")}
            aria-current={active ? "page" : undefined}
            title={item.label}
            onClick={onNavigate}
          >
            <Icon className="app-sidebar-icon" aria-hidden="true" />
            <span className="app-sidebar-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SideLink({
  pathname,
  item,
  onNavigate,
}: {
  pathname: string;
  item: { href: string; label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; match: "exact" | "prefix" | "vault"; tone?: "default" | "protect" | "intel" };
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href, item.match);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn("app-sidebar-link", active && "app-sidebar-link--active")}
      data-tone={item.tone}
      aria-current={active ? "page" : undefined}
      title={item.label}
      onClick={onNavigate}
    >
      <Icon className="app-sidebar-icon" aria-hidden={true} />
      <span className="app-sidebar-label">{item.label}</span>
    </Link>
  );
}

function MobileDrawer({
  pathname,
  projectId,
  projectName,
  queryProject,
  workspaceName,
  onClose,
}: {
  pathname: string;
  projectId?: string;
  projectName?: string;
  queryProject?: string;
  workspaceName: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogA11y(panelRef, onClose);

  const items = useMemo(
    () => [...(projectId ? PROJECT_GLOBAL_NAV : PRIMARY_NAV), ...SIDEBAR_FOOTER],
    [projectId],
  );

  return (
    <div className="app-drawer" role="presentation">
      <button type="button" className="app-drawer-scrim" aria-label="Close navigation" onClick={onClose} tabIndex={-1} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="app-drawer-panel"
      >
        <div className="app-drawer-head">
          <p id={titleId} className="app-sidebar-workspace">{workspaceName}</p>
          <button type="button" className="icon-button" aria-label="Close navigation" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Primary">
          {items.map((item) => (
            <span key={`${item.href}-${item.label}`} className="app-sidebar-footer-item">
              <SideLink pathname={pathname} item={item} onNavigate={onClose} />
              {item.label === "Settings" ? <ModeSelect compact /> : null}
            </span>
          ))}
        </nav>
        {projectId && projectName ? (
          <ProjectNav
            pathname={pathname}
            projectId={projectId}
            projectName={projectName}
            queryProject={queryProject}
            onNavigate={onClose}
          />
        ) : null}
      </div>
    </div>
  );
}
