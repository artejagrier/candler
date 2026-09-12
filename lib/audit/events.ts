import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { redactSensitive } from "@/lib/security/redaction";

export async function emitAuditEvent(input: { workspaceId: string; actorId: string; eventType: string; targetType: string; targetId?: string; metadata?: Record<string, unknown> }) {
  const safeMetadata = redactSensitive(input.metadata ?? {}) as Record<string, unknown>;
  const supabase = createAdminClient();
  const { error } = await supabase.from("audit_events").insert({ workspace_id: input.workspaceId, actor_id: input.actorId, event_type: input.eventType, target_type: input.targetType, target_id: input.targetId ?? null, metadata: safeMetadata });
  if (error) throw new Error("The operation completed but its audit event could not be recorded.");
}
