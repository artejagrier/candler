import { z } from "zod";
import { LEGAL_ACCEPTANCE_MESSAGE } from "@/lib/legal/versions";

/**
 * Shared auth validation. Used both client-side (React Hook Form resolver) and
 * server-side (inside every action) so the browser never has the only say.
 */

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

/**
 * Password policy for account creation / reset. Deliberately readable rules so
 * the UI can surface exactly what's missing.
 */
const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Keep it under 72 characters") // bcrypt input ceiling
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80),
    email,
    password: strongPassword,
    confirmPassword: z.string(),
    legalAccepted: z
      .boolean()
      .refine((value) => value === true, { message: LEGAL_ACCEPTANCE_MESSAGE }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

/** 6-digit TOTP code, or a recovery code entered on the fallback screen. */
export const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});

export const recoveryCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(8, "Enter one of your saved recovery codes"),
});

export const invitationSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type TotpInput = z.infer<typeof totpSchema>;
export type RecoveryCodeInput = z.infer<typeof recoveryCodeSchema>;
export type InvitationInput = z.infer<typeof invitationSchema>;
