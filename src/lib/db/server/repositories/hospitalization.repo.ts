import { getServerDb } from "@/lib/db/server/client";
import {
  hospitalizations,
  hospitalizationRateHistory,
  hospitalizationMonitoring,
} from "@/lib/db/server/schema";
import { withClinicFilter, withClinicAndFilter } from "@/lib/security/tenant-guard";
import { eq, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

interface HospitalizationData {
  customer_id?: string;
  pet_id?: string;
  cage_id?: string;
  admission_date?: Date;
  discharge_date?: Date;
  status?: string;
  notes?: string;
}

interface RateHistoryData {
  hospitalization_id?: string;
  daily_cost?: string;
  effective_from?: Date;
  effective_to?: Date;
}

interface MonitoringData {
  hospitalization_id?: string;
  monitored_at?: Date;
  vital_signs?: unknown;
  notes?: string;
}

export const createHospitalization = async (clinicId: string, data: HospitalizationData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    customer_id: data.customer_id || "",
    pet_id: data.pet_id || "",
    cage_id: data.cage_id || null,
    admission_date: data.admission_date || new Date(),
    discharge_date: data.discharge_date || null,
    status: data.status || "ACTIVE",
    notes: data.notes || null,
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(hospitalizations).values(record);
  return record;
};

export const updateHospitalization = async (
  clinicId: string,
  id: string,
  patch: HospitalizationData
) => {
  const db = getServerDb();
  const updated = { ...patch, updated_at: new Date() };
  await db
    .update(hospitalizations)
    .set(updated)
    .where(withClinicAndFilter(hospitalizations, clinicId, eq(hospitalizations.id, id)));
  return { id, ...updated };
};

export const dischargeHospitalization = async (clinicId: string, id: string, dischargeDate: Date) => {
  const db = getServerDb();
  const updated = {
    discharge_date: dischargeDate,
    status: "DISCHARGED",
    updated_at: new Date(),
  };
  await db
    .update(hospitalizations)
    .set(updated)
    .where(withClinicAndFilter(hospitalizations, clinicId, eq(hospitalizations.id, id)));
  return { id, ...updated };
};

export const dischargePatient = dischargeHospitalization;

export const findById = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const res = await db
    .select()
    .from(hospitalizations)
    .where(withClinicAndFilter(hospitalizations, clinicId, eq(hospitalizations.id, id)))
    .limit(1);
  return res[0] || null;
};

export const findHospitalizationById = findById;

export const findActiveByClinic = async (clinicId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(hospitalizations)
    .where(withClinicFilter(hospitalizations, clinicId));
};

export const findActiveHospitalizations = findActiveByClinic;

export const findAll = async (
  clinicId: string,
  options?: { status?: string; limit?: number; offset?: number }
) => {
  const db = getServerDb();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  let query = db
    .select()
    .from(hospitalizations)
    .where(withClinicFilter(hospitalizations, clinicId));

  if (options?.status) {
    query = query.where(eq(hospitalizations.status, options.status)) as typeof query;
  }

  return query.orderBy(desc(hospitalizations.created_at)).limit(limit).offset(offset);
};

export const admitPatient = async (
  clinicId: string,
  data: {
    customer_id: string;
    pet_id: string;
    cage_id?: string;
    notes?: string;
  }
) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    clinic_id: clinicId,
    customer_id: data.customer_id,
    pet_id: data.pet_id,
    cage_id: data.cage_id || null,
    notes: data.notes || null,
    admission_date: new Date(),
    status: "ACTIVE",
    version: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };
  await db.insert(hospitalizations).values(record);
  return record;
};

export const calculateTotalCost = async (clinicId: string, id: string) => {
  const db = getServerDb();
  const [hospitalization] = await db
    .select()
    .from(hospitalizations)
    .where(withClinicAndFilter(hospitalizations, clinicId, eq(hospitalizations.id, id)))
    .limit(1);
  if (!hospitalization) return 0;

  const endDate = hospitalization.discharge_date || new Date();
  const startDate = hospitalization.admission_date || endDate;
  const daysHospitalized = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  const [rate] = await db
    .select()
    .from(hospitalizationRateHistory)
    .where(eq(hospitalizationRateHistory.hospitalization_id, id))
    .orderBy(desc(hospitalizationRateHistory.effective_from))
    .limit(1);

  const dailyCost = rate ? parseFloat(rate.daily_cost as string) || 0 : 0;
  return dailyCost * daysHospitalized;
};

export const createMonitoringEntry = async (data: {
  hospitalization_id: string;
  vital_signs?: unknown;
  notes?: string;
}) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = {
    id,
    hospitalization_id: data.hospitalization_id,
    vital_signs: data.vital_signs || null,
    notes: data.notes || null,
    monitored_at: new Date(),
  };
  await db.insert(hospitalizationMonitoring).values(record);
  return record;
};

export const addRateHistory = async (data: RateHistoryData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = { id, ...data, created_at: new Date() };
  await db.insert(hospitalizationRateHistory).values(record);
  return record;
};

export const addMonitoring = async (data: MonitoringData) => {
  const db = getServerDb();
  const id = uuidv4();
  const record = { id, ...data };
  await db.insert(hospitalizationMonitoring).values(record);
  return record;
};

export const getMonitoringEntries = async (hospitalizationId: string) => {
  const db = getServerDb();
  return db
    .select()
    .from(hospitalizationMonitoring)
    .where(eq(hospitalizationMonitoring.hospitalization_id, hospitalizationId))
    .orderBy(desc(hospitalizationMonitoring.monitored_at));
};

export const updateDailyCost = async (id: string, dailyCost: string) => {
  const db = getServerDb();
  const record = {
    id: uuidv4(),
    hospitalization_id: id,
    daily_cost: dailyCost,
    effective_from: new Date(),
    created_at: new Date(),
  };
  await db.insert(hospitalizationRateHistory).values(record);
  return record;
};