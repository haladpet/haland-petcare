import { getServerDb } from "@/lib/db/server/client";
import { queues } from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, and, asc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface QueueData {
  appointment_id?: string;
  customer_id?: string;
  pet_id?: string;
  doctor_id?: string;
  queue_number?: string;
  priority?: string;
  position?: number;
  status?: string;
}

export const createQueue = async (clinicId: string, data: QueueData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    appointment_id: data.appointment_id || null,
    customer_id: data.customer_id || "",
    pet_id: data.pet_id || null,
    doctor_id: data.doctor_id || null,
    queue_number: data.queue_number || "",
    priority: data.priority || "NORMAL",
    position: data.position || 0,
    status: data.status || "WAITING",
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(queues).values(record as any);
  return record;
};

export const updateQueue = async (clinicId: string, id: string, patch: QueueData) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(queues)
    .set(updated as any)
    .where(withClinicAndFilter(queues, clinicId, eq(queues.id, id)));
  return { id, ...updated };
};

export const findById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(queues)
    .where(withClinicAndFilter(queues, clinicId, eq(queues.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findByClinic = async (clinicId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(queues)
    .where(withClinicFilter(queues, clinicId));
};

export const getNextInQueue = async (clinicId: string) => {
  const db = getServerDb();
  const [next] = await db
    .select()
    .from(queues)
    .where(
      withClinicAndFilter(queues, clinicId, eq(queues.status, "WAITING"))
    )
    .orderBy(asc(queues.position))
    .limit(1);
  return next || null;
};

export const updateQueueStatus = async (clinicId: string, id: string, status: string) => {
  const db = getServerDb();
  const updated = { status, updated_at: new Date() };
  await db
    .update(queues)
    .set(updated as any)
    .where(withClinicAndFilter(queues, clinicId, eq(queues.id, id)));
  return { id, ...updated };
};

export const getQueueStatus = async (clinicId: string) => {
  const db = getServerDb();

  const [waiting] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queues)
    .where(
      withClinicAndFilter(queues, clinicId, eq(queues.status, "WAITING"))
    );

  const [inProgress] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queues)
    .where(
      withClinicAndFilter(queues, clinicId, eq(queues.status, "IN_PROGRESS"))
    );

  const [completed] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queues)
    .where(
      withClinicAndFilter(queues, clinicId, eq(queues.status, "COMPLETED"))
    );

  return {
    waiting: waiting?.count || 0,
    inProgress: inProgress?.count || 0,
    completed: completed?.count || 0,
    total: (waiting?.count || 0) + (inProgress?.count || 0) + (completed?.count || 0),
  };
};