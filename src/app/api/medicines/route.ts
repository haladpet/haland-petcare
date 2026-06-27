import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { getServerDb } from "@/lib/db/server/client";
import { medicines } from "@/lib/db/server/schema";
import { withClinicFilter } from "@/lib/security/tenant-guard";
import { eq, ilike, or, sql } from "drizzle-orm";

const getHandler = withPermission("prescriptions")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";

    const db = getServerDb();

    let query = db.select().from(medicines).where(withClinicFilter(medicines, req.auth.clinicId));

    if (q) {
      const pattern = `%${q}%`;
      query = query.where(
        or(
          ilike(medicines.name, pattern),
          ilike(medicines.description || sql`""`, pattern)
        )
      );
    }

    const results = await query.orderBy(medicines.name).limit(50);

    return new Response(JSON.stringify({ data: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const GET = getHandler;