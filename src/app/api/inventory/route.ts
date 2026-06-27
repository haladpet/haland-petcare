import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  getLowStockItems,
  getExpiringSoonItems,
  createInventoryItem,
  addBatch,
  getStock,
  findByClinic,
} from "@/lib/db/server/repositories/inventory.repo";

const getHandler = withPermission("inventory")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const filter = url.searchParams.get("filter");
    const threshold = Number(url.searchParams.get("threshold") || "5");
    const daysThreshold = Number(url.searchParams.get("days") || "30");

    try {
      if (filter === "low-stock") {
        const items = await getLowStockItems(req.auth.clinicId, threshold);
        return new Response(JSON.stringify({ data: items }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (filter === "expiring-soon") {
        const items = await getExpiringSoonItems(req.auth.clinicId, daysThreshold);
        return new Response(JSON.stringify({ data: items }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default: return all inventory items with stock
      const allItems = await findByClinic(req.auth.clinicId);

      const enriched = await Promise.all(
        allItems.map(async (item) => {
          const stock = await getStock(item.id);
          return { ...item, current_stock: stock };
        })
      );

      return new Response(JSON.stringify({ data: enriched }), {
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

const postHandler = withPermission("inventory")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { action, ...data } = body;

    try {
      if (action === "add-batch") {
        const batch = await addBatch(data);
        return new Response(JSON.stringify({ data: batch }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Default: create inventory item
      const item = await createInventoryItem(req.auth.clinicId, data);
      return new Response(JSON.stringify({ data: item }), {
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