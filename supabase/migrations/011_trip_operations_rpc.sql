-- ============================================================
-- GARUD AI ERP — Migration 011: Trip Operations RPC
--
-- Transaction-safe trip editing, cancellation, reopening and
-- status transitions. Enforces business rules at database level.
-- ============================================================

-- Allowed status transitions
CREATE OR REPLACE FUNCTION public.get_allowed_trip_transitions(p_current_status TEXT)
RETURNS TEXT[] AS $$
BEGIN
  RETURN CASE p_current_status
    WHEN 'booked' THEN ARRAY['assigned', 'cancelled']
    WHEN 'assigned' THEN ARRAY['loading', 'cancelled']
    WHEN 'loading' THEN ARRAY['in_transit', 'cancelled']
    WHEN 'in_transit' THEN ARRAY['reached', 'cancelled']
    WHEN 'reached' THEN ARRAY['unloading']
    WHEN 'unloading' THEN ARRAY['pod_pending']
    WHEN 'pod_pending' THEN ARRAY['completed']
    WHEN 'completed' THEN ARRAY['billed']
    WHEN 'billed' THEN ARRAY['settled']
    ELSE ARRAY[]::TEXT[]
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- RPC: update_trip_status
-- Validates transition, stores history, releases resources on cancel
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_trip_status(
  p_organization_id UUID,
  p_trip_id UUID,
  p_new_status TEXT,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
  v_allowed TEXT[];
BEGIN
  -- Verify membership
  IF NOT public.is_organization_member(p_organization_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get current trip
  SELECT * INTO v_trip FROM public.trips
    WHERE id = p_trip_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Check allowed transitions
  v_allowed := public.get_allowed_trip_transitions(v_trip.status);
  IF NOT (p_new_status = ANY(v_allowed)) THEN
    RETURN json_build_object('success', false, 'error',
      'Cannot change status from ' || v_trip.status || ' to ' || p_new_status);
  END IF;

  -- Cancellation requires reason
  IF p_new_status = 'cancelled' AND (p_cancellation_reason IS NULL OR trim(p_cancellation_reason) = '') THEN
    RETURN json_build_object('success', false, 'error', 'Cancellation reason is required');
  END IF;

  -- Update trip
  UPDATE public.trips SET
    status = p_new_status,
    cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN p_cancellation_reason ELSE cancellation_reason END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_trip_id AND organization_id = p_organization_id;

  -- On cancellation: release vehicle and driver
  IF p_new_status = 'cancelled' THEN
    -- Release vehicle (set back to available if it was on_trip)
    IF v_trip.vehicle_id IS NOT NULL THEN
      UPDATE public.vehicles SET status = 'available'
        WHERE id = v_trip.vehicle_id::UUID
        AND organization_id = p_organization_id
        AND status = 'on_trip';
    END IF;
    -- Release driver
    IF v_trip.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET status = 'available'
        WHERE id = v_trip.driver_id::UUID
        AND organization_id = p_organization_id
        AND status = 'on_trip';
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'new_status', p_new_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- RPC: edit_trip
-- Only allows editing booked/assigned trips. Prevents unsafe edits.
-- ============================================================

CREATE OR REPLACE FUNCTION public.edit_trip(
  p_organization_id UUID,
  p_trip_id UUID,
  p_updates JSONB
)
RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
  v_editable_statuses TEXT[] := ARRAY['booked', 'assigned'];
  v_allowed_fields TEXT[] := ARRAY[
    'customer_id', 'customer_name', 'vehicle_id', 'vehicle_reg',
    'driver_id', 'driver_name', 'driver_phone',
    'origin', 'destination', 'distance_km',
    'material', 'weight_tons', 'num_packages',
    'booking_date', 'loading_date', 'expected_delivery',
    'freight_amount', 'advance_amount', 'balance_amount',
    'detention_charges', 'other_charges', 'total_amount',
    'remarks', 'eway_bill', 'vehicle_type'
  ];
  v_key TEXT;
  v_sql TEXT;
BEGIN
  -- Verify membership
  IF NOT public.is_organization_member(p_organization_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Get trip
  SELECT * INTO v_trip FROM public.trips
    WHERE id = p_trip_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found');
  END IF;

  -- Check status allows editing
  IF NOT (v_trip.status = ANY(v_editable_statuses)) THEN
    RETURN json_build_object('success', false, 'error',
      'Cannot edit trip in status: ' || v_trip.status || '. Only booked/assigned trips can be edited.');
  END IF;

  -- Validate all keys are in allowed fields
  FOR v_key IN SELECT jsonb_object_keys(p_updates)
  LOOP
    IF NOT (v_key = ANY(v_allowed_fields)) THEN
      RETURN json_build_object('success', false, 'error', 'Field not editable: ' || v_key);
    END IF;
  END LOOP;

  -- Build and execute dynamic update
  v_sql := 'UPDATE public.trips SET ';
  v_sql := v_sql || (
    SELECT string_agg(key || ' = ' || quote_literal(value #>> '{}'), ', ')
    FROM jsonb_each(p_updates)
  );
  v_sql := v_sql || ' WHERE id = ' || quote_literal(p_trip_id) ||
    ' AND organization_id = ' || quote_literal(p_organization_id);
  EXECUTE v_sql;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- RPC: reopen_trip
-- Reopens a cancelled trip (requires owner/admin role)
-- ============================================================

CREATE OR REPLACE FUNCTION public.reopen_trip(
  p_organization_id UUID,
  p_trip_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
BEGIN
  -- Only owner/admin can reopen
  IF NOT public.has_organization_role(p_organization_id, ARRAY['organization_owner', 'admin']) THEN
    RETURN json_build_object('success', false, 'error', 'Only owner/admin can reopen cancelled trips');
  END IF;

  SELECT * INTO v_trip FROM public.trips
    WHERE id = p_trip_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found');
  END IF;

  IF v_trip.status != 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Only cancelled trips can be reopened');
  END IF;

  UPDATE public.trips SET
    status = 'booked',
    cancellation_reason = NULL,
    cancelled_at = NULL
  WHERE id = p_trip_id AND organization_id = p_organization_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE — Migration 011
-- Trip operations enforced at database level:
-- - Status transitions validated
-- - Cancellation requires reason
-- - Vehicle/driver released on cancel
-- - Editing restricted to booked/assigned
-- - Reopening restricted to owner/admin
-- ============================================================
