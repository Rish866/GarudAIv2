-- ============================================================
-- GARUD AI ERP — Demo Data Seed
-- 
-- This file ONLY inserts data into the DEMO ORGANIZATION.
-- It must NEVER execute during normal customer signup.
-- It must NEVER be used as fallback data.
-- 
-- Demo Organization UUID: 00000000-0000-0000-0000-000000000001
-- 
-- IDEMPOTENT: Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ============================================================

-- Ensure demo organization exists
INSERT INTO public.organizations (id, name, slug, status, subscription_status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Garud AI Demo Transport', 'garud-demo', 'active', 'active')
ON CONFLICT (id) DO NOTHING;

-- Demo organization settings
INSERT INTO public.organization_settings (organization_id, onboarding_completed)
VALUES ('00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================
-- DEMO VEHICLES (belongs ONLY to demo org)
-- ============================================================

INSERT INTO public.vehicles (id, organization_id, reg_number, vehicle_type, make, model, year, ownership_type, owner_name, capacity_tons, status, odometer)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'MH-12-AB-1234', 'trailer', 'Tata', 'Prima 4928', 2022, 'owned', 'Garud Demo Transport', 28, 'available', 145230),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'MH-12-CD-5678', 'container', 'Ashok Leyland', 'Captain 4023', 2021, 'owned', 'Garud Demo Transport', 22, 'on_trip', 198450),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'MH-14-EF-9012', 'truck', 'BharatBenz', '3523R', 2023, 'owned', 'Garud Demo Transport', 25, 'available', 67800)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEMO DRIVERS (belongs ONLY to demo org)
-- ============================================================

INSERT INTO public.drivers (id, organization_id, name, phone, license_number, license_expiry, address, emergency_contact, emergency_phone, date_of_joining, salary_type, base_salary, status, safety_score, total_trips, total_km)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Suresh Kumar', '+91 98765 11111', 'MH-1220220012345', '2027-03-15', '12, Shivaji Nagar, Pune', 'Sita Kumar', '+91 98765 11112', '2020-06-15', 'per_trip', 8000, 'available', 92, 245, 187500),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Ramesh Yadav', '+91 98765 22222', 'MH-1420210054321', '2026-11-20', '78, Camp Area, Pune', 'Geeta Yadav', '+91 98765 22223', '2019-03-10', 'monthly', 25000, 'available', 88, 312, 245000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DEMO CUSTOMERS (belongs ONLY to demo org)
-- ============================================================

INSERT INTO public.customers (id, organization_id, name, contact_person, phone, email, gstin, billing_address, credit_limit, credit_days, outstanding, total_business, status)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Tata Motors Ltd', 'Anil Deshmukh', '+91 20 6613 4000', 'logistics@tatamotors.com', '27AAACR5055K1ZB', 'Pimpri, Pune, Maharashtra - 411018', 5000000, 30, 0, 0, 'active'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Reliance Industries', 'Pradeep Mehta', '+91 22 3555 5000', 'supply.chain@ril.com', '27AAACR5055K2ZA', 'Navi Mumbai, Maharashtra - 400701', 8000000, 45, 0, 0, 'active')
ON CONFLICT DO NOTHING;

-- ============================================================
-- NOTE: This seed file is for DEMO PURPOSES ONLY
-- 
-- Real customer accounts get ZERO records on signup.
-- Demo data is visible ONLY to users who are members of
-- organization '00000000-0000-0000-0000-000000000001'.
-- 
-- RLS policies ensure no other organization can see this data.
-- ============================================================
