import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  jsonb,
  check,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const serverUsers = pgTable(
  "server_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    password_hash: varchar("password_hash", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    full_name: varchar("full_name", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("CUSTOMER"),
    clinic_id: uuid("clinic_id").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    last_login_at: timestamp("last_login_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    email_idx: index("server_users_email_idx").on(table.email),
    role_check: check(
      "server_users_role_check",
      sql`${table.role} in ('OWNER', 'DOCTOR', 'STAFF', 'CUSTOMER')`,
    ),
    status_check: check(
      "server_users_status_check",
      sql`${table.status} in ('ACTIVE', 'INACTIVE', 'SUSPENDED')`,
    ),
    clinic_idx: index("server_users_clinic_id_idx").on(table.clinic_id),
  }),
);

export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    address: text("address"),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    metadata: jsonb("metadata"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    name_idx: index("clinics_name_idx").on(table.name),
    status_idx: index("clinics_status_idx").on(table.status),
  }),
);

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id").notNull(),
    device_fingerprint_hash: varchar("device_fingerprint_hash", {
      length: 255,
    }).notNull(),
    device_secret: varchar("device_secret", { length: 255 }).notNull(),
    platform: varchar("platform", { length: 100 }),
    last_seen_at: timestamp("last_seen_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    user_idx: index("devices_user_id_idx").on(table.user_id),
  }),
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    full_name: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    address: text("address"),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    metadata: jsonb("metadata"),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    clinic_idx: index("customers_clinic_id_idx").on(table.clinic_id),
    email_idx: index("customers_email_idx").on(table.email),
  }),
);

export const pets = pgTable(
  "pets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customer_id: uuid("customer_id").notNull(),
    clinic_id: uuid("clinic_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    species: varchar("species", { length: 100 }),
    age_unit: varchar("age_unit", { length: 20 }),
    breed: varchar("breed", { length: 100 }),
    gender: varchar("gender", { length: 20 }),
    date_of_birth: timestamp("date_of_birth"),
    color: varchar("color", { length: 100 }),
    weight: decimal("weight", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    version: integer("version").notNull().default(1),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    customer_idx: index("pets_customer_id_idx").on(table.customer_id),
    clinic_idx: index("pets_clinic_id_idx").on(table.clinic_id),
    species_idx: index("pets_species_idx").on(table.species),
    species_check: check(
      "pets_species_check",
      sql`${table.species} in ('DOG', 'CAT', 'BIRD', 'OTHER') OR ${table.species} IS NULL`,
    ),
    gender_check: check(
      "pets_gender_check",
      sql`${table.gender} in ('MALE', 'FEMALE', 'UNKNOWN') OR ${table.gender} IS NULL`,
    ),
    age_unit_check: check(
      "pets_age_unit_check",
      sql`${table.age_unit} in ('YEARS', 'MONTHS') OR ${table.age_unit} IS NULL`,
    ),
  }),
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    customer_id: uuid("customer_id").notNull(),
    pet_id: uuid("pet_id"),
    doctor_id: uuid("doctor_id"),
    scheduled_at: timestamp("scheduled_at").notNull(),
    status: varchar("status", { length: 50 }).notNull().default("SCHEDULED"),
    reason: text("reason"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
    deleted_at: timestamp("deleted_at"),
  },
  (table) => ({
    clinic_idx: index("appointments_clinic_id_idx").on(table.clinic_id),
    scheduled_idx: index("appointments_scheduled_at_idx").on(table.scheduled_at),
    status_idx: index("appointments_status_idx").on(table.status),
  }),
);

export const queues = pgTable(
  "queues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    appointment_id: uuid("appointment_id"),
    customer_id: uuid("customer_id").notNull(),
    pet_id: uuid("pet_id"),
    doctor_id: uuid("doctor_id"),
    queue_number: varchar("queue_number", { length: 100 }).notNull(),
    priority: varchar("priority", { length: 50 }).notNull().default("NORMAL"),
    actual_start_time: timestamp("actual_start_time"),
    position: integer("position").notNull().default(0),
    status: varchar("status", { length: 50 }).notNull().default("WAITING"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("queues_clinic_id_idx").on(table.clinic_id),
    appointment_idx: index("queues_appointment_id_idx").on(table.appointment_id),
    queue_number_idx: uniqueIndex("queues_queue_number_idx").on(table.queue_number),
    priority_idx: index("queues_priority_idx").on(table.priority),
  }),
);

