import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { updateQueueStatus } from "@/lib/db/server/repositories/queue.repo";

const patchHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest, { params }: any) {
    const body = await req.json();
    const { status } = body;
    if (!status)
      return new Response(JSON.stringify({ error: "status required" }), { status: 400 });
    const updated = await updateQueueStatus(req.auth.clinicId, params.id, status);
    return new Response(JSON.stringify({ data: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const PATCH = patchHandler;