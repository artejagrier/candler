import { isSupabaseConfigured } from "@/lib/env";
import { FormStatus } from "@/components/auth/FormStatus";

/**
 * Shown only when Supabase credentials are absent. Makes the app's "preview
 * mode" explicit rather than letting sign-in silently fail — the forms are real
 * and wired; they just need keys in `.env.local` to talk to a project.
 */
export function AuthConfigNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="mb-4">
      <FormStatus
        type="info"
        message="Preview mode — add your Supabase keys to .env.local to enable live authentication."
      />
    </div>
  );
}
