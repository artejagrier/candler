"use client";

import Link from "next/link";
import { Compass, LogOut } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { ACCOUNT_MENU } from "@/config/product";
import { replayCandlerTour } from "@/components/workspace/CandlerTour";
import { signOutAction } from "@/lib/auth/actions";
import { useOutsideDismiss } from "@/hooks/useOutsideDismiss";

export function AccountMenu({
  userName,
  workspaceName,
  planLabel,
}: {
  userName: string;
  workspaceName: string;
  planLabel?: string;
}) {
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
            {planLabel ? <span className="plan-chip plan-chip--menu">{planLabel}</span> : null}
          </div>
          {ACCOUNT_MENU.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)}>
              <Icon aria-hidden="true" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              replayCandlerTour();
            }}
          >
            <Compass aria-hidden="true" />
            Take a tour
          </button>
          <div className="app-menu-sep" role="separator" />
          <form action={signOutAction}>
            <SignOutMenuItem />
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SignOutMenuItem() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" role="menuitem" className="app-menu-danger" disabled={pending}>
      <LogOut aria-hidden="true" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
