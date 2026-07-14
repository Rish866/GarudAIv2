-- ============================================================
-- SEED DATA: Fresh UUID-based demo organizations, users, and entities
-- Run AFTER migrations 000-008 are applied.
-- ============================================================

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
INSERT INTO public.organizations (id, name, slug, gstin, city, state, status, subscription_status)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Garud Transport Pvt Ltd', 'garud-transport', '29AABCU9603R1ZM', 'Bangalore', 'Karnataka', 'active', 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'Hindustan Logistics', 'hindustan-logistics', '27AADCH1234F1ZX', 'Mumbai', 'Maharashtra', 'active', 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. ORGANIZATION MEMBERS (mapped to existing auth users)
-- Map existing auth users by email. If user doesn't exist, skip.
-- ============================================================

-- Owner: rishkatiyar1@gmail.com → Org A owner
INSERT INTO public.organization_members (id, organization_id, user_id, role, status)
SELECT
  'c0000000-0000-0000-0000-000000000001'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  au.id,
  'organization_owner',
  'active'
FROM auth.users au WHERE au.email = 'rishkatiyar1@gmail.com'
ON CONFLICT DO NOTHING;

-- Admin/Ops: rishabh.katiyar93@gmail.com → Org A operations_manager
INSERT INTO public.organization_members (id, organization_id, user_id, role, status)
SELECT
  'c0000000-0000-0000-0000-000000000002'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  au.id,
  'operations_manager',
  'active'
FROM auth.users au WHERE au.email = 'rishabh.katiyar93@gmail.com'
ON CONFLICT DO NOTHING;

-- Dispatcher: test@test.com → Org A dispatcher
INSERT INTO public.organization_members (id, organization_id, user_id, role, status)
SELECT
  'c0000000-0000-0000-0000-000000000003'::uuid,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  au.id,
  'dispatcher',
  'active'
FROM auth.users au WHERE au.email = 'test@test.com'
ON CONFLICT DO NOTHING;

-- Cross-org user: xx@x.com → Org B owner
INSERT INTO public.organization_members (id, organization_id, user_id, role, status)
SELECT
  'c0000000-0000-0000-0000-000000000004'::uuid,
  'b0000000-0000-0000-0000-000000000002'::uuid,
  au.id,
  'organization_owner',
  'active'
FROM auth.users au WHERE au.email = 'xx@x.com'
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. CUSTOMERS (Org A)
-- ============================================================
INSERT INTO public.customers (id, organization_id, name, phone, email, gstin, billing_address, credit_limit, credit_days, outstanding, total_business, status)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Tata Steel Ltd', '9876543210', 'logistics@tatasteel.com', '27AAACT2345G1ZX', 'Jamshedpur, Jharkhand', 5000000, 45, 120000, 8500000, 'active'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ultratech Cement', '9876543211', 'transport@ultratech.com', '29AABCU9603R1ZM', 'Aditya Birla Centre, Mumbai', 3000000, 30, 85000, 4200000, 'active'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Reliance Industries', '9876543212', 'supply@ril.com', '27AABCR1234F1ZP', 'Navi Mumbai, Maharashtra', 10000000, 60, 0, 12000000, 'active')
ON CONFLICT (id) DO NOTHING;

-- Customer for Org B
INSERT INTO public.customers (id, organization_id, name, phone, email, gstin, billing_address, credit_limit, credit_days, outstanding, total_business, status)
VALUES
  ('d0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'ACC Cement', '9876543220', 'acc@cement.com', '27AABCA1234F1ZX', 'Thane, Maharashtra', 2000000, 30, 0, 1500000, 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. VEHICLES (Org A)
-- ============================================================
INSERT INTO public.vehicles (id, organization_id, reg_number, vehicle_type, make, model, year, ownership_type, capacity_tons, status, odometer)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'KA-01-AB-1234', 'truck', 'Tata', 'Prima 4928', 2022, 'owned', 28, 'available', 125000),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'KA-05-CD-5678', 'truck', 'Ashok Leyland', 'Captain 4923', 2021, 'owned', 25, 'available', 180000),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'MH-12-EF-9012', 'trailer', 'BharatBenz', '4228R', 2023, 'attached', 40, 'on_trip', 45000),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'TN-09-GH-3456', 'truck', 'Eicher', 'Pro 6049', 2020, 'owned', 20, 'maintenance', 220000)
ON CONFLICT (id) DO NOTHING;

-- Vehicle for Org B (for cross-org testing)
INSERT INTO public.vehicles (id, organization_id, reg_number, vehicle_type, make, model, year, ownership_type, capacity_tons, status, odometer)
VALUES
  ('e0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'MH-43-QQ-1102', 'truck', 'Tata', 'Signa 4825', 2022, 'owned', 25, 'available', 90000)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 5. DRIVERS (Org A)
-- ============================================================
INSERT INTO public.drivers (id, organization_id, name, phone, license_number, license_expiry, status, salary_type, base_salary, safety_score, total_trips)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Rajesh Kumar', '9111111111', 'KA2020123456', '2027-03-15', 'available', 'per_trip', 1500, 92, 145),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Suresh Yadav', '9222222222', 'MH2019654321', '2026-11-20', 'available', 'monthly', 35000, 88, 210),
  ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Gurpreet Singh', '9333333333', 'PB2021789012', '2028-06-01', 'on_trip', 'per_trip', 1800, 95, 180),
  ('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Venkatesh Reddy', '9444444444', 'TN2022345678', '2027-09-30', 'on_leave', 'monthly', 32000, 78, 95)
