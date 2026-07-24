"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { contactSchema, type ContactInput } from "@/lib/marketing/contact-schema";

export type ContactResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Persist a contact message to the `contact_messages` table (insert-only under
 * RLS). Honest behavior: with no Supabase project wired up it returns a clear
 * notice instead of pretending the message was delivered.
 */
export async function submitContactAction(
  input: ContactInput,
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the form.",
    };
  }

  if (!isSupabaseConfigured) {
    return {
      ok: false,
      error:
        "Messaging isn't wired up in this preview. Add Supabase keys and run the contact_messages migration to enable it.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(parsed.data);
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    message: "Thanks — your message is in. We'll get back to you soon.",
  };
}
