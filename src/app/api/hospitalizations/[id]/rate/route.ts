import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { updateDailyCost } from "@/lib/db/server/repositories/hospitalization.repo";

const patchHandler = withPermission("hospitalization")(
  async function handler(
    req: AuthenticatedRequest,
    ctx: { params: Promise<{ id: string }> }
  ) {
    const { id } = await ctx.params;
    const body = await req.json();
    const { daily_cost } = body;

    if (!daily_cost || typeof daily_cost !== "number" || daily_cost <= 0) {
      return new Response(
        JSON.stringify({ error: "daily_cost must be a positive number" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const result = await updateDailyCost(id, daily_cost.toString());
      return new Response(JSON.stringify({ data: result }), {
        status: 200,
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

export const PATCH = patchHandler;