export const medicalRecords = pgTable(
  "medical_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    customer_id: uuid("customer_id").notNull(),
    pet_id: uuid("pet_id").notNull(),
    visit_date: timestamp("visit_date").notNull(),
    diagnosis: text("diagnosis"),
    treatment: text("treatment"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("medical_records_clinic_id_idx").on(table.clinic_id),
    pet_idx: index("medical_records_pet_id_idx").on(table.pet_id),
  }),
);

export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    customer_id: uuid("customer_id").notNull(),
    pet_id: uuid("pet_id").notNull(),
    prescribed_by: uuid("prescribed_by"),
    date: timestamp("date").defaultNow().notNull(),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("prescriptions_clinic_id_idx").on(table.clinic_id),
    customer_idx: index("prescriptions_customer_id_idx").on(table.customer_id),
    pet_idx: index("prescriptions_pet_id_idx").on(table.pet_id),
  }),
);

export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prescription_id: uuid("prescription_id").notNull(),
    medicine_id: uuid("medicine_id").notNull(),
    dosage: varchar("dosage", { length: 100 }),
    quantity: integer("quantity").notNull().default(1),
    instructions: text("instructions"),
  },
  (table) => ({
    prescription_idx: index("prescription_items_prescription_id_idx").on(table.prescription_id),
    medicine_idx: index("prescription_items_medicine_id_idx").on(table.medicine_id),
  }),
);

export const medicines = pgTable(
  "medicines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    unit: varchar("unit", { length: 100 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull().default(sql`0`),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("medicines_clinic_id_idx").on(table.clinic_id),
    name_idx: index("medicines_name_idx").on(table.name),
  }),
);

export const cages = pgTable(
  "cages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    description: text("description"),
    type: varchar("type", { length: 100 }),
    status: varchar("status", { length: 50 }).notNull().default("AVAILABLE"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("cages_clinic_id_idx").on(table.clinic_id),
    code_idx: index("cages_code_idx").on(table.code),
  }),
);

export const hospitalizations = pgTable(
  "hospitalizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    customer_id: uuid("customer_id").notNull(),
    pet_id: uuid("pet_id").notNull(),
    cage_id: uuid("cage_id"),
    admission_date: timestamp("admission_date").notNull(),
    discharge_date: timestamp("discharge_date"),
    status: varchar("status", { length: 50 }).notNull().default("ACTIVE"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("hospitalizations_clinic_id_idx").on(table.clinic_id),
    pet_idx: index("hospitalizations_pet_id_idx").on(table.pet_id),
  }),
);

export const hospitalizationRateHistory = pgTable(
  "hospitalization_rate_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hospitalization_id: uuid("hospitalization_id").notNull(),
    daily_cost: decimal("daily_cost", { precision: 10, scale: 2 }).notNull(),
    effective_from: timestamp("effective_from").notNull(),
    effective_to: timestamp("effective_to"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    hospitalization_idx: index("hospitalization_rate_history_hospitalization_id_idx").on(table.hospitalization_id),
    effective_from_idx: index("hospitalization_rate_history_effective_from_idx").on(table.effective_from),
  }),
);

export const hospitalizationMonitoring = pgTable(
  "hospitalization_monitoring",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hospitalization_id: uuid("hospitalization_id").notNull(),
    monitored_at: timestamp("monitored_at").defaultNow().notNull(),
    vital_signs: jsonb("vital_signs"),
    notes: text("notes"),
  },
  (table) => ({
    hospitalization_idx: index("hospitalization_monitoring_hospitalization_id_idx").on(table.hospitalization_id),
  }),
);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    description: text("description"),
    unit: varchar("unit", { length: 100 }),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    clinic_idx: index("inventory_items_clinic_id_idx").on(table.clinic_id),
    sku_idx: index("inventory_items_sku_idx").on(table.sku),
  }),
);

