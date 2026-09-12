"use client";

import { useState, useTransition } from "react";
import { changePasswordAction, confirmMfaEnrollmentAction, enrollMfaAction, logoutAllSessionsAction, signOutAction } from "@/lib/auth/actions";

export function SecurityClient({ aal, email }: { aal: string | null; email: string | null }) {
  const [message, setMessage] = useState("");
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string } | null>(null);
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
      <div>
        <p><b>Multi-factor authentication</b><small>Current assurance: {aal ?? "Unavailable"}</small></p>
        <button
          className="secondary-button"
          onClick={() => start(async () => {
            const result = await enrollMfaAction();
            if (result.ok) setEnrollment({ factorId: result.factorId, qrCode: result.qrCode });
            else setMessage(result.error);
          })}
        >
          Enroll authenticator
        </button>
      </div>
      {enrollment ? (
        <div>
          <p><b>Verify authenticator</b><small>Scan the QR code, then enter the six-digit code. Enrollment data is discarded after verification.</small></p>
          <div>
            {/* QR is a data URI from Supabase; next/image is not appropriate here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="Authenticator QR code" width="160" height="160" />
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const code = String(new FormData(event.currentTarget).get("code"));
                start(async () => {
                  const result = await confirmMfaEnrollmentAction(enrollment.factorId, { code });
                  setMessage(result.ok ? result.message ?? "MFA enrolled." : result.error);
                  if (result.ok) setEnrollment(null);
                });
              }}
            >
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" required />
              <button className="primary-button">Verify</button>
            </form>
          </div>
        </div>
      ) : null}
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
