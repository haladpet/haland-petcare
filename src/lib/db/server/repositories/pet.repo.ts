import { getServerDb } from "@/lib/db/server/client";
import { pets } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, like, or, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface PetData {
  customer_id?: string;
  name?: string;
  species?: string;
  age_unit?: string;
  breed?: string;
  gender?: string;
  date_of_birth?: Date;
  color?: string;
  weight?: string;
  status?: string;
}

export const createPet = async (clinicId: string, data: PetData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    customer_id: data.customer_id || "",
    name: data.name || "",
    species: data.species || null,
    age_unit: data.age_unit || null,
    breed: data.breed || null,
    gender: data.gender || null,
    date_of_birth: data.date_of_birth || null,
    color: data.color || null,
    weight: data.weight || null,
    status: data.status || "ACTIVE",
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(pets).values(record as any);
  return record;
};

export const updatePet = async (clinicId: string, id: string, patch: PetData) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(pets)
    .set(updated as any)
    .where(withClinicAndFilter(pets, clinicId, eq(pets.id, id)));
  return { id, ...updated };
};

export const softDeletePet = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const deleted_at = new Date();
  await db
    .update(pets)
    .set({ deleted_at } as any)
    .where(withClinicAndFilter(pets, clinicId, eq(pets.id, id)));
  return { id, deleted_at };
};

export const findById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(pets)
    .where(withClinicAndFilter(pets, clinicId, eq(pets.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByCustomer = async (clinicId: string, customerId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(pets)
    .where(withClinicAndFilter(pets, clinicId, eq(pets.customer_id, customerId)));
};

export const search = async (
  clinicId: string,
  query: string,
  page: number = 1,
  limit: number = 20
) => {
  const db = getServerDb();
  const offset = (page - 1) * limit;
  const searchPattern = `%${query}%`;

  const results = await db
    .select()
    .from(pets)
    .where(
      withClinicAndFilter(
        pets,
        clinicId,
        or(like(pets.name, searchPattern), like(pets.breed, searchPattern), like(pets.species, searchPattern))
      )
    )
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pets)
    .where(
      withClinicAndFilter(
        pets,
        clinicId,
        or(like(pets.name, searchPattern), like(pets.breed, searchPattern), like(pets.species, searchPattern))
      )
    );

  return {
    data: results,
    total: countResult?.count || 0,
    page,
    limit,
  };
};