export const inventoryBatches = pgTable(
  "inventory_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inventory_item_id: uuid("inventory_item_id").notNull(),
    batch_number: varchar("batch_number", { length: 100 }),
    quantity: integer("quantity").notNull().default(0),
    received_at: timestamp("received_at"),
    expires_at: timestamp("expires_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    inventory_item_idx: index("inventory_batches_inventory_item_id_idx").on(table.inventory_item_id),
    batch_number_idx: index("inventory_batches_batch_number_idx").on(table.batch_number),
  }),
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    inventory_item_id: uuid("inventory_item_id").notNull(),
    batch_id: uuid("batch_id"),
    clinic_id: uuid("clinic_id").notNull(),
    transaction_type: varchar("transaction_type", { length: 50 }).notNull().default("OUTGOING"),
    quantity: integer("quantity").notNull(),
    reference_id: uuid("reference_id"),
    notes: text("notes"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    item_idx: index("inventory_transactions_inventory_item_id_idx").on(table.inventory_item_id),
    clinic_idx: index("inventory_transactions_clinic_id_idx").on(table.clinic_id),
  }),
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinic_id: uuid("clinic_id").notNull(),
    customer_id: uuid("customer_id").notNull(),
    appointment_id: uuid("appointment_id"),
    total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default(sql`0`),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"),
    issued_at: timestamp("issued_at").defaultNow().notNull(),
    due_date: timestamp("due_date"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    customer_idx: index("invoices_customer_id_idx").on(table.customer_id),
    status_idx: index("invoices_status_idx").on(table.status),
  }),
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoice_id: uuid("invoice_id").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default(sql`0`),
    total_price: decimal("total_price", { precision: 10, scale: 2 }).notNull().default(sql`0`),
  },
  (table) => ({
    invoice_idx: index("invoice_items_invoice_id_idx").on(table.invoice_id),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invoice_id: uuid("invoice_id").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default(sql`0`),
    method: varchar("method", { length: 50 }),
    status: varchar("status", { length: 50 }).notNull().default("COMPLETED"),
    paid_at: timestamp("paid_at").defaultNow().notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    invoice_idx: index("payments_invoice_id_idx").on(table.invoice_id),
    status_idx: index("payments_status_idx").on(table.status),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    user_id: uuid("user_id"),
    clinic_id: uuid("clinic_id"),
    action: varchar("action", { length: 255 }).notNull(),
    entity: varchar("entity", { length: 100 }),
    entity_id: uuid("entity_id"),
    changes: jsonb("changes"),
    ip_address: varchar("ip_address", { length: 45 }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    user_idx: index("audit_logs_user_id_idx").on(table.user_id),
    clinic_idx: index("audit_logs_clinic_id_idx").on(table.clinic_id),
  }),
);

export const syncQueue = pgTable(
  "sync_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entity: varchar("entity", { length: 100 }).notNull(),
    entity_id: uuid("entity_id"),
    action: varchar("action", { length: 50 }).notNull(),
    payload: jsonb("payload"),
    schema_version: integer("schema_version").notNull().default(1),
    status: varchar("status", { length: 50 }).notNull().default("PENDING"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    entity_idx: index("sync_queue_entity_idx").on(table.entity),
    status_idx: index("sync_queue_status_idx").on(table.status),
  }),
);

export const conflictQueue = pgTable(
  "conflict_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entity: varchar("entity", { length: 100 }).notNull(),
    entity_id: uuid("entity_id"),
    conflict_data: jsonb("conflict_data"),
    schema_version: integer("schema_version").notNull().default(1),
    resolved: boolean("resolved").notNull().default(false),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    entity_idx: index("conflict_queue_entity_idx").on(table.entity),
    resolved_idx: index("conflict_queue_resolved_idx").on(table.resolved),
  }),
);

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sync_queue_id: uuid("sync_queue_id"),
    event: varchar("event", { length: 100 }).notNull(),
    details: jsonb("details"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    queue_idx: index("sync_logs_sync_queue_id_idx").on(table.sync_queue_id),
  }),
);

export const serverSchema = {
  serverUsers,
  clinics,
  devices,
  customers,
  pets,
  appointments,
  queues,
  medicalRecords,
  prescriptions,
  prescriptionItems,
  medicines,
  cages,
  hospitalizations,
  hospitalizationRateHistory,
  hospitalizationMonitoring,
  inventoryItems,
  inventoryBatches,
  inventoryTransactions,
  invoices,
  invoiceItems,
  payments,
  auditLogs,
  syncQueue,
  conflictQueue,
  syncLogs,
  sessions,
  revokedTokens,
} as const;
