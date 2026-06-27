import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  getNextInQueue,
  updateQueueStatus,
} from "@/lib/db/server/repositories/queue.repo";

const postHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest, { params }: any) {
    const next = await getNextInQueue(req.auth.clinicId);
    if (!next)
      return new Response(JSON.stringify({ error: "No queue available" }), {
        status: 404,
      });
    const updated = await updateQueueStatus(req.auth.clinicId, next.id, "IN_PROGRESS");
    return new Response(JSON.stringify({ data: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const POST = postHandler;