import { z } from "zod";

/**
 * Contact form schema. Kept in a plain module (not the "use server" action
 * file, which may only export async functions) so it can be imported by both
 * the client form and the server action.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
  message: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(2000, "Keep it under 2000 characters"),
});

export type ContactInput = z.infer<typeof contactSchema>;
