import { stripeClient } from "@/lib/billing/stripe";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/env";
import { safeErrorResponse } from "@/lib/security/redaction";
import { getWorkspaceContext } from "@/lib/data/workspace";

export async function POST() {
  const context = await getWorkspaceContext();
  if (!context) return safeErrorResponse("Authentication required.", 401);

  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", context.workspaceId)
    .eq("owner_id", context.userId)
    .not("stripe_customer_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (!data) return safeErrorResponse("No billing account found.", 404);

  try {
    const portal = await stripeClient().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${SITE_URL}/app/settings/billing`,
    });
    return Response.json({ url: portal.url });
  } catch {
    return safeErrorResponse("Billing portal could not be opened.", 503);
  }
}
