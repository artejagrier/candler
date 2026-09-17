"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMfaEnrollmentAction, enrollMfaAction } from "@/lib/auth/actions";

export function CandlerTotpEnrollment({
  enrolled,
  variant = "settings",
}: {
  enrolled: boolean;
  variant?: "settings" | "vault";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const started = useRef(false);

  function begin() {
    start(async () => {
      setMessage("");
      setShowKey(false);
      setCode("");
      const result = await enrollMfaAction();
      if (!result.ok) {
        setEnrollment(null);
        setMessage(result.error);
        return;
      }
      setEnrollment({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret });
      if (!result.qrCode) setShowKey(true);
    });
  }

  useEffect(() => {
    if (enrolled || started.current) return;
    started.current = true;
    begin();
  }, [enrolled]);

  function verify() {
    if (!enrollment) return;
    start(async () => {
      const result = await confirmMfaEnrollmentAction(enrollment.factorId, { code });
      if (!result.ok) {
        setMessage(result.error);
        return;
      }
      setEnrollment(null);
      setCode("");
      setShowKey(false);
      setMessage(result.message ?? "Authenticator enrolled.");
      router.refresh();
    });
  }

  if (enrolled && !enrollment) {
    return (
      <section className="totp-enroll totp-enroll--ready">
        <p className="eyebrow">Candler Authenticator</p>
        <h2>Login authenticator is on.</h2>
        <p>
          {variant === "vault"
            ? "This account already has a verified TOTP factor. Vault codes below are separate stored accounts."
            : "Use this authenticator when Candler asks for a login code."}
        </p>
      </section>
    );
  }

  return (
    <section className="totp-enroll">
      <p className="eyebrow">Scan QR code</p>
      <h2>Set up Candler Authenticator</h2>
      <p>Scan this enrollment code with Google Authenticator, Microsoft Authenticator, 1Password, or another TOTP-compatible app.</p>

      {enrollment?.qrCode ? (
        <div className="totp-qr-wrap">
          {/* Enrollment QR is a local data URI generated from the otpauth payload. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrollment.qrCode} alt="Candler Authenticator enrollment QR code" className="totp-qr" width="196" height="196" />
        </div>
      ) : (
        <div className="totp-qr-wrap totp-qr-wrap--pending" aria-busy={pending}>
          <span>{pending ? "Preparing enrollment QR…" : "Enrollment QR unavailable. Use the setup key."}</span>
        </div>
      )}

      <p className="totp-apps">
        Scan with:
        <br />
        Google Authenticator
        <br />
        Microsoft Authenticator
        <br />
        1Password
        <br />
        or another TOTP-compatible app
      </p>

      {enrollment ? (
        showKey ? (
          <div className="totp-setup-key">
            <span>Setup key</span>
            <code>{enrollment.secret}</code>
            <button type="button" className="text-link" onClick={() => setShowKey(false)}>Hide setup key</button>
          </div>
        ) : (
          <button type="button" className="text-link" onClick={() => setShowKey(true)}>
            Can’t scan it? Show setup key
          </button>
        )
      ) : null}

      {enrollment ? (
        <form
          className="totp-verify"
          onSubmit={(event) => {
            event.preventDefault();
            verify();
          }}
        >
          <label>
            Enter 6-digit code
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              placeholder="000000"
            />
          </label>
          <button type="submit" className="primary-button" disabled={pending || code.length !== 6}>
            {pending ? "Verifying…" : "Verify & Enable"}
          </button>
        </form>
      ) : !pending ? (
        <button type="button" className="primary-button" onClick={begin}>
          Show enrollment QR
        </button>
      ) : null}

      {message ? <p className="security-note" role="alert">{message}</p> : null}
    </section>
  );
}
