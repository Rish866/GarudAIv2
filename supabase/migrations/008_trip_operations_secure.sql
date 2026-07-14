-- ============================================================
-- Migration 008: Secure Trip Operations
--
-- Creates:
--   1. trip_status_history table (immutable audit trail)
--   2. New columns on trips table for cancellation/reopen tracking
--   3. cancel_trip RPC (transaction-safe, role-checked)
--   4. reopen_trip RPC (transaction-safe, role-checked)
--   5. update_trip_details RPC (transaction-safe, role-checked)
--   6. transition_trip_status RPC (enforces allowed transitions)
--
-- IDEMPOTENT: Uses IF NOT EXISTS / OR REPLACE throughout.
-- DEPENDENCY: Requires migrations 000-007 applied.
-- ============================================================

-- ============================================================
-- STEP 1: trip_status_history table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  trip_id UUID NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by UUID NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_trip_status_history_org
  ON public.trip_status_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_trip_status_history_trip
  ON public.trip_status_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_status_history_created
  ON public.trip_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_status_history_org_trip
  ON public.trip_status_history(organization_id, trip_id);

-- Foreign key to trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_trip_status_history_trip'
  ) THEN
    ALTER TABLE public.trip_status_history
      ADD CONSTRAINT fk_trip_status_history_trip
      FOREIGN KEY (organization_id, trip_id)
      REFERENCES public.trips(organization_id, id);
  END IF;
END $$;

-- RLS
ALTER TABLE public.trip_status_history ENABLE ROW LEVEL SECURITY;


-- RLS Policies for trip_status_history
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_status_history' AND policyname = 'tsh_select') THEN
    EXECUTE 'CREATE POLICY "tsh_select" ON public.trip_status_history FOR SELECT TO authenticated
      USING (public.is_organization_member(organization_id))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_status_history' AND policyname = 'tsh_insert') THEN
    EXECUTE 'CREATE POLICY "tsh_insert" ON public.trip_status_history FOR INSERT TO authenticated
      WITH CHECK (public.is_organization_member(organization_id))';
  END IF;
END $$;

-- Immutable: no UPDATE or DELETE allowed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_status_history' AND policyname = 'tsh_no_update') THEN
    EXECUTE 'CREATE POLICY "tsh_no_update" ON public.trip_status_history FOR UPDATE TO authenticated USING (false)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_status_history' AND policyname = 'tsh_no_delete') THEN
    EXECUTE 'CREATE POLICY "tsh_no_delete" ON public.trip_status_history FOR DELETE TO authenticated USING (false)';
  END IF;
END $$;

-- Immutable organization_id trigger function (if not already created by staging migrations)
CREATE OR REPLACE FUNCTION public.enforce_immutable_organization_id()
RETURNS TRIGGER AS $fn$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'organization_id is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

-- Immutable organization_id trigger
DROP TRIGGER IF EXISTS enforce_immutable_organization_id ON public.trip_status_history;
CREATE TRIGGER enforce_immutable_organization_id
  BEFORE UPDATE ON public.trip_status_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_organization_id();


-- ============================================================
-- STEP 2: Add missing columns to trips table
-- ============================================================
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS cancelled_by UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS previous_status TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS reopened_by UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS reopen_reason TEXT;

