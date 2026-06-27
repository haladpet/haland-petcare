import { getServerDb } from "@/lib/db/server/client";
import { cages } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface CageData {
  code?: string;
  description?: string;
  type?: string;
  status?: string;
}

export const createCage = async (clinicId: string, data: CageData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    code: data.code || "",
    description: data.description || null,
    type: data.type || null,
    status: data.status || "AVAILABLE",
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(cages).values(record);
  return record;
};

export const updateCage = async (clinicId: string, id: string, patch: CageData) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(cages)
    .set(updated)
    .where(withClinicAndFilter(cages, clinicId, eq(cages.id, id)));
  return { id, ...updated };
};

export const findCageById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(cages)
    .where(withClinicAndFilter(cages, clinicId, eq(cages.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByClinic = async (clinicId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(cages)
    .where(withClinicFilter(cages, clinicId));
};

export const findAll = async (clinicId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(cages)
    .where(withClinicFilter(cages, clinicId));
};