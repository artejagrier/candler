import { otpAuthQrSvg, svgToDataUri } from "@/lib/auth/qr-svg";

export const CANDLER_TOTP_ISSUER = "Candler.dev";

export function candlerAccountLabel(email: string | null | undefined) {
  const value = email?.trim();
  return value || "Candler account";
}

export function buildCandlerOtpAuthUri(secret: string, account: string) {
  const normalized = secret.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z2-7]+=*$/.test(normalized)) {
    throw new Error("Enrollment secret is invalid.");
  }
  const label = `${encodeURIComponent(CANDLER_TOTP_ISSUER)}:${encodeURIComponent(account)}`;
  const params = [
    `secret=${encodeURIComponent(normalized)}`,
    `issuer=${encodeURIComponent(CANDLER_TOTP_ISSUER)}`,
    "algorithm=SHA1",
    "digits=6",
    "period=30",
  ].join("&");
  return `otpauth://totp/${label}?${params}`;
}

export function enrollmentQrSrc(uri: string) {
  if (!uri.startsWith("otpauth://totp/")) {
    throw new Error("Enrollment QR is limited to TOTP setup.");
  }
  return svgToDataUri(otpAuthQrSvg(uri));
}
