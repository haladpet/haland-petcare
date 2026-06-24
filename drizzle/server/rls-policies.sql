-- ============================================================
-- Row Level Security Policies for Haland PetCare
-- Run against Supabase PostgreSQL database
-- ============================================================

-- Enable RLS on all tables with clinic_id
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: Get clinic_id from authenticated user's JWT
-- Uses Supabase auth.jwt() -> app_metadata -> clinic_id
-- ============================================================

-- clinics table (self-referential: clinic owns itself)
CREATE POLICY "clinics_select_own" ON clinics
  FOR SELECT
  USING (id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "clinics_insert_own" ON clinics
  FOR INSERT
  WITH CHECK (id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "clinics_update_own" ON clinics
  FOR UPDATE
  USING (id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "clinics_delete_own" ON clinics
  FOR DELETE
  USING (id = (auth.jwt() ->> 'clinic_id')::uuid);

-- customers
CREATE POLICY "customers_select_clinic" ON customers
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "customers_insert_clinic" ON customers
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "customers_update_clinic" ON customers
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "customers_delete_clinic" ON customers
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- pets
CREATE POLICY "pets_select_clinic" ON pets
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "pets_insert_clinic" ON pets
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "pets_update_clinic" ON pets
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "pets_delete_clinic" ON pets
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- appointments
CREATE POLICY "appointments_select_clinic" ON appointments
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "appointments_insert_clinic" ON appointments
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "appointments_update_clinic" ON appointments
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "appointments_delete_clinic" ON appointments
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- queues
CREATE POLICY "queues_select_clinic" ON queues
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "queues_insert_clinic" ON queues
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "queues_update_clinic" ON queues
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "queues_delete_clinic" ON queues
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- medical_records
CREATE POLICY "medical_records_select_clinic" ON medical_records
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "medical_records_insert_clinic" ON medical_records
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "medical_records_update_clinic" ON medical_records
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "medical_records_delete_clinic" ON medical_records
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- prescriptions
CREATE POLICY "prescriptions_select_clinic" ON prescriptions
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "prescriptions_insert_clinic" ON prescriptions
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "prescriptions_update_clinic" ON prescriptions
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "prescriptions_delete_clinic" ON prescriptions
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- medicines
CREATE POLICY "medicines_select_clinic" ON medicines
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "medicines_insert_clinic" ON medicines
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "medicines_update_clinic" ON medicines
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "medicines_delete_clinic" ON medicines
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- cages
CREATE POLICY "cages_select_clinic" ON cages
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "cages_insert_clinic" ON cages
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "cages_update_clinic" ON cages
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "cages_delete_clinic" ON cages
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- hospitalizations
CREATE POLICY "hospitalizations_select_clinic" ON hospitalizations
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "hospitalizations_insert_clinic" ON hospitalizations
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "hospitalizations_update_clinic" ON hospitalizations
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "hospitalizations_delete_clinic" ON hospitalizations
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- inventory_items
CREATE POLICY "inventory_items_select_clinic" ON inventory_items
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "inventory_items_insert_clinic" ON inventory_items
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "inventory_items_update_clinic" ON inventory_items
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "inventory_items_delete_clinic" ON inventory_items
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- inventory_transactions
CREATE POLICY "inventory_transactions_select_clinic" ON inventory_transactions
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "inventory_transactions_insert_clinic" ON inventory_transactions
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- invoices
CREATE POLICY "invoices_select_clinic" ON invoices
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "invoices_insert_clinic" ON invoices
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "invoices_update_clinic" ON invoices
  FOR UPDATE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "invoices_delete_clinic" ON invoices
  FOR DELETE
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- payments (no clinic_id directly, but linked via invoice)
-- payments inherit clinic isolation through invoice relationship
-- For direct payment access, we join through invoice
CREATE POLICY "payments_select_via_invoice" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.clinic_id = (auth.jwt() ->> 'clinic_id')::uuid
    )
  );

CREATE POLICY "payments_insert_via_invoice" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.clinic_id = (auth.jwt() ->> 'clinic_id')::uuid
    )
  );

-- audit_logs
CREATE POLICY "audit_logs_select_clinic" ON audit_logs
  FOR SELECT
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

CREATE POLICY "audit_logs_insert_clinic" ON audit_logs
  FOR INSERT
  WITH CHECK (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- ============================================================
-- RLS Isolation Test Script
-- Run this to verify clinic data isolation:
-- ============================================================
/*
-- 1. Create two test clinics
INSERT INTO clinics (id, name, status) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Clinic A', 'ACTIVE'),
  ('22222222-2222-2222-2222-222222222222', 'Clinic B', 'ACTIVE');

-- 2. Insert data for each clinic
INSERT INTO customers (id, clinic_id, full_name) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Customer A1'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 'Customer B1');

-- 3. Test: Set clinic_id to Clinic A, query customers
SELECT set_config('request.jwt.claims', '{"clinic_id":"11111111-1111-1111-1111-111111111111"}', false);
SELECT * FROM customers; -- Should return ONLY Customer A1

-- 4. Test: Set clinic_id to Clinic B, query customers
SELECT set_config('request.jwt.claims', '{"clinic_id":"22222222-2222-2222-2222-222222222222"}', false);
SELECT * FROM customers; -- Should return ONLY Customer B1

-- 5. Test: Try to insert with wrong clinic_id (should be rejected)
INSERT INTO customers (id, clinic_id, full_name) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Should Fail');
-- This should fail because current clinic_id is Clinic B
*/