ON CONFLICT (id) DO NOTHING;

-- Driver for Org B
INSERT INTO public.drivers (id, organization_id, name, phone, license_number, license_expiry, status, salary_type, base_salary, safety_score, total_trips)
VALUES
  ('f0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'Birendra Mahto', '9555555555', 'JH2020111222', '2027-01-15', 'available', 'per_trip', 1400, 85, 120)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. TRIPS (Org A) — Various statuses for testing
-- ============================================================
INSERT INTO public.trips (id, organization_id, trip_number, lr_number, eway_bill, customer_id, customer_name, vehicle_id, vehicle_reg, driver_id, driver_name, driver_phone, origin, destination, distance_km, material, weight_tons, booking_date, freight_amount, advance_amount, balance_amount, detention_charges, other_charges, total_amount, status)
VALUES
  ('11000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'TRP-2026-0001', 'LR-2026-0001', 'EWB-100000001', 'd0000000-0000-0000-0000-000000000001', 'Tata Steel Ltd', 'e0000000-0000-0000-0000-000000000001', 'KA-01-AB-1234', 'f0000000-0000-0000-0000-000000000001', 'Rajesh Kumar', '9111111111', 'Bangalore', 'Jamshedpur', 1800, 'Auto Parts', 22, '2026-07-10', 85000, 20000, 65000, 0, 2000, 87000, 'booked'),
  ('11000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'TRP-2026-0002', 'LR-2026-0002', 'EWB-100000002', 'd0000000-0000-0000-0000-000000000002', 'Ultratech Cement', 'e0000000-0000-0000-0000-000000000002', 'KA-05-CD-5678', 'f0000000-0000-0000-0000-000000000002', 'Suresh Yadav', '9222222222', 'Mumbai', 'Pune', 150, 'Cement Bags', 25, '2026-07-08', 35000, 10000, 25000, 1500, 500, 37000, 'in_transit'),
  ('11000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'TRP-2026-0003', 'LR-2026-0003', 'EWB-100000003', 'd0000000-0000-0000-0000-000000000003', 'Reliance Industries', 'e0000000-0000-0000-0000-000000000003', 'MH-12-EF-9012', 'f0000000-0000-0000-0000-000000000003', 'Gurpreet Singh', '9333333333', 'Delhi', 'Chennai', 2200, 'Polymer Granules', 38, '2026-07-05', 150000, 50000, 100000, 3000, 5000, 158000, 'completed'),
  ('11000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'TRP-2026-0004', 'LR-2026-0004', 'EWB-100000004', 'd0000000-0000-0000-0000-000000000001', 'Tata Steel Ltd', 'e0000000-0000-0000-0000-000000000004', 'TN-09-GH-3456', 'f0000000-0000-0000-0000-000000000004', 'Venkatesh Reddy', '9444444444', 'Hyderabad', 'Bangalore', 570, 'Steel Coils', 20, '2026-07-01', 45000, 15000, 30000, 0, 0, 45000, 'settled'),
  ('11000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'TRP-2026-0005', 'LR-2026-0005', NULL, 'd0000000-0000-0000-0000-000000000002', 'Ultratech Cement', 'e0000000-0000-0000-0000-000000000001', 'KA-01-AB-1234', 'f0000000-0000-0000-0000-000000000001', 'Rajesh Kumar', '9111111111', 'Bangalore', 'Hubli', 400, 'Cement', 24, '2026-07-12', 28000, 8000, 20000, 0, 0, 28000, 'cancelled')
ON CONFLICT (id) DO NOTHING;

-- Set cancellation fields on cancelled trip
UPDATE public.trips SET
  cancellation_reason = 'Customer cancelled order - warehouse full',
  cancelled_at = '2026-07-12T14:30:00Z',
  previous_status = 'booked'
WHERE id = '11000000-0000-0000-0000-000000000005';

-- Trip for Org B (for cross-org testing)
INSERT INTO public.trips (id, organization_id, trip_number, lr_number, customer_id, customer_name, vehicle_id, vehicle_reg, driver_id, driver_name, driver_phone, origin, destination, distance_km, material, weight_tons, booking_date, freight_amount, advance_amount, balance_amount, total_amount, status)
VALUES
  ('11000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000002', 'TRP-2026-B001', 'LR-2026-B001', 'd0000000-0000-0000-0000-000000000010', 'ACC Cement', 'e0000000-0000-0000-0000-000000000010', 'MH-43-QQ-1102', 'f0000000-0000-0000-0000-000000000010', 'Birendra Mahto', '9555555555', 'Mumbai', 'Nashik', 180, 'Cement', 25, '2026-07-13', 22000, 5000, 17000, 22000, 'booked')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. SAMPLE INVOICES (Org A) — for paid invoice testing
-- ============================================================
INSERT INTO public.invoices (id, organization_id, invoice_number, customer_id, customer_name, invoice_date, due_date, trip_ids, freight_total, detention_total, other_charges, subtotal, gst_percent, gst_amount, tds_amount, total_amount, paid_amount, balance_amount, status)
VALUES
  ('22000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'INV-2026-0001', 'd0000000-0000-0000-0000-000000000003', 'Reliance Industries', '2026-07-06', '2026-08-05', '["11000000-0000-0000-0000-000000000003"]', 150000, 3000, 5000, 158000, 5, 7900, 3160, 162740, 162740, 0, 'paid')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DONE
-- ============================================================
SELECT 'Seed data inserted successfully' AS result;
