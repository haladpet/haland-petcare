CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid,
	"doctor_id" uuid,
	"scheduled_at" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'SCHEDULED' NOT NULL,
	"reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"clinic_id" uuid,
	"action" varchar(255) NOT NULL,
	"entity" varchar(100),
	"entity_id" uuid,
	"changes" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"type" varchar(100),
	"status" varchar(50) DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conflict_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" uuid,
	"conflict_data" jsonb,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"address" text,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_fingerprint_hash" varchar(255) NOT NULL,
	"device_secret" varchar(255) NOT NULL,
	"platform" varchar(100),
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospitalization_monitoring" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospitalization_id" uuid NOT NULL,
	"monitored_at" timestamp DEFAULT now() NOT NULL,
	"vital_signs" jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "hospitalization_rate_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hospitalization_id" uuid NOT NULL,
	"daily_cost" numeric(10, 2) NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hospitalizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"cage_id" uuid,
	"admission_date" timestamp NOT NULL,
	"discharge_date" timestamp,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"batch_number" varchar(100),
	"quantity" integer DEFAULT 0 NOT NULL,
	"received_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(100),
	"description" text,
	"unit" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"batch_id" uuid,
	"clinic_id" uuid NOT NULL,
	"transaction_type" varchar(50) DEFAULT 'OUTGOING' NOT NULL,
	"quantity" integer NOT NULL,
	"reference_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) DEFAULT 0 NOT NULL,
	"total_price" numeric(10, 2) DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"appointment_id" uuid,
	"total_amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"issued_at" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"token" varchar(512) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "local_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'CUSTOMER' NOT NULL,
	"clinic_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"visit_date" timestamp NOT NULL,
	"diagnosis" text,
	"treatment" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"unit" varchar(100),
	"price" numeric(10, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"amount" numeric(10, 2) DEFAULT 0 NOT NULL,
	"method" varchar(50),
	"status" varchar(50) DEFAULT 'COMPLETED' NOT NULL,
	"paid_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"species" varchar(100),
	"age_unit" varchar(20),
	"breed" varchar(100),
	"gender" varchar(20),
	"date_of_birth" timestamp,
	"color" varchar(100),
	"weight" numeric(10, 2),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "pets_species_check" CHECK ("pets"."species" in ('DOG', 'CAT', 'BIRD', 'OTHER') OR "pets"."species" IS NULL),
	CONSTRAINT "pets_gender_check" CHECK ("pets"."gender" in ('MALE', 'FEMALE', 'UNKNOWN') OR "pets"."gender" IS NULL),
	CONSTRAINT "pets_age_unit_check" CHECK ("pets"."age_unit" in ('YEARS', 'MONTHS') OR "pets"."age_unit" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "prescription_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"medicine_id" uuid NOT NULL,
	"dosage" varchar(100),
	"quantity" integer DEFAULT 1 NOT NULL,
	"instructions" text
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid NOT NULL,
	"prescribed_by" uuid,
	"date" timestamp DEFAULT now() NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"appointment_id" uuid,
	"customer_id" uuid NOT NULL,
	"pet_id" uuid,
	"doctor_id" uuid,
	"queue_number" varchar(100) NOT NULL,
	"priority" varchar(50) DEFAULT 'NORMAL' NOT NULL,
	"actual_start_time" timestamp,
	"position" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'WAITING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_queue_id" uuid,
	"event" varchar(100) NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" varchar(100) NOT NULL,
	"entity_id" uuid,
	"action" varchar(50) NOT NULL,
	"payload" jsonb,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "appointments_clinic_id_idx" ON "appointments" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "appointments_status_idx" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_clinic_id_idx" ON "audit_logs" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "cages_clinic_id_idx" ON "cages" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "cages_code_idx" ON "cages" USING btree ("code");--> statement-breakpoint
CREATE INDEX "clinics_name_idx" ON "clinics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clinics_status_idx" ON "clinics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conflict_queue_entity_idx" ON "conflict_queue" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "conflict_queue_resolved_idx" ON "conflict_queue" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "customers_clinic_id_idx" ON "customers" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "devices_user_id_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hospitalization_monitoring_hospitalization_id_idx" ON "hospitalization_monitoring" USING btree ("hospitalization_id");--> statement-breakpoint
CREATE INDEX "hospitalization_rate_history_hospitalization_id_idx" ON "hospitalization_rate_history" USING btree ("hospitalization_id");--> statement-breakpoint
CREATE INDEX "hospitalization_rate_history_effective_from_idx" ON "hospitalization_rate_history" USING btree ("effective_from");--> statement-breakpoint
CREATE INDEX "hospitalizations_clinic_id_idx" ON "hospitalizations" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "hospitalizations_pet_id_idx" ON "hospitalizations" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_inventory_item_id_idx" ON "inventory_batches" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_batches_batch_number_idx" ON "inventory_batches" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "inventory_items_clinic_id_idx" ON "inventory_items" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "inventory_items_sku_idx" ON "inventory_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "inventory_transactions_inventory_item_id_idx" ON "inventory_transactions" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_transactions_clinic_id_idx" ON "inventory_transactions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoices_customer_id_idx" ON "invoices" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "invoices_status_idx" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "medical_records_clinic_id_idx" ON "medical_records" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "medical_records_pet_id_idx" ON "medical_records" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "medicines_clinic_id_idx" ON "medicines" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "medicines_name_idx" ON "medicines" USING btree ("name");--> statement-breakpoint
CREATE INDEX "payments_invoice_id_idx" ON "payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "pets_customer_id_idx" ON "pets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "pets_clinic_id_idx" ON "pets" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "pets_species_idx" ON "pets" USING btree ("species");--> statement-breakpoint
CREATE INDEX "prescription_items_prescription_id_idx" ON "prescription_items" USING btree ("prescription_id");--> statement-breakpoint
CREATE INDEX "prescription_items_medicine_id_idx" ON "prescription_items" USING btree ("medicine_id");--> statement-breakpoint
CREATE INDEX "prescriptions_clinic_id_idx" ON "prescriptions" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "prescriptions_customer_id_idx" ON "prescriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "prescriptions_pet_id_idx" ON "prescriptions" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "queues_clinic_id_idx" ON "queues" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "queues_appointment_id_idx" ON "queues" USING btree ("appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "queues_queue_number_idx" ON "queues" USING btree ("queue_number");--> statement-breakpoint
CREATE INDEX "queues_priority_idx" ON "queues" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "sync_logs_sync_queue_id_idx" ON "sync_logs" USING btree ("sync_queue_id");--> statement-breakpoint
CREATE INDEX "sync_queue_entity_idx" ON "sync_queue" USING btree ("entity");--> statement-breakpoint
CREATE INDEX "sync_queue_status_idx" ON "sync_queue" USING btree ("status");