import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { getQueueStatus, createQueue } from "@/lib/db/server/repositories/queue.repo";

const getHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest) {
    const status = await getQueueStatus(req.auth.clinicId);
    return new Response(JSON.stringify({ data: status }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { customer_id, pet_id, doctor_id, priority } = body;
    if (!customer_id)
      return new Response(JSON.stringify({ error: "customer_id required" }), {
        status: 400,
      });
    const record = await createQueue(req.auth.clinicId, {
      customer_id,
      pet_id,
      doctor_id,
      priority,
    });
    return new Response(JSON.stringify({ data: record }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const GET = getHandler;
export const POST = postHandler;