"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useId, useRef, useState } from "react";

import { ACCOUNT_MENU } from "@/config/product";
import { signOutAction } from "@/lib/auth/actions";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";

export function AccountMenu({ userName, workspaceName }: { userName: string; workspaceName: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useOutsideDismiss(wrapRef, open, () => setOpen(false));

  const initial = userName.slice(0, 1).toUpperCase();

  return (
    <div className="app-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className="app-avatar-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="app-avatar">{initial}</span>
      </button>

      {open ? (
        <div id={menuId} role="menu" aria-label="Account" className="app-menu">
          <div className="app-menu-header">
            <b>{userName}</b>
            <small>{workspaceName}</small>
          </div>
          {ACCOUNT_MENU.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          ))}
          <div className="app-menu-sep" role="separator" />
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="app-menu-danger">
              <LogOut aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
