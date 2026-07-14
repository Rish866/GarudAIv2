-- ============================================================
-- GARUD AI ERP — Migration 009: Billing Transaction-Safe RPCs
--
-- PURPOSE: Critical billing operations must be atomic.
-- Client-side sequential updates can leave data inconsistent.
-- These RPCs ensure invoice + payment + customer outstanding
-- are updated in a single transaction.
-- ============================================================

-- ============================================================
-- RPC 1: record_payment
-- Atomically: inserts payment, updates invoice, updates customer outstanding
-- ============================================================

CREATE OR REPLACE FUNCTION public.record_payment(
  p_organization_id UUID,
  p_customer_id UUID,
  p_invoice_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_tds_amount NUMERIC DEFAULT 0,
  p_payment_mode TEXT DEFAULT 'bank_transfer',
  p_reference_number TEXT DEFAULT '',
  p_payment_date TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_payment_id UUID;
  v_total_payment NUMERIC;
  v_invoice RECORD;
  v_customer RECORD;
  v_new_paid NUMERIC;
  v_new_balance NUMERIC;
  v_new_status TEXT;
  v_new_outstanding NUMERIC;
BEGIN
  -- Verify caller is org member
  IF NOT public.is_organization_member(p_organization_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  v_total_payment := p_amount + p_tds_amount;

  -- Validate amount
  IF v_total_payment <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Payment amount must be positive');
  END IF;

  -- Validate customer belongs to this org
  SELECT * INTO v_customer FROM public.customers
    WHERE id = p_customer_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- If invoice specified, validate it
  IF p_invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice FROM public.invoices
      WHERE id = p_invoice_id AND organization_id = p_organization_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Invoice not found');
    END IF;
    IF v_invoice.status IN ('paid', 'cancelled') THEN
      RETURN json_build_object('success', false, 'error', 'Cannot apply payment to ' || v_invoice.status || ' invoice');
    END IF;
    -- Prevent overpayment
    IF v_total_payment > v_invoice.balance_amount THEN
      RETURN json_build_object('success', false, 'error', 'Payment exceeds invoice balance of ' || v_invoice.balance_amount);
    END IF;
  END IF;

  -- 1. Insert payment record
  INSERT INTO public.payments (
    organization_id, customer_id, customer_name, invoice_id,
    amount, tds_amount, payment_mode, reference_number,
    payment_date, status
  ) VALUES (
    p_organization_id, p_customer_id, v_customer.name, p_invoice_id,
    p_amount, p_tds_amount, p_payment_mode, p_reference_number,
    COALESCE(p_payment_date, CURRENT_DATE::TEXT), 'received'
  ) RETURNING id INTO v_payment_id;

  -- 2. Update invoice if linked
  IF p_invoice_id IS NOT NULL THEN
    v_new_paid := COALESCE(v_invoice.paid_amount, 0) + v_total_payment;
    v_new_balance := GREATEST(0, COALESCE(v_invoice.total_amount, 0) - v_new_paid);
    v_new_status := CASE
      WHEN v_new_balance <= 0 THEN 'paid'
      WHEN v_new_paid > 0 THEN 'partial'
      ELSE v_invoice.status
    END;

    UPDATE public.invoices SET
      paid_amount = v_new_paid,
      balance_amount = v_new_balance,
      status = v_new_status
    WHERE id = p_invoice_id AND organization_id = p_organization_id;
  END IF;

  -- 3. Update customer outstanding
  v_new_outstanding := GREATEST(0, COALESCE(v_customer.outstanding, 0) - v_total_payment);
  UPDATE public.customers SET
    outstanding = v_new_outstanding
  WHERE id = p_customer_id AND organization_id = p_organization_id;

  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'new_outstanding', v_new_outstanding
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- RPC 2: create_invoice_with_outstanding
-- Atomically: inserts invoice, updates customer outstanding + total_business
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_invoice_with_outstanding(
  p_organization_id UUID,
  p_customer_id UUID,
  p_invoice_number TEXT,
  p_invoice_date TEXT,
  p_due_date TEXT,
  p_trip_ids JSONB DEFAULT '[]',
  p_freight_total NUMERIC DEFAULT 0,
  p_detention_total NUMERIC DEFAULT 0,
  p_other_charges NUMERIC DEFAULT 0,
  p_gst_percent NUMERIC DEFAULT 5,
  p_status TEXT DEFAULT 'draft'
)
RETURNS JSON AS $$
DECLARE
  v_invoice_id UUID;
  v_customer RECORD;
  v_subtotal NUMERIC;
  v_gst_amount NUMERIC;
  v_tds_amount NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  -- Verify caller is org member
  IF NOT public.is_organization_member(p_organization_id) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Validate customer
  SELECT * INTO v_customer FROM public.customers
    WHERE id = p_customer_id AND organization_id = p_organization_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Prevent duplicate invoice numbers within org
  IF EXISTS (
    SELECT 1 FROM public.invoices
    WHERE organization_id = p_organization_id AND invoice_number = p_invoice_number
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Invoice number already exists');
  END IF;

  -- Calculate amounts
  v_subtotal := p_freight_total + p_detention_total + p_other_charges;
  v_gst_amount := ROUND(v_subtotal * p_gst_percent / 100);
  v_tds_amount := ROUND(v_subtotal * 0.02);
  v_total_amount := v_subtotal + v_gst_amount - v_tds_amount;

  -- 1. Insert invoice
  INSERT INTO public.invoices (
    organization_id, invoice_number, customer_id, customer_name,
    invoice_date, due_date, trip_ids,
    freight_total, detention_total, other_charges,
    subtotal, gst_percent, gst_amount, tds_amount,
    total_amount, paid_amount, balance_amount, status
  ) VALUES (
    p_organization_id, p_invoice_number, p_customer_id, v_customer.name,
    p_invoice_date, p_due_date, p_trip_ids,
    p_freight_total, p_detention_total, p_other_charges,
    v_subtotal, p_gst_percent, v_gst_amount, v_tds_amount,
    v_total_amount, 0, v_total_amount, p_status
  ) RETURNING id INTO v_invoice_id;

  -- 2. Update customer outstanding and total_business
  UPDATE public.customers SET
    outstanding = COALESCE(outstanding, 0) + v_total_amount,
    total_business = COALESCE(total_business, 0) + v_total_amount
  WHERE id = p_customer_id AND organization_id = p_organization_id;

  RETURN json_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE — Migration 009 Complete
-- Critical billing operations are now transaction-safe.
-- ============================================================
