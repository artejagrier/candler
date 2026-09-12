"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";
import { cn } from "@/lib/utilities/cn";

interface Notification {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  href: string;
}

const ICONS = { info: Clock, warning: RefreshCw, critical: AlertTriangle } as const;

/**
 * Notifications derived from real workspace state (rotation due, expiring
 * credentials, failed uploads, near-quota, billing) — never fabricated. When
 * there is nothing to surface, we say so plainly. Persistence/read-state is a
 * documented backend follow-up; this shows live, computed attention items.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  useOutsideDismiss(wrapRef, open, () => setOpen(false));

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((data: { notifications?: Notification[] }) => {
        if (active) setItems(data.notifications ?? []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = items?.length ?? 0;

  return (
    <div className="app-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="icon-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={count > 0 ? `Notifications, ${count} need attention` : "Notifications"}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {count > 0 ? <span className="app-badge" aria-hidden="true">{count > 9 ? "9+" : count}</span> : null}
      </button>

      {open ? (
        <div id={panelId} role="dialog" aria-label="Notifications" className="app-menu app-notify">
          <div className="app-menu-header">
            <b>Needs attention</b>
            <small>{count > 0 ? `${count} item${count === 1 ? "" : "s"} from your workspace` : "Live from your projects"}</small>
          </div>
          {items === null ? (
            <p className="app-notify-empty">Loading…</p>
          ) : count === 0 ? (
            <div className="app-notify-clear">
              <CheckCircle2 aria-hidden="true" />
              <p>You’re all caught up.</p>
            </div>
          ) : (
            items.map((n) => {
              const Icon = ICONS[n.severity];
              return (
                <Link key={n.id} href={n.href} className="app-notify-item" onClick={() => setOpen(false)}>
                  <span className={cn("app-notify-icon", `app-notify-icon--${n.severity}`)}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <b>{n.title}</b>
                    <small>{n.detail}</small>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
