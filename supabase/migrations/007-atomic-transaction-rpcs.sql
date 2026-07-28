-- ============================================================
-- MIGRATION 007: Atomic Transaction RPCs
-- 
-- Creates ALL missing database functions so every business
-- operation is a SINGLE atomic transaction.
-- If ANY step fails, EVERYTHING rolls back.
--
-- This completes Priority 1 of Phase 8: Production Hardening.
-- ============================================================

-- ============================================================
-- 1. CREATE VENDOR WITH LEDGER (atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION create_vendor_with_ledger(
  p_organization_id UUID,
  p_name TEXT,
  p_type TEXT DEFAULT 'general',
  p_contact_person TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_gstin TEXT DEFAULT NULL,
  p_pan TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_ifsc TEXT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vendor_id UUID;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Create vendor
  INSERT INTO vendors (organization_id, branch_id, name, type,
    contact_person, phone, email, gstin, pan, address, city, state,
    bank_name, account_number, ifsc, outstanding, total_paid, status)
  VALUES (p_organization_id, p_branch_id, p_name, p_type,
    p_contact_person, p_phone, p_email, p_gstin, p_pan, p_address,
    p_city, p_state, p_bank_name, p_account_number, p_ifsc, 0, 0, 'active')
  RETURNING id INTO v_vendor_id;


  -- Create payable ledger account
  INSERT INTO ledger_accounts (organization_id, name, "group", balance, balance_type)
  VALUES (p_organization_id, p_name || ' (Payable)', 'Liabilities', 0, 'Cr')
  ON CONFLICT DO NOTHING;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'vendor', v_vendor_id::text, 'Vendor: ' || p_name);

  RETURN jsonb_build_object('success', true, 'vendor_id', v_vendor_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. CREATE VEHICLE (atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION create_vehicle_atomic(
  p_organization_id UUID,
  p_reg_number TEXT,
  p_vehicle_type TEXT DEFAULT 'truck',
  p_make TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_ownership_type TEXT DEFAULT 'owned',
  p_owner_name TEXT DEFAULT NULL,
  p_capacity_tons NUMERIC DEFAULT 0,
  p_fitness_expiry TEXT DEFAULT NULL,
  p_insurance_expiry TEXT DEFAULT NULL,
  p_puc_expiry TEXT DEFAULT NULL,
  p_permit_expiry TEXT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  INSERT INTO vehicles (organization_id, branch_id, reg_number, vehicle_type,
    make, model, year, ownership_type, owner_name, capacity_tons,
    fitness_expiry, insurance_expiry, puc_expiry, permit_expiry,
    status, odometer)
  VALUES (p_organization_id, p_branch_id, p_reg_number, p_vehicle_type,
    p_make, p_model, p_year, p_ownership_type, p_owner_name, p_capacity_tons,
    p_fitness_expiry::date, p_insurance_expiry::date, p_puc_expiry::date, p_permit_expiry::date,
    'available', 0)
  RETURNING id INTO v_vehicle_id;

  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'vehicle', v_vehicle_id::text,
    'Vehicle: ' || p_reg_number || ' (' || p_vehicle_type || ')');

  RETURN jsonb_build_object('success', true, 'vehicle_id', v_vehicle_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 3. CREATE DRIVER (atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION create_driver_atomic(
  p_organization_id UUID,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_license_number TEXT DEFAULT NULL,
  p_license_expiry TEXT DEFAULT NULL,
  p_aadhar TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_salary_type TEXT DEFAULT 'monthly',
  p_base_salary NUMERIC DEFAULT 0,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_driver_id UUID;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  INSERT INTO drivers (organization_id, branch_id, name, phone,
    license_number, license_expiry, aadhar, address,
    salary_type, base_salary, status, safety_score, total_trips, total_km)
  VALUES (p_organization_id, p_branch_id, p_name, p_phone,
    p_license_number, p_license_expiry::date, p_aadhar, p_address,
    p_salary_type, p_base_salary, 'available', 85, 0, 0)
  RETURNING id INTO v_driver_id;

  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'driver', v_driver_id::text, 'Driver: ' || p_name);

  RETURN jsonb_build_object('success', true, 'driver_id', v_driver_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. RECORD FUEL (atomic: fuel + vehicle odometer update)
-- ============================================================

CREATE OR REPLACE FUNCTION record_fuel_atomic(
  p_organization_id UUID,
  p_vehicle_id UUID,
  p_vehicle_reg TEXT,
  p_driver_id UUID DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_trip_id UUID DEFAULT NULL,
  p_date TEXT DEFAULT NULL,
  p_litres NUMERIC DEFAULT 0,
  p_rate NUMERIC DEFAULT 0,
  p_amount NUMERIC DEFAULT 0,
  p_odometer INTEGER DEFAULT 0,
  p_station TEXT DEFAULT NULL,
  p_payment_mode TEXT DEFAULT 'fuel_card'
)
RETURNS JSONB AS $$
DECLARE
  v_fuel_id UUID;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Create fuel entry
  INSERT INTO fuel_entries (organization_id, vehicle_id, vehicle_reg,
    driver_id, driver_name, trip_id, date, litres, rate_per_litre,
    amount, odometer, station, fuel_type)
  VALUES (p_organization_id, p_vehicle_id, p_vehicle_reg,
    p_driver_id, p_driver_name, p_trip_id,
    COALESCE(p_date::date, CURRENT_DATE), p_litres, p_rate,
    p_amount, p_odometer, p_station, 'diesel')
  RETURNING id INTO v_fuel_id;

  -- Update vehicle odometer (atomic with fuel entry)
  UPDATE vehicles SET odometer = p_odometer
  WHERE id = p_vehicle_id AND organization_id = p_organization_id
    AND p_odometer > odometer;

  RETURN jsonb_build_object('success', true, 'fuel_entry_id', v_fuel_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 5. CREATE TRIP (atomic: trip + lock vehicle + lock driver + update indent)
-- ============================================================

CREATE OR REPLACE FUNCTION create_trip_atomic(
  p_organization_id UUID,
  p_trip_number TEXT,
  p_customer_id UUID,
  p_customer_name TEXT DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_vehicle_reg TEXT DEFAULT NULL,
  p_driver_id UUID DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_phone TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_destination TEXT DEFAULT NULL,
  p_distance_km NUMERIC DEFAULT 0,
  p_material TEXT DEFAULT NULL,
  p_weight_tons NUMERIC DEFAULT 0,
  p_booking_date TEXT DEFAULT NULL,
  p_loading_date TEXT DEFAULT NULL,
  p_freight_amount NUMERIC DEFAULT 0,
  p_advance_amount NUMERIC DEFAULT 0,
  p_indent_id UUID DEFAULT NULL,
  p_quotation_id UUID DEFAULT NULL,
  p_enquiry_id UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_trip_id UUID;
  v_balance NUMERIC;
  v_cust_name TEXT;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Resolve customer name if not provided
  IF p_customer_name IS NULL THEN
    SELECT name INTO v_cust_name FROM customers WHERE id = p_customer_id AND organization_id = p_organization_id;
  ELSE
    v_cust_name := p_customer_name;
  END IF;

  v_balance := p_freight_amount - p_advance_amount;

  -- Create trip
  INSERT INTO trips (organization_id, branch_id, trip_number,
    customer_id, customer_name, vehicle_id, vehicle_reg,
    driver_id, driver_name, driver_phone,
    origin, destination, distance_km, material, weight_tons,
    booking_date, loading_date, freight_amount, advance_amount,
    balance_amount, total_amount, detention_charges, other_charges,
    indent_id, quotation_id, enquiry_id, status)
  VALUES (p_organization_id, p_branch_id, p_trip_number,
    p_customer_id, v_cust_name, p_vehicle_id, p_vehicle_reg,
    p_driver_id, p_driver_name, p_driver_phone,
    p_origin, p_destination, p_distance_km, p_material, p_weight_tons,
    COALESCE(p_booking_date::date, CURRENT_DATE), p_loading_date::date,
    p_freight_amount, p_advance_amount,
    v_balance, p_freight_amount, 0, 0,
    p_indent_id, p_quotation_id, p_enquiry_id, 'assigned')
  RETURNING id INTO v_trip_id;

  -- Lock vehicle
  IF p_vehicle_id IS NOT NULL THEN
    UPDATE vehicles SET status = 'on_trip', driver_id = p_driver_id, driver_name = p_driver_name
    WHERE id = p_vehicle_id AND organization_id = p_organization_id;
  END IF;

  -- Lock driver
  IF p_driver_id IS NOT NULL THEN
    UPDATE drivers SET status = 'on_trip', assigned_vehicle_id = p_vehicle_id, assigned_vehicle_reg = p_vehicle_reg
    WHERE id = p_driver_id AND organization_id = p_organization_id;
  END IF;

  -- Update indent
  IF p_indent_id IS NOT NULL THEN
    UPDATE indents SET status = 'in_progress', trip_id = v_trip_id
    WHERE id = p_indent_id AND organization_id = p_organization_id;
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'trip', v_trip_id::text,
    'Trip ' || p_trip_number || ': ' || COALESCE(p_origin,'') || ' → ' || COALESCE(p_destination,''));

  RETURN jsonb_build_object('success', true, 'trip_id', v_trip_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 6. COMPLETE TRIP (atomic: status + release vehicle + release driver)
-- ============================================================

CREATE OR REPLACE FUNCTION complete_trip_atomic(
  p_organization_id UUID,
  p_trip_id UUID,
  p_delivery_date TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_trip RECORD;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Update trip status
  UPDATE trips SET status = 'completed',
    actual_delivery = COALESCE(p_delivery_date::date, CURRENT_DATE),
    updated_at = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;

  -- Release vehicle
  IF v_trip.vehicle_id IS NOT NULL THEN
    UPDATE vehicles SET status = 'available'
    WHERE id = v_trip.vehicle_id AND organization_id = p_organization_id;
  END IF;

  -- Release driver + increment trip count
  IF v_trip.driver_id IS NOT NULL THEN
    UPDATE drivers SET status = 'available', total_trips = total_trips + 1
    WHERE id = v_trip.driver_id AND organization_id = p_organization_id;
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'completed', 'trip', p_trip_id::text,
    'Trip ' || v_trip.trip_number || ' completed');

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 7. RECORD MAINTENANCE (atomic: maintenance + expense + vehicle status)
-- ============================================================

CREATE OR REPLACE FUNCTION record_maintenance_atomic(
  p_organization_id UUID,
  p_vehicle_id UUID,
  p_vehicle_reg TEXT,
  p_type TEXT DEFAULT 'preventive',
  p_description TEXT DEFAULT '',
  p_date TEXT DEFAULT NULL,
  p_odometer INTEGER DEFAULT 0,
  p_cost NUMERIC DEFAULT 0,
  p_vendor TEXT DEFAULT '',
  p_status TEXT DEFAULT 'scheduled',
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_maint_id UUID;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Create maintenance record
  INSERT INTO maintenance_records (organization_id, branch_id, vehicle_id, vehicle_reg,
    type, description, date, odometer, cost, vendor, status)
  VALUES (p_organization_id, p_branch_id, p_vehicle_id, p_vehicle_reg,
    p_type, p_description, COALESCE(p_date::date, CURRENT_DATE),
    p_odometer, p_cost, p_vendor, p_status)
  RETURNING id INTO v_maint_id;

  -- If in_progress, set vehicle to maintenance
  IF p_status = 'in_progress' THEN
    UPDATE vehicles SET status = 'maintenance'
    WHERE id = p_vehicle_id AND organization_id = p_organization_id;
  END IF;

  -- If completed immediately with cost, create expense
  IF p_status = 'completed' AND p_cost > 0 THEN
    INSERT INTO expenses (organization_id, branch_id, vehicle_id, vehicle_reg,
      category, amount, date, description, paid_to, payment_mode, approved)
    VALUES (p_organization_id, p_branch_id, p_vehicle_id, p_vehicle_reg,
      'repair', p_cost, COALESCE(p_date::date, CURRENT_DATE),
      'Maintenance: ' || p_description, p_vendor, 'cash', true);
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'maintenance_recorded', 'maintenance', v_maint_id::text,
    p_type || ': ' || p_description || ' | ' || p_vehicle_reg || ' | ₹' || p_cost);

  RETURN jsonb_build_object('success', true, 'maintenance_id', v_maint_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 8. RECORD CHALLAN (atomic: challan + expense + activity)
-- ============================================================

CREATE OR REPLACE FUNCTION record_challan_atomic(
  p_organization_id UUID,
  p_vehicle_id UUID,
  p_vehicle_reg TEXT,
  p_driver_id UUID DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_offence TEXT DEFAULT '',
  p_amount NUMERIC DEFAULT 0,
  p_date TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_challan_number TEXT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_challan_id UUID;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Create challan
  INSERT INTO challans (organization_id, branch_id, challan_number,
    vehicle_id, vehicle_reg, driver_id, driver_name,
    offence, amount, date, location, payment_status)
  VALUES (p_organization_id, p_branch_id, p_challan_number,
    p_vehicle_id, p_vehicle_reg, p_driver_id, p_driver_name,
    p_offence, p_amount, COALESCE(p_date::date, CURRENT_DATE),
    p_location, 'unpaid')
  RETURNING id INTO v_challan_id;

  -- Create expense
  INSERT INTO expenses (organization_id, branch_id, vehicle_id, vehicle_reg,
    category, amount, date, description, paid_to, payment_mode, approved)
  VALUES (p_organization_id, p_branch_id, p_vehicle_id, p_vehicle_reg,
    'misc', p_amount, COALESCE(p_date::date, CURRENT_DATE),
    'Challan: ' || p_offence || ' at ' || COALESCE(p_location, 'unknown'),
    'Traffic Police', 'cash', true);

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'challan_recorded', 'challan', v_challan_id::text,
    '₹' || p_amount || ': ' || p_offence || ' | ' || p_vehicle_reg);

  RETURN jsonb_build_object('success', true, 'challan_id', v_challan_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 9. CREATE WORK ORDER (atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION create_work_order_atomic(
  p_organization_id UUID,
  p_vehicle_id UUID,
  p_vehicle_reg TEXT,
  p_type TEXT DEFAULT 'repair',
  p_description TEXT DEFAULT '',
  p_assigned_to TEXT DEFAULT '',
  p_priority TEXT DEFAULT 'normal',
  p_estimated_cost NUMERIC DEFAULT 0,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_wo_id UUID;
  v_wo_number TEXT;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_wo_number := 'WO-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTR(gen_random_uuid()::text, 1, 4);

  INSERT INTO work_orders (organization_id, branch_id, work_order_number,
    vehicle_id, vehicle_reg, type, description, assigned_to,
    priority, estimated_cost, actual_cost, status)
  VALUES (p_organization_id, p_branch_id, v_wo_number,
    p_vehicle_id, p_vehicle_reg, p_type, p_description, p_assigned_to,
    p_priority, p_estimated_cost, 0, 'open')
  RETURNING id INTO v_wo_id;

  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'work_order_created', 'work_order', v_wo_id::text,
    v_wo_number || ': ' || p_type || ' — ' || p_description);

  RETURN jsonb_build_object('success', true, 'work_order_id', v_wo_id, 'work_order_number', v_wo_number);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 10. RECORD VENDOR PAYMENT (atomic: vendor outstanding + cash/bank)
-- ============================================================

CREATE OR REPLACE FUNCTION record_vendor_payment_atomic(
  p_organization_id UUID,
  p_vendor_id UUID,
  p_amount NUMERIC DEFAULT 0,
  p_payment_mode TEXT DEFAULT 'bank_transfer',
  p_reference TEXT DEFAULT '',
  p_date TEXT DEFAULT NULL,
  p_description TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_vendor_name TEXT;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get vendor name + update outstanding
  UPDATE vendors
  SET outstanding = GREATEST(0, outstanding - p_amount),
      total_paid = total_paid + p_amount
  WHERE id = p_vendor_id AND organization_id = p_organization_id
  RETURNING name INTO v_vendor_name;

  IF v_vendor_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor not found');
  END IF;

  -- Record in bank or cash book
  IF p_payment_mode IN ('bank_transfer', 'cheque', 'upi') THEN
    INSERT INTO bank_entries (organization_id, date, voucher_number, particulars, type, amount, reference, narration)
    VALUES (p_organization_id, COALESCE(p_date::date, CURRENT_DATE),
      'VP-' || SUBSTR(gen_random_uuid()::text, 1, 8),
      'Vendor Payment: ' || v_vendor_name, 'payment', p_amount, p_reference, p_description);
  ELSE
    INSERT INTO cash_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, COALESCE(p_date::date, CURRENT_DATE),
      'VP-' || SUBSTR(gen_random_uuid()::text, 1, 8),
      'Vendor Payment: ' || v_vendor_name, 'payment', p_amount, p_description);
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'vendor_payment', 'vendor', p_vendor_id::text,
    '₹' || p_amount || ' paid to ' || v_vendor_name);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE: All 10 missing RPCs created.
-- Every business operation is now a single atomic transaction.
-- ============================================================