-- ============================================================
-- STEP 3: Helper — allowed transition map
-- Returns TRUE if from_status → to_status is a valid transition.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_valid_trip_transition(
  p_from TEXT,
  p_to TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN (p_from, p_to) IN (
    ('booked', 'assigned'),
    ('assigned', 'loading'),
    ('loading', 'in_transit'),
    ('in_transit', 'reached'),
    ('reached', 'unloading'),
    ('unloading', 'pod_pending'),
    ('pod_pending', 'completed'),
    ('completed', 'billed'),
    ('billed', 'settled'),
    -- Skip-forward shortcuts (ops discretion)
    ('booked', 'loading'),
    ('assigned', 'in_transit'),
    -- Cancellation allowed from any non-terminal status
    ('booked', 'cancelled'),
    ('assigned', 'cancelled'),
    ('loading', 'cancelled'),
    ('in_transit', 'cancelled'),
    ('reached', 'cancelled'),
    ('unloading', 'cancelled'),
    ('pod_pending', 'cancelled'),
    ('completed', 'cancelled'),
    ('billed', 'cancelled'),
    -- Reopen: only cancelled → booked
    ('cancelled', 'booked')
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- STEP 4: cancel_trip RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.cancel_trip(
  p_organization_id UUID,
  p_trip_id UUID,
  p_reason TEXT
) RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
  v_user_id UUID;
  v_has_paid_invoice BOOLEAN;
BEGIN
  -- Auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Input validation
  IF p_organization_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization ID is required');
  END IF;
  IF p_trip_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Trip ID is required');
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Cancellation reason is required');
  END IF;

  -- Role check: only owner, admin, operations_manager, dispatcher can cancel
  IF NOT public.has_organization_role(
    p_organization_id,
    ARRAY['organization_owner','admin','operations_manager','dispatcher']
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: insufficient role for trip cancellation');
  END IF;

  -- Lock row, verify ownership
  SELECT id, status, trip_number, vehicle_id, driver_id
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found in this organization');
  END IF;


  -- Status guards
  IF v_trip.status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Trip is already cancelled');
  END IF;
  IF v_trip.status = 'settled' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel a settled trip');
  END IF;

  -- Check for paid invoices linked to this trip
  SELECT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE organization_id = p_organization_id
      AND trip_ids ? p_trip_id::text
      AND status IN ('paid', 'partial')
  ) INTO v_has_paid_invoice;

  IF v_has_paid_invoice THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel: trip has paid/partial invoices. Reverse payment first.');
  END IF;

  -- Validate transition
  IF NOT public.is_valid_trip_transition(v_trip.status, 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid transition from ' || v_trip.status || ' to cancelled');
  END IF;

  -- Perform cancellation
  UPDATE public.trips SET
    status = 'cancelled',
    previous_status = v_trip.status,
    cancellation_reason = trim(p_reason),
    cancelled_by = v_user_id,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;


  -- Release vehicle if assigned
  IF v_trip.vehicle_id IS NOT NULL THEN
    UPDATE public.vehicles
    SET status = 'available'
    WHERE id = v_trip.vehicle_id::uuid
      AND organization_id = p_organization_id
      AND status = 'on_trip';
  END IF;

  -- Release driver if assigned
  IF v_trip.driver_id IS NOT NULL THEN
    UPDATE public.drivers
    SET status = 'available'
    WHERE id = v_trip.driver_id::uuid
      AND organization_id = p_organization_id
      AND status = 'on_trip';
  END IF;

  -- Write status history
  INSERT INTO public.trip_status_history
    (organization_id, trip_id, from_status, to_status, reason, changed_by, metadata)
  VALUES (
    p_organization_id, p_trip_id, v_trip.status, 'cancelled',
    trim(p_reason), v_user_id,
    jsonb_build_object('action', 'cancel', 'vehicle_released', v_trip.vehicle_id IS NOT NULL, 'driver_released', v_trip.driver_id IS NOT NULL)
  );

  -- Write audit log
  INSERT INTO public.activity_log
    (organization_id, user_id, action, entity_type, entity_id, details, metadata)
  VALUES (
    p_organization_id, v_user_id::text, 'trip_cancelled', 'trip', p_trip_id::text,
    'Trip ' || v_trip.trip_number || ' cancelled. Reason: ' || trim(p_reason),
    jsonb_build_object('previous_status', v_trip.status, 'reason', trim(p_reason))
  );


  -- Return the updated trip
  RETURN (
    SELECT json_build_object(
      'success', true,
      'trip_id', p_trip_id,
      'trip_number', v_trip.trip_number,
      'previous_status', v_trip.status,
      'new_status', 'cancelled',
      'cancelled_by', v_user_id,
      'cancelled_at', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_trip(UUID, UUID, TEXT) TO authenticated;


-- ============================================================
-- STEP 5: reopen_trip RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.reopen_trip(
  p_organization_id UUID,
  p_trip_id UUID,
  p_reason TEXT
) RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
  v_user_id UUID;
  v_restore_status TEXT;
  v_vehicle_available BOOLEAN;
  v_driver_available BOOLEAN;
  v_has_unsafe_invoice BOOLEAN;
BEGIN
  -- Auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Input validation
  IF p_organization_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization ID is required');
  END IF;
  IF p_trip_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Trip ID is required');
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Reopen reason is required');
  END IF;

  -- Role check: only owner, admin, operations_manager can reopen
  IF NOT public.has_organization_role(
    p_organization_id,
    ARRAY['organization_owner','admin','operations_manager']
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: insufficient role for trip reopen');
  END IF;


  -- Lock row, verify ownership
  SELECT id, status, trip_number, vehicle_id, driver_id, previous_status
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found in this organization');
  END IF;

  -- Only cancelled trips can be reopened
  IF v_trip.status <> 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Only cancelled trips can be reopened. Current status: ' || v_trip.status);
  END IF;

  -- Check for unsafe invoice/payment relationships
  SELECT EXISTS (
    SELECT 1 FROM public.invoices
    WHERE organization_id = p_organization_id
      AND trip_ids ? p_trip_id::text
      AND status IN ('paid', 'partial', 'sent')
  ) INTO v_has_unsafe_invoice;

  IF v_has_unsafe_invoice THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reopen: trip has active invoices. Cancel/void invoices first.');
  END IF;

  -- Validate vehicle availability (if previously assigned)
  v_vehicle_available := TRUE;
  IF v_trip.vehicle_id IS NOT NULL THEN
    SELECT (status = 'available') INTO v_vehicle_available
    FROM public.vehicles
    WHERE id = v_trip.vehicle_id::uuid AND organization_id = p_organization_id;
    IF v_vehicle_available IS NULL THEN v_vehicle_available := FALSE; END IF;
  END IF;


  -- Validate driver availability (if previously assigned)
  v_driver_available := TRUE;
  IF v_trip.driver_id IS NOT NULL THEN
    SELECT (status = 'available') INTO v_driver_available
    FROM public.drivers
    WHERE id = v_trip.driver_id::uuid AND organization_id = p_organization_id;
    IF v_driver_available IS NULL THEN v_driver_available := FALSE; END IF;
  END IF;

  -- Decide restore status: always booked (safest — forces re-validation of assignments)
  -- Previous status is stored for reference but we reset to booked for safety
  v_restore_status := 'booked';

  -- Perform reopen
  UPDATE public.trips SET
    status = v_restore_status,
    cancellation_reason = NULL,
    cancelled_by = NULL,
    cancelled_at = NULL,
    previous_status = NULL,
    reopened_by = v_user_id,
    reopened_at = NOW(),
    reopen_reason = trim(p_reason),
    updated_at = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;

  -- Write status history
  INSERT INTO public.trip_status_history
    (organization_id, trip_id, from_status, to_status, reason, changed_by, metadata)
  VALUES (
    p_organization_id, p_trip_id, 'cancelled', v_restore_status,
    trim(p_reason), v_user_id,
    jsonb_build_object(
      'action', 'reopen',
      'vehicle_available', v_vehicle_available,
      'driver_available', v_driver_available,
      'original_previous_status', v_trip.previous_status
    )
  );


  -- Write audit log
  INSERT INTO public.activity_log
    (organization_id, user_id, action, entity_type, entity_id, details, metadata)
  VALUES (
    p_organization_id, v_user_id::text, 'trip_reopened', 'trip', p_trip_id::text,
    'Trip ' || v_trip.trip_number || ' reopened. Reason: ' || trim(p_reason),
    jsonb_build_object('restored_to', v_restore_status, 'reason', trim(p_reason),
      'vehicle_available', v_vehicle_available, 'driver_available', v_driver_available)
  );

  RETURN json_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'trip_number', v_trip.trip_number,
    'previous_status', 'cancelled',
    'new_status', v_restore_status,
    'vehicle_available', v_vehicle_available,
    'driver_available', v_driver_available,
    'reopened_by', v_user_id,
    'reopened_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reopen_trip(UUID, UUID, TEXT) TO authenticated;


-- ============================================================
-- STEP 6: transition_trip_status RPC
-- Enforces allowed transition map at database level.
-- ============================================================
CREATE OR REPLACE FUNCTION public.transition_trip_status(
  p_organization_id UUID,
  p_trip_id UUID,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
  v_user_id UUID;
BEGIN
  -- Auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Input validation
  IF p_organization_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization ID is required');
  END IF;
  IF p_trip_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Trip ID is required');
  END IF;
  IF p_new_status IS NULL OR trim(p_new_status) = '' THEN
    RETURN json_build_object('success', false, 'error', 'New status is required');
  END IF;

  -- Role check
  IF NOT public.has_organization_role(
    p_organization_id,
    ARRAY['organization_owner','admin','operations_manager','dispatcher']
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: insufficient role for status transition');
  END IF;


  -- Redirect cancellation and reopen to dedicated RPCs
  IF p_new_status = 'cancelled' THEN
    RETURN json_build_object('success', false, 'error', 'Use cancel_trip RPC for cancellation (requires reason)');
  END IF;
  IF p_new_status = 'booked' THEN
    -- Only valid if current is cancelled (reopen), redirect
    RETURN json_build_object('success', false, 'error', 'Use reopen_trip RPC to reopen cancelled trips');
  END IF;

  -- Lock row
  SELECT id, status, trip_number, vehicle_id, driver_id
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found in this organization');
  END IF;

  -- Validate transition
  IF NOT public.is_valid_trip_transition(v_trip.status, p_new_status) THEN
    RETURN json_build_object('success', false, 'error',
      'Invalid transition: ' || v_trip.status || ' → ' || p_new_status || ' is not allowed');
  END IF;

  -- Perform transition
  UPDATE public.trips SET
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;


  -- Update vehicle status on relevant transitions
  IF p_new_status = 'assigned' OR p_new_status = 'loading' OR p_new_status = 'in_transit' THEN
    IF v_trip.vehicle_id IS NOT NULL THEN
      UPDATE public.vehicles SET status = 'on_trip'
      WHERE id = v_trip.vehicle_id::uuid AND organization_id = p_organization_id AND status = 'available';
    END IF;
    IF v_trip.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET status = 'on_trip'
      WHERE id = v_trip.driver_id::uuid AND organization_id = p_organization_id AND status = 'available';
    END IF;
  END IF;

  -- Release vehicle/driver on completion
  IF p_new_status IN ('completed', 'pod_pending') THEN
    IF v_trip.vehicle_id IS NOT NULL THEN
      UPDATE public.vehicles SET status = 'available'
      WHERE id = v_trip.vehicle_id::uuid AND organization_id = p_organization_id AND status = 'on_trip';
    END IF;
    IF v_trip.driver_id IS NOT NULL THEN
      UPDATE public.drivers SET status = 'available'
      WHERE id = v_trip.driver_id::uuid AND organization_id = p_organization_id AND status = 'on_trip';
    END IF;
  END IF;

  -- Write status history
  INSERT INTO public.trip_status_history
    (organization_id, trip_id, from_status, to_status, reason, changed_by, metadata)
  VALUES (
    p_organization_id, p_trip_id, v_trip.status, p_new_status,
    COALESCE(trim(p_reason), ''), v_user_id,
    jsonb_build_object('action', 'transition')
  );


  -- Write audit log
  INSERT INTO public.activity_log
    (organization_id, user_id, action, entity_type, entity_id, details, metadata)
  VALUES (
    p_organization_id, v_user_id::text, 'trip_status_changed', 'trip', p_trip_id::text,
    'Trip ' || v_trip.trip_number || ' status: ' || v_trip.status || ' → ' || p_new_status,
    jsonb_build_object('from', v_trip.status, 'to', p_new_status, 'reason', COALESCE(p_reason, ''))
  );

  RETURN json_build_object(
    'success', true,
    'trip_id', p_trip_id,
    'trip_number', v_trip.trip_number,
    'previous_status', v_trip.status,
    'new_status', p_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.transition_trip_status(UUID, UUID, TEXT, TEXT) TO authenticated;


-- ============================================================
-- STEP 7: update_trip_details RPC
-- Secure editing with full validation.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_trip_details(
  p_organization_id UUID,
  p_trip_id UUID,
  p_updates JSONB
) RETURNS JSON AS $$
DECLARE
  v_trip RECORD;
  v_user_id UUID;
  v_vehicle_id UUID;
  v_driver_id UUID;
  v_customer_id UUID;
  v_vehicle_ok BOOLEAN;
  v_driver_ok BOOLEAN;
  v_customer_ok BOOLEAN;
  v_editable_statuses TEXT[] := ARRAY['booked','assigned','loading','in_transit','reached','unloading','pod_pending'];
  v_freight NUMERIC;
  v_advance NUMERIC;
  v_detention NUMERIC;
  v_other NUMERIC;
BEGIN
  -- Auth
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Input validation
  IF p_organization_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Organization ID is required');
  END IF;
  IF p_trip_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Trip ID is required');
  END IF;
  IF p_updates IS NULL OR p_updates = '{}'::jsonb THEN
    RETURN json_build_object('success', false, 'error', 'No updates provided');
  END IF;


  -- Role check: owner, admin, operations_manager, dispatcher can edit trips
  IF NOT public.has_organization_role(
    p_organization_id,
    ARRAY['organization_owner','admin','operations_manager','dispatcher']
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: insufficient role for trip editing');
  END IF;

  -- Prevent immutable field tampering
  IF p_updates ? 'id' OR p_updates ? 'organization_id' OR p_updates ? 'created_at' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot modify immutable fields (id, organization_id, created_at)');
  END IF;
  IF p_updates ? 'status' THEN
    RETURN json_build_object('success', false, 'error', 'Use transition_trip_status or cancel_trip RPCs for status changes');
  END IF;

  -- Lock row
  SELECT *
  INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found in this organization');
  END IF;

  -- Status check: prevent editing completed/billed/settled/cancelled trips
  IF NOT v_trip.status = ANY(v_editable_statuses) THEN
    RETURN json_build_object('success', false, 'error',
      'Cannot edit trip in status: ' || v_trip.status || '. Only editable in: booked, assigned, loading, in_transit, reached, unloading, pod_pending');
  END IF;


  -- Validate vehicle if changed
  IF p_updates ? 'vehicle_id' AND (p_updates->>'vehicle_id') IS NOT NULL THEN
    v_vehicle_id := (p_updates->>'vehicle_id')::uuid;
    SELECT EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE id = v_vehicle_id AND organization_id = p_organization_id
        AND status IN ('available', 'on_trip')
    ) INTO v_vehicle_ok;
    IF NOT v_vehicle_ok THEN
      RETURN json_build_object('success', false, 'error', 'Vehicle not found, inactive, or unavailable in this organization');
    END IF;
  END IF;

  -- Validate driver if changed
  IF p_updates ? 'driver_id' AND (p_updates->>'driver_id') IS NOT NULL THEN
    v_driver_id := (p_updates->>'driver_id')::uuid;
    SELECT EXISTS (
      SELECT 1 FROM public.drivers
      WHERE id = v_driver_id AND organization_id = p_organization_id
        AND status IN ('available', 'on_trip')
    ) INTO v_driver_ok;
    IF NOT v_driver_ok THEN
      RETURN json_build_object('success', false, 'error', 'Driver not found, inactive, or unavailable in this organization');
    END IF;
  END IF;

  -- Validate customer if changed
  IF p_updates ? 'customer_id' AND (p_updates->>'customer_id') IS NOT NULL THEN
    v_customer_id := (p_updates->>'customer_id')::uuid;
    SELECT EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = v_customer_id AND organization_id = p_organization_id
        AND status = 'active'
    ) INTO v_customer_ok;
    IF NOT v_customer_ok THEN
      RETURN json_build_object('success', false, 'error', 'Customer not found or inactive in this organization');
    END IF;
  END IF;


  -- Compute financials if any amount field is provided
  v_freight := COALESCE((p_updates->>'freight_amount')::numeric, v_trip.freight_amount);
  v_advance := COALESCE((p_updates->>'advance_amount')::numeric, v_trip.advance_amount);
  v_detention := COALESCE((p_updates->>'detention_charges')::numeric, v_trip.detention_charges);
  v_other := COALESCE((p_updates->>'other_charges')::numeric, v_trip.other_charges);

  -- Perform update with allowed fields only
  UPDATE public.trips SET
    customer_id    = COALESCE(p_updates->>'customer_id', customer_id),
    customer_name  = COALESCE(p_updates->>'customer_name', customer_name),
    vehicle_id     = COALESCE(p_updates->>'vehicle_id', vehicle_id),
    vehicle_reg    = COALESCE(p_updates->>'vehicle_reg', vehicle_reg),
    driver_id      = COALESCE(p_updates->>'driver_id', driver_id),
    driver_name    = COALESCE(p_updates->>'driver_name', driver_name),
    driver_phone   = COALESCE(p_updates->>'driver_phone', driver_phone),
    origin         = COALESCE(p_updates->>'origin', origin),
    destination    = COALESCE(p_updates->>'destination', destination),
    distance_km    = COALESCE((p_updates->>'distance_km')::numeric, distance_km),
    material       = COALESCE(p_updates->>'material', material),
    weight_tons    = COALESCE((p_updates->>'weight_tons')::numeric, weight_tons),
    eway_bill      = CASE WHEN p_updates ? 'eway_bill' THEN p_updates->>'eway_bill' ELSE eway_bill END,
    freight_amount = v_freight,
    advance_amount = v_advance,
    balance_amount = v_freight - v_advance,
    detention_charges = v_detention,
    other_charges  = v_other,
    total_amount   = v_freight + v_detention + v_other,
    expected_delivery = CASE WHEN p_updates ? 'expected_delivery' THEN p_updates->>'expected_delivery' ELSE expected_delivery END,
    remarks        = CASE WHEN p_updates ? 'remarks' THEN p_updates->>'remarks' ELSE remarks END,
    updated_at     = NOW()
  WHERE id = p_trip_id AND organization_id = p_organization_id;


  -- Write status history (edit event)
  INSERT INTO public.trip_status_history
    (organization_id, trip_id, from_status, to_status, reason, changed_by, metadata)
  VALUES (
    p_organization_id, p_trip_id, v_trip.status, v_trip.status,
    'Trip details edited', v_user_id,
    jsonb_build_object('action', 'edit', 'fields_changed', (
      SELECT jsonb_agg(key) FROM jsonb_each_text(p_updates)
    ))
  );

  -- Write audit log
  INSERT INTO public.activity_log
    (organization_id, user_id, action, entity_type, entity_id, details, metadata)
  VALUES (
    p_organization_id, v_user_id::text, 'trip_edited', 'trip', p_trip_id::text,
    'Trip ' || v_trip.trip_number || ' details edited',
    jsonb_build_object('fields', (SELECT jsonb_agg(key) FROM jsonb_each_text(p_updates)))
  );

  -- Return updated record
  RETURN (
    SELECT row_to_json(t) FROM (
      SELECT * FROM public.trips WHERE id = p_trip_id AND organization_id = p_organization_id
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_trip_details(UUID, UUID, JSONB) TO authenticated;


-- ============================================================
-- STEP 8: Comments
-- ============================================================
COMMENT ON FUNCTION public.cancel_trip IS
  'Atomically cancels a trip. Requires reason, validates role/org/status, releases vehicle/driver, writes history.';
COMMENT ON FUNCTION public.reopen_trip IS
  'Atomically reopens a cancelled trip to booked. Requires reason, validates role/org/vehicle/driver availability, writes history.';
COMMENT ON FUNCTION public.transition_trip_status IS
  'Enforces allowed status transitions at DB level. Rejects invalid transitions, writes history, updates vehicle/driver status.';
COMMENT ON FUNCTION public.update_trip_details IS
  'Secure trip field editing. Validates role, status (only editable statuses), vehicle/driver/customer ownership. Writes history.';
COMMENT ON TABLE public.trip_status_history IS
  'Immutable audit trail of all trip status changes, cancellations, reopens, and edits.';
COMMENT ON FUNCTION public.is_valid_trip_transition IS
  'Returns TRUE if the from→to status transition is permitted by business rules.';

-- ============================================================
-- DONE — Migration 008 Complete
-- ============================================================
