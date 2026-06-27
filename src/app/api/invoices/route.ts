import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  buildInvoiceFromMedicalRecord,
  findInvoicesByCustomer,
} from "@/lib/db/server/repositories/invoice.repo";

const getHandler = withPermission("pos_payment")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const customerId = url.searchParams.get("customer_id");

    if (customerId) {
      const invoices = await findInvoicesByCustomer(req.auth.clinicId, customerId);
      return new Response(JSON.stringify({ data: invoices }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "customer_id is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("pos_payment")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { medical_record_id, customer_id } = body;

    if (!medical_record_id || !customer_id) {
      return new Response(
        JSON.stringify({ error: "medical_record_id and customer_id are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const result = await buildInvoiceFromMedicalRecord(
        req.auth.clinicId,
        medical_record_id,
        customer_id
      );
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