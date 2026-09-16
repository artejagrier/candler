import { paddleClient } from "@/lib/billing/paddle";
import { createClient } from "@/lib/supabase/server";
import { safeErrorResponse } from "@/lib/security/redaction";
import { getWorkspaceContext } from "@/lib/data/workspace";

export async function POST() {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("paddle_customer_id, paddle_subscription_id")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .not("paddle_customer_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (!data) return safeErrorResponse("No billing account found.", 404);

  try {
    const subscriptionIds = data.paddle_subscription_id ? [data.paddle_subscription_id] : [];
    const session = await paddleClient().customerPortalSessions.create(
      data.paddle_customer_id,
      subscriptionIds,
    );
    return Response.json({ url: session.urls.general.overview });
  } catch {
    return safeErrorResponse("Billing portal could not be opened.", 503);
  }
}
