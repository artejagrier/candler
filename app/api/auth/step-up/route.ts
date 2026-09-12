import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { grantStepUpCookie } from "@/lib/data/auth";
import { safeErrorResponse } from "@/lib/security/redaction";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return safeErrorResponse("Authentication required.", 401);

  try {
    const { password } = z.object({ password: z.string().min(1).max(200) }).parse(await request.json());
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    if (error) return safeErrorResponse("Password verification failed.", 403);
    await grantStepUpCookie(user.id);
    return Response.json({ ok: true, validForSeconds: 15 * 60 });
  } catch {
    return safeErrorResponse("Recent authentication could not be confirmed.", 400);
  }
}
