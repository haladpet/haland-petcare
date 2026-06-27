import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  getRevenueReport,
  getVisitsByDoctor,
  getMostPrescribedMedicines,
  getCageOccupancyRate,
  getDailyVisitCount,
  getSummaryStats,
} from "@/lib/db/server/repositories/report.repo";

const getHandler = withPermission("reports")(
  async function handler(
    req: AuthenticatedRequest,
    ctx: { params: Promise<{ type: string }> }
  ) {
    const { type } = await ctx.params;
    const url = new URL(req.url);
    const dateFrom =
      url.searchParams.get("from") ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const dateTo =
      url.searchParams.get("to") || new Date().toISOString().split("T")[0];
    const limit = Number(url.searchParams.get("limit") || "10");

    try {
      let data: any;

      switch (type) {
        case "revenue":
          data = await getRevenueReport(
            req.auth.clinicId,
            new Date(dateFrom),
            new Date(dateTo)
          );
          break;
        case "visits-by-doctor":
          data = await getVisitsByDoctor(
            req.auth.clinicId,
            new Date(dateFrom),
            new Date(dateTo)
          );
          break;
        case "most-prescribed":
          data = await getMostPrescribedMedicines(req.auth.clinicId, limit);
          break;
        case "cage-occupancy":
          data = await getCageOccupancyRate(req.auth.clinicId);
          break;
        case "daily-visits":
          data = await getDailyVisitCount(
            req.auth.clinicId,
            new Date(dateFrom),
            new Date(dateTo)
          );
          break;
        case "summary":
          data = await getSummaryStats(req.auth.clinicId);
          break;
        default:
          return new Response(
            JSON.stringify({ error: `Unknown report type: ${type}` }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
      }

      return new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
);

export const GET = getHandler;