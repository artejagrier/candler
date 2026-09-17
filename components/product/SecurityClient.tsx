"use client";

import { useState, useTransition } from "react";
import { changePasswordAction, logoutAllSessionsAction, signOutAction } from "@/lib/auth/actions";
import { CandlerTotpEnrollment } from "@/components/auth/CandlerTotpEnrollment";

export function SecurityClient({
  aal,
  email,
  totpEnrolled,
}: {
  aal: string | null;
  email: string | null;
  totpEnrolled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="settings-list">
      <div>
        <p><b>Account</b><small>{email ?? "No email on this session."}</small></p>
        <form action={signOutAction}><button className="secondary-button">Sign out</button></form>
      </div>
      <div>
        <p><b>Password</b><small>Change your password using Supabase Auth.</small></p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const password = String(new FormData(event.currentTarget).get("password"));
            start(async () => {
              const result = await changePasswordAction(password);
              setMessage(result.ok ? result.message ?? "Password changed." : result.error);
            });
          }}
        >
          <input name="password" type="password" minLength={12} required autoComplete="new-password" placeholder="New password" />
          <button className="secondary-button" disabled={pending}>Change password</button>
        </form>
      </div>
      <CandlerTotpEnrollment enrolled={totpEnrolled} />
      <div>
        <p><b>Multi-factor authentication</b><small>Current assurance: {aal ?? "Unavailable"}</small></p>
      </div>
      <div>
        <p><b>All sessions</b><small>Revoke every active refresh token for this account. Supabase does not expose a device inventory, so Candler does not invent one.</small></p>
        <button
          className="secondary-button"
          onClick={() => confirm("Sign out every session?") && start(async () => {
            const result = await logoutAllSessionsAction();
            if (result.ok) location.href = result.redirectTo ?? "/login";
            else setMessage(result.error);
          })}
        >
          Log out all sessions
        </button>
      </div>
      {message ? <p className="security-note">{message}</p> : null}
    </div>
  );
}
