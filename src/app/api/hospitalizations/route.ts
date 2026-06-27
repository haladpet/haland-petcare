import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  admitPatient,
  findActiveHospitalizations,
} from "@/lib/db/server/repositories/hospitalization.repo";

const getHandler = withPermission("hospitalization")(
  async function handler(req: AuthenticatedRequest) {
    const hospitalizations = await findActiveHospitalizations(req.auth.clinicId);
    return new Response(JSON.stringify({ data: hospitalizations }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("hospitalization")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { pet_id, cage_id, reason, customer_id } = body;

    if (!pet_id || !cage_id || !reason || !customer_id) {
      return new Response(
        JSON.stringify({
          error: "pet_id, cage_id, reason, and customer_id are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const result = await admitPatient(req.auth.clinicId, {
        pet_id,
        cage_id,
        customer_id,
        notes: reason,
      });
      return new Response(JSON.stringify({ data: result }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
);

export const GET = getHandler;
export const POST = postHandler;