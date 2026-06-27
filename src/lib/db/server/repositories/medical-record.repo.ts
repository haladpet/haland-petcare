import { getServerDb } from "@/lib/db/server/client";
import { medicalRecords } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface MedicalRecordData {
  customer_id?: string;
  pet_id?: string;
  visit_date?: Date;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
}

export const createMedicalRecord = async (clinicId: string, data: MedicalRecordData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    customer_id: data.customer_id || "",
    pet_id: data.pet_id || "",
    visit_date: data.visit_date || new Date(),
    diagnosis: data.diagnosis || null,
    treatment: data.treatment || null,
    notes: data.notes || null,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(medicalRecords).values(record);
  return record;
};

export const updateMedicalRecord = async (
  clinicId: string,
  id: string,
  patch: MedicalRecordData
) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(medicalRecords)
    .set(updated)
    .where(withClinicAndFilter(medicalRecords, clinicId, eq(medicalRecords.id, id)));
  return { id, ...updated };
};

export const findById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(medicalRecords)
    .where(withClinicAndFilter(medicalRecords, clinicId, eq(medicalRecords.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByPet = async (clinicId: string, petId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(medicalRecords)
    .where(withClinicAndFilter(medicalRecords, clinicId, eq(medicalRecords.pet_id, petId)));
};

export const findByPetId = findByPet;

export const countByPetId = async (clinicId: string, petId: string) => {
  const db = getServerDb();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(medicalRecords)
    .where(withClinicAndFilter(medicalRecords, clinicId, eq(medicalRecords.pet_id, petId)));
  return result?.count || 0;
};