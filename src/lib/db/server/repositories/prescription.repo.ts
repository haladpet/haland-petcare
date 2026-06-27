import { getServerDb } from "@/lib/db/server/client";
import { prescriptions, prescriptionItems } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface PrescriptionData {
  customer_id?: string;
  pet_id?: string;
  prescribed_by?: string;
  status?: string;
  notes?: string;
}

interface PrescriptionItemData {
  prescription_id?: string;
  medicine_id?: string;
  dosage?: string;
  quantity?: number;
  instructions?: string;
}

export const createPrescription = async (clinicId: string, data: PrescriptionData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    customer_id: data.customer_id || "",
    pet_id: data.pet_id || "",
    prescribed_by: data.prescribed_by || null,
    date: new Date(),
    status: data.status || "ACTIVE",
    notes: data.notes || null,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(prescriptions).values(record as any);
  return record;
};

export const updatePrescription = async (
  clinicId: string,
  id: string,
  patch: PrescriptionData
) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(prescriptions)
    .set(updated as any)
    .where(withClinicAndFilter(prescriptions, clinicId, eq(prescriptions.id, id)));
  return { id, ...updated };
};

export const findPrescriptionById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(prescriptions)
    .where(withClinicAndFilter(prescriptions, clinicId, eq(prescriptions.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByPet = async (clinicId: string, petId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(prescriptions)
    .where(withClinicAndFilter(prescriptions, clinicId, eq(prescriptions.pet_id, petId)));
};

export const findPrescriptionsByPetId = findByPet;

export const addPrescriptionItem = async (data: PrescriptionItemData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = { id, ...data };
  await db.insert(prescriptionItems).values(record as any);
  return record;
};