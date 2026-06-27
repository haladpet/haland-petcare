import { NextResponse } from "next/server";
import { search as searchCustomers, createCustomer } from "@/lib/db/server/repositories/customer.repo";
import { CreateCustomerSchema } from "@/lib/validation/customer";
import { withPermission, type AuthenticatedRequest } from "@/lib/permissions/middleware";

const getHandler = withPermission("queue_management")(
  async function handler(req: AuthenticatedRequest) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    const page = Number(url.searchParams.get("page") || "1");
    const limit = Number(url.searchParams.get("limit") || "20");
    const res = await searchCustomers(req.auth.clinicId, q, page, limit);
    return new Response(JSON.stringify({ data: res }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
);

const postHandler = withPermission("customer_create")(
  async function handler(req: AuthenticatedRequest) {
    const body = await req.json();
    const parsed = CreateCustomerSchema.safeParse(body);
    if (!parsed.success)
      return new Response(JSON.stringify({ error: parsed.error.issues }), { status: 400 });
    const record = await createCustomer(req.auth.clinicId, parsed.data);
    return new Response(JSON.stringify({ data: record }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  }
);

export const GET = getHandler;
export const POST = postHandler;