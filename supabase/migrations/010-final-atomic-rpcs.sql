-- ============================================================
-- MIGRATION 010: Final Atomic RPCs — Eliminate Inconsistencies
--
-- Converts the last remaining sequential operations to atomic RPCs:
-- 1. assign_trip_resources_atomic — lock vehicle + driver + update trip
-- 2. generate_invoice_from_trip_atomic — invoice + link + status change
--
-- After this migration, EVERY business transaction is a single RPC.
-- Zero sequential client-side operations for business data.
-- ============================================================

-- ============================================================
-- 1. ASSIGN TRIP RESOURCES (atomic: trip + vehicle + driver)
-- ============================================================

CREATE OR REPLACE FUNCTION assign_trip_resources_atomic(
  p_organization_id UUID,
  p_trip_id UUID,
  p_vehicle_id UUID,
  p_vehicle_reg TEXT,
  p_driver_id UUID,
  p_driver_name TEXT,
  p_driver_phone TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Update trip
  UPDATE trips SET
    vehicle_id = p_vehicle_id,
    vehicle_reg = p_vehicle_reg,
    driver_id = p_driver_id,
    driver_name = p_driver_name,
    driver_phone = p_driver_phone,
    status = 'assigned',
    updated_at = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Lock vehicle
  UPDATE vehicles SET status = 'on_trip', driver_id = p_driver_id, driver_name = p_driver_name
  WHERE id = p_vehicle_id AND organization_id = p_organization_id;

  -- Lock driver
  UPDATE drivers SET status = 'on_trip', assigned_vehicle_id = p_vehicle_id, assigned_vehicle_reg = p_vehicle_reg
  WHERE id = p_driver_id AND organization_id = p_organization_id;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'assigned', 'trip', p_trip_id::text,
    'Assigned ' || p_vehicle_reg || ' + ' || p_driver_name);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;



-- ============================================================
-- 2. GENERATE INVOICE FROM TRIP (atomic)
-- Combines: invoice creation + outstanding update + trip link + trip status
-- All in one transaction — no partial state possible.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invoice_from_trip_atomic(
  p_organization_id UUID,
  p_trip_id UUID,
  p_invoice_number TEXT,
  p_gst_percent NUMERIC DEFAULT 5
)
RETURNS JSONB AS $$
DECLARE
  v_trip RECORD;
  v_subtotal NUMERIC;
  v_gst_amount NUMERIC;
  v_total_amount NUMERIC;
  v_invoice_id UUID;
  v_customer_name TEXT;
  v_invoice_date DATE := CURRENT_DATE;
  v_due_date DATE := CURRENT_DATE + 30;
BEGIN
  -- Org check
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Fetch trip
  SELECT * INTO v_trip FROM trips
  WHERE id = p_trip_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Status guard
  IF v_trip.status NOT IN ('completed', 'pod_pending', 'pod_received') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot invoice trip in ' || v_trip.status || ' status');
  END IF;

  -- Idempotency: already invoiced?
  IF EXISTS (SELECT 1 FROM invoice_trips WHERE trip_id = p_trip_id AND organization_id = p_organization_id) THEN
    SELECT invoice_id INTO v_invoice_id FROM invoice_trips WHERE trip_id = p_trip_id AND organization_id = p_organization_id LIMIT 1;
    RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'already_invoiced', true);
  END IF;

  -- Calculate amounts
  v_subtotal := COALESCE(v_trip.freight_amount, 0) + COALESCE(v_trip.detention_charges, 0) + COALESCE(v_trip.other_charges, 0);
  v_gst_amount := ROUND(v_subtotal * p_gst_percent / 100);
  v_total_amount := v_subtotal + v_gst_amount;

  -- Get customer name
  SELECT name INTO v_customer_name FROM customers
  WHERE id = v_trip.customer_id AND organization_id = p_organization_id;
  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found for trip');
  END IF;

  -- Create invoice
  INSERT INTO invoices (organization_id, invoice_number, customer_id, customer_name,
    invoice_date, due_date, trip_ids, freight_total, detention_total, other_charges,
    subtotal, gst_percent, gst_amount, tds_amount, total_amount, paid_amount,
    balance_amount, status)
  VALUES (p_organization_id, p_invoice_number, v_trip.customer_id, v_customer_name,
    v_invoice_date, v_due_date, jsonb_build_array(p_trip_id::text), COALESCE(v_trip.freight_amount, 0),
    COALESCE(v_trip.detention_charges, 0), COALESCE(v_trip.other_charges, 0),
    v_subtotal, p_gst_percent, v_gst_amount, 0, v_total_amount, 0, v_total_amount, 'sent')
  RETURNING id INTO v_invoice_id;

  -- Link invoice to trip
  INSERT INTO invoice_trips (organization_id, invoice_id, trip_id, billed_amount)
  VALUES (p_organization_id, v_invoice_id, p_trip_id, v_total_amount)
  ON CONFLICT DO NOTHING;

  -- Update customer outstanding
  UPDATE customers
  SET outstanding = outstanding + v_total_amount,
      total_business = total_business + v_total_amount
  WHERE id = v_trip.customer_id AND organization_id = p_organization_id;

  -- Update trip status to billed
  UPDATE trips SET status = 'billed', updated_at = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;

  -- Journal entries: DR Receivable, CR Revenue + GST
  PERFORM post_journal_entry(p_organization_id, v_invoice_date, 'invoice', v_invoice_id::text,
    'Invoice ' || p_invoice_number || ' — ' || v_customer_name,
    v_customer_name || ' (Receivable)', 'Assets', v_total_amount,
    'Freight Revenue', 'Income', v_subtotal);

  IF v_gst_amount > 0 THEN
    PERFORM post_journal_entry(p_organization_id, v_invoice_date, 'invoice', v_invoice_id::text,
      'GST on Invoice ' || p_invoice_number,
      v_customer_name || ' (Receivable)', 'Assets', 0,
      'GST Payable', 'Liabilities', v_gst_amount);
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'invoice', v_invoice_id::text,
    'Invoice ' || p_invoice_number || ' generated from trip ' || COALESCE(v_trip.trip_number, p_trip_id::text));

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'total_amount', v_total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE: Migration 010 — All business transactions are now atomic.
-- ============================================================
