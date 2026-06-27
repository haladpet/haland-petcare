import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { getServerDb } from "@/lib/db/server/client";
import { appointments } from "@/lib/db/server/schema";
import { withClinicFilter } from "@/lib/security/tenant-guard";
import { v4 as uuidv4 } from "uuid";
import { desc } from "drizzle-orm";

const getHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest) {
    const db = getServerDb();
    const rows = await db
      .select()
      .from(appointments)
      .where(withClinicFilter(appointments, req.auth.clinicId))
      .orderBy(desc(appointments.scheduled_at))
      .limit(50);

    return new Response(JSON.stringify({ data: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { customer_id, pet_id, doctor_id, scheduled_at, reason, notes } = body;

    if (!customer_id || !scheduled_at) {
      return new Response(
        JSON.stringify({ error: "customer_id and scheduled_at are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const db = getServerDb();
    const id = uuidv4();
    const record = {
      id,
      clinic_id: req.auth.clinicId,
      customer_id,
      pet_id: pet_id || null,
      doctor_id: doctor_id || null,
      scheduled_at: new Date(scheduled_at),
      status: "SCHEDULED",
      reason: reason || null,
      notes: notes || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.insert(appointments).values(record);

    return new Response(JSON.stringify({ data: record }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const GET = getHandler;
export const POST = postHandler;