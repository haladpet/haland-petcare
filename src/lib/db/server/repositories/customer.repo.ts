import { getServerDb } from "@/lib/db/server/client";
import { customers } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, ilike, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface CustomerData {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  metadata?: unknown;
}

export const createCustomer = async (clinicId: string, data: CustomerData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    full_name: data.full_name || "",
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    status: data.status || "ACTIVE",
    metadata: data.metadata || null,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(customers).values(record);
  return record;
};

export const updateCustomer = async (clinicId: string, id: string, patch: CustomerData) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(customers)
    .set(updated)
    .where(withClinicAndFilter(customers, clinicId, eq(customers.id, id)));
  return { id, ...updated };
};

export const softDeleteCustomer = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const deleted_at = new Date();
  await db
    .update(customers)
    .set({ deleted_at })
    .where(withClinicAndFilter(customers, clinicId, eq(customers.id, id)));
  return { id, deleted_at };
};

export const findById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(customers)
    .where(withClinicAndFilter(customers, clinicId, eq(customers.id, id)))
    .limit(1);
  return res[0] || null;
};

export const search = async (clinicId: string, query: string, page = 1, limit = 20) => {
  const db = getServerDb();
  const offset = (page - 1) * limit;
  const q = `%${query}%`;
  const res = await db
    .select()
    .from(customers)
    .where(
      withClinicAndFilter(
        customers,
        clinicId,
        or(ilike(customers.full_name, q), ilike(customers.phone, q))
      )
    )
    .limit(limit)
    .offset(offset);
  return res;
};