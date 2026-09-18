import { safeErrorResponse } from "@/lib/security/redaction";
import { requireCloudActor } from "@/lib/cloud/operations";
import { finalizeBatchInput } from "@/lib/cloud/batch-schema";
import { finalizeUploadBatch } from "@/lib/cloud/finalize-batch";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { context, admin } = await requireCloudActor();
    const body = finalizeBatchInput.parse(await request.json());
    const results = await finalizeUploadBatch({ context, admin, ids: body.ids });
    return Response.json({ results });
  } catch {
    return safeErrorResponse("Uploads could not be verified.", 503);
  }
}
