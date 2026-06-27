import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";
import {
  processPayment,
  getPaymentsByInvoice,
} from "@/lib/db/server/repositories/payment.repo";

const getHandler = withPermission("pos_payment")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("invoice_id");

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payments = await getPaymentsByInvoice(invoiceId);
    return new Response(JSON.stringify({ data: payments }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("pos_payment")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const { invoice_id, amount, method } = body;

    if (!invoice_id || !amount || !method) {
      return new Response(
        JSON.stringify({ error: "invoice_id, amount, and method are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const result = await processPayment(req.auth.clinicId, {
        invoice_id,
        amount: Number(amount),
        method,
      });
      return new Response(JSON.stringify({ data: result }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      const message = err.message || String(err);
      const status = message.includes("OVERPAYMENT")
        ? 400
        : message.includes("INSUFFICIENT_STOCK")
          ? 409
          : message.includes("CANCELLED")
            ? 400
            : message.includes("NOT_FOUND")
              ? 404
              : 500;

      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  }
);

export const GET = getHandler;
export const POST = postHandler;