import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import jsQR from "jsqr";
import {
  CANDLER_TOTP_ISSUER,
  buildCandlerOtpAuthUri,
  candlerAccountLabel,
  enrollmentQrSrc,
} from "../lib/auth/candler-totp";
import { encodeQrModules, qrImageSrc } from "../lib/auth/qr-svg";
import { parseOtpAuthUri } from "../lib/vault/otpauth";

const SECRET = "JBSWY3DPEHPK3PXP";

function decodeModules(grid: number[][]) {
  const quiet = 4;
  const scale = 8;
  const dim = (grid.length + quiet * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4);
  for (let y = 0; y < dim; y += 1) {
    for (let x = 0; x < dim; x += 1) {
      const row = Math.floor(y / scale) - quiet;
      const col = Math.floor(x / scale) - quiet;
      const dark = row >= 0 && col >= 0 && row < grid.length && col < grid.length && grid[row][col] === 1;
      const i = (y * dim + x) * 4;
      const value = dark ? 0 : 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }
  }
  return jsQR(data, dim, dim, { inversionAttempts: "dontInvert" })?.data ?? "";
}

test("Candler TOTP URI uses Candler.dev issuer and the user account label", () => {
  const account = candlerAccountLabel("arteja@candler.dev");
  const uri = buildCandlerOtpAuthUri(SECRET, account);
  assert.equal(uri.startsWith("otpauth://totp/"), true);
  assert.equal(uri.includes("issuer=Candler.dev"), true);
  assert.equal(uri.includes(encodeURIComponent(CANDLER_TOTP_ISSUER)), true);
  assert.equal(uri.includes(encodeURIComponent(account)), true);
  assert.equal(uri.includes("algorithm=SHA1"), true);
  assert.equal(uri.includes("digits=6"), true);
  assert.equal(uri.includes("period=30"), true);
  assert.equal(uri.includes("paddle"), false);
  assert.equal(uri.includes("supabase"), false);
  assert.equal(uri.includes("sk_"), false);
  const parsed = parseOtpAuthUri(uri);
  assert.equal(parsed.issuer, "Candler.dev");
  assert.equal(parsed.accountName, account);
  assert.equal(parsed.secret, SECRET);
});

test("enrollment QR encodes only the otpauth URI and is scannable", () => {
  const uri = buildCandlerOtpAuthUri(SECRET, "arteja@candler.dev");
  const decoded = decodeModules(encodeQrModules(uri));
  assert.equal(decoded, uri);
  const src = enrollmentQrSrc(uri);
  assert.equal(src.startsWith("data:image/svg+xml;utf-8,"), true);
  assert.equal(src.includes("%23ffffff") || src.includes("ffffff"), true);
  assert.equal(qrImageSrc("<svg xmlns='http://www.w3.org/2000/svg'></svg>").startsWith("data:image/svg+xml;utf-8,"), true);
});

test("longer account labels still produce a scannable enrollment QR", () => {
  const uri = buildCandlerOtpAuthUri(SECRET, "workspace.owner+authenticator@candler.dev");
  assert.equal(decodeModules(encodeQrModules(uri)), uri);
});

test("enrollment UI and actions never log the secret or otpauth URI", () => {
  const enroll = readFileSync(new URL("../lib/auth/actions.ts", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../components/auth/CandlerTotpEnrollment.tsx", import.meta.url), "utf8");
  const confirm = enroll.slice(enroll.indexOf("export async function confirmMfaEnrollmentAction"));
  assert.equal(enroll.includes("console.log"), false);
  assert.equal(ui.includes("console.log"), false);
  assert.equal(enroll.includes("localStorage"), false);
  assert.equal(ui.includes("localStorage"), false);
  assert.equal(enroll.includes("CANDLER_TOTP_ISSUER"), true);
  assert.equal(enroll.includes("buildCandlerOtpAuthUri"), true);
  assert.equal(enroll.includes("enrollmentQrSrc"), true);
  assert.equal(enroll.includes("uri: data.totp.uri"), false);
  assert.equal(enroll.includes("qr_code"), false);
  assert.equal(confirm.includes("mfa.verify"), true);
  assert.equal(confirm.includes("totpSchema"), true);
  assert.equal(confirm.includes("Authenticator enrolled."), true);
  assert.equal(ui.includes("Scan QR code"), true);
  assert.equal(ui.includes("Can’t scan it? Show setup key"), true);
  assert.equal(ui.includes("Verify & Enable"), true);
  assert.equal(ui.includes("Enter 6-digit code"), true);
  assert.equal(ui.includes("Google Authenticator"), true);
  assert.equal(ui.includes("Microsoft Authenticator"), true);
  assert.equal(ui.includes("1Password"), true);
  assert.equal(ui.includes("enrollment.secret"), true);
  assert.equal(ui.includes("setShowKey(true)"), true);
});

test("Windows vault row actions stay clickable and camera scan has a fallback", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const vault = readFileSync(new URL("../components/vault/VaultClient.tsx", import.meta.url), "utf8");
  const add = readFileSync(new URL("../components/vault/authenticator/AddAccountDialog.tsx", import.meta.url), "utf8");
  assert.equal(css.includes(".totp-qr-wrap"), true);
  assert.equal(css.includes("color-scheme:light"), true);
  assert.equal(css.includes(".vault-table .row-actions button{min-width:2.25rem;min-height:2.25rem;cursor:pointer}"), true);
  assert.equal(css.includes("pointer-events:none"), true);
  assert.equal(vault.includes('type="button"'), true);
  assert.equal(vault.includes("min-width:2.25rem") || css.includes("min-width:2.25rem"), true);
  assert.equal(add.includes("video: true"), true);
  assert.equal(add.includes("authenticator-viewfinder-empty"), true);
});
