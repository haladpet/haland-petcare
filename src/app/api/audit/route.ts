import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { getServerDb } from "@/lib/db/server/client";
import { auditLogs } from "@/lib/db/server/schema";
import { withClinicFilter } from "@/lib/security/tenant-guard";
import { eq, ilike, gte, lte, and, desc, sql } from "drizzle-orm";

const getHandler = withPermission("reports")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || "50")));
    const offset = (page - 1) * limit;

    const action = url.searchParams.get("action") || "";
    const entity = url.searchParams.get("entity") || "";
    const userId = url.searchParams.get("user_id") || "";
    const dateFrom = url.searchParams.get("from") || "";
    const dateTo = url.searchParams.get("to") || "";

    const db = getServerDb();
    const conditions: any[] = [withClinicFilter(auditLogs, req.auth.clinicId)];

    if (action) conditions.push(ilike(auditLogs.action, `%${action}%`));
    if (entity) conditions.push(ilike(auditLogs.entity || sql`""`, `%${entity}%`));
    if (userId) conditions.push(eq(auditLogs.user_id, userId));
    if (dateFrom) conditions.push(gte(auditLogs.created_at, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(auditLogs.created_at, new Date(dateTo)));

    const query = db.select().from(auditLogs).where(and(...conditions));

    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)::int`.mapWith(Number) })
      .from(auditLogs)
      .where(and(...conditions));

    const total = countResult?.count || 0;

    const rows = await query
      .orderBy(desc(auditLogs.created_at))
      .limit(limit)
      .offset(offset);

    return new Response(
      JSON.stringify({
        data: rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
);

export const GET = getHandler;