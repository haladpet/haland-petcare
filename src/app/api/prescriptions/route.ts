import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  createPrescription,
  findPrescriptionsByPetId,
} from "@/lib/db/server/repositories/prescription.repo";

const getHandler = withPermission("prescriptions")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const petId = url.searchParams.get("pet_id");

    if (!petId) {
      return new Response(JSON.stringify({ error: "pet_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prescriptions = await findPrescriptionsByPetId(req.auth.clinicId, petId);
    return new Response(JSON.stringify({ data: prescriptions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("prescriptions")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { customer_id, pet_id, prescribed_by, notes, items } = body;

    if (!customer_id || !pet_id || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: "customer_id, pet_id, and items[] are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await createPrescription(req.auth.clinicId, {
      customer_id,
      pet_id,
      prescribed_by,
      notes,
    });

    return new Response(JSON.stringify({ data: result }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const GET = getHandler;
export const POST = postHandler;