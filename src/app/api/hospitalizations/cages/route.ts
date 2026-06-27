import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import { findAll } from "@/lib/db/server/repositories/cage.repo";

const getHandler = withPermission("hospitalization")(
  async function handler(req: AuthenticatedRequest) {
    const cages = await findAll(req.auth.clinicId);
    return new Response(JSON.stringify({ data: cages }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const GET = getHandler;