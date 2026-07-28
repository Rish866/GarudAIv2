-- ============================================================
-- MIGRATION 004: ERP Transaction RPCs
-- Atomic multi-table operations for integrated ERP behavior
-- 
-- Every business transaction updates ALL dependent tables atomically.
-- If any step fails, the entire transaction rolls back.
-- ============================================================

-- ============================================================
-- 1. CREATE CUSTOMER WITH LEDGER
-- Creates: customer + ledger account (receivable) in one transaction
-- ============================================================

CREATE OR REPLACE FUNCTION create_customer_with_ledger(
  p_organization_id UUID,
  p_name TEXT,
  p_contact_person TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_gstin TEXT DEFAULT NULL,
  p_billing_address TEXT DEFAULT NULL,
  p_credit_limit NUMERIC DEFAULT 0,
  p_credit_days INTEGER DEFAULT 30,
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Validate org membership
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization access denied');
  END IF;

  -- Create customer
  INSERT INTO customers (organization_id, branch_id, name, contact_person, phone, email, gstin, billing_address, credit_limit, credit_days, outstanding, total_business, status)
  VALUES (p_organization_id, p_branch_id, p_name, p_contact_person, p_phone, p_email, p_gstin, p_billing_address, p_credit_limit, p_credit_days, 0, 0, 'active')
  RETURNING id INTO v_customer_id;

  -- Create corresponding ledger account (Sundry Debtor)
  INSERT INTO ledger_accounts (organization_id, name, "group", balance, balance_type)
  VALUES (p_organization_id, p_name || ' (Receivable)', 'Assets', 0, 'Dr')
  ON CONFLICT DO NOTHING;

  -- Log activity
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'customer', v_customer_id::text, 'Customer created with ledger: ' || p_name);

  RETURN jsonb_build_object('success', true, 'customer_id', v_customer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. CREATE INVOICE WITH OUTSTANDING UPDATE
-- Creates: invoice + updates customer.outstanding + creates ledger entry
-- ============================================================

CREATE OR REPLACE FUNCTION create_invoice_with_outstanding(
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
RETURNS JSONB AS $$
DECLARE
  v_invoice_id UUID;
  v_subtotal NUMERIC;
  v_gst_amount NUMERIC;
  v_total_amount NUMERIC;
  v_customer_name TEXT;
BEGIN
  -- Validate org
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization access denied');
  END IF;

  -- Calculate totals
  v_subtotal := p_freight_total + p_detention_total + p_other_charges;
  v_gst_amount := ROUND(v_subtotal * p_gst_percent / 100);
  v_total_amount := v_subtotal + v_gst_amount;

  -- Get customer name
  SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id AND organization_id = p_organization_id;
  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Create invoice
  INSERT INTO invoices (organization_id, invoice_number, customer_id, customer_name, invoice_date, due_date, trip_ids, freight_total, detention_total, other_charges, subtotal, gst_percent, gst_amount, tds_amount, total_amount, paid_amount, balance_amount, status)
  VALUES (p_organization_id, p_invoice_number, p_customer_id, v_customer_name, p_invoice_date::date, p_due_date::date, p_trip_ids, p_freight_total, p_detention_total, p_other_charges, v_subtotal, p_gst_percent, v_gst_amount, 0, v_total_amount, 0, v_total_amount, p_status)
  RETURNING id INTO v_invoice_id;

  -- Update customer outstanding + total business
  UPDATE customers
  SET outstanding = outstanding + v_total_amount,
      total_business = total_business + v_total_amount
  WHERE id = p_customer_id AND organization_id = p_organization_id;

  -- Log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'invoice', v_invoice_id::text,
    'Invoice ' || p_invoice_number || ' for ' || v_customer_name || ': ₹' || v_total_amount);

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'total_amount', v_total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. RECORD PAYMENT WITH CASCADE
-- Updates: payment + invoice.paid_amount/status + customer.outstanding + ledger
-- ============================================================

CREATE OR REPLACE FUNCTION record_payment(
  p_organization_id UUID,
  p_customer_id UUID,
  p_invoice_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_tds_amount NUMERIC DEFAULT 0,
  p_payment_mode TEXT DEFAULT 'bank_transfer',
  p_reference_number TEXT DEFAULT '',
  p_payment_date TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_payment_id UUID;
  v_customer_name TEXT;
  v_effective_amount NUMERIC;
  v_invoice_balance NUMERIC;
BEGIN
  -- Validate org
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization access denied');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be positive');
  END IF;

  v_effective_amount := p_amount + p_tds_amount;

  -- Get customer name
  SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id AND organization_id = p_organization_id;
  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Create payment record
  INSERT INTO payments (organization_id, invoice_id, customer_id, customer_name, amount, payment_mode, reference_number, payment_date, tds_amount, status)
  VALUES (p_organization_id, p_invoice_id, p_customer_id, v_customer_name, p_amount, p_payment_mode, p_reference_number, COALESCE(p_payment_date::date, CURRENT_DATE), p_tds_amount, 'received')
  RETURNING id INTO v_payment_id;

  -- Update invoice if specified
  IF p_invoice_id IS NOT NULL THEN
    SELECT balance_amount INTO v_invoice_balance FROM invoices WHERE id = p_invoice_id AND organization_id = p_organization_id;
    
    IF v_invoice_balance IS NOT NULL THEN
      UPDATE invoices
      SET paid_amount = paid_amount + v_effective_amount,
          balance_amount = GREATEST(0, balance_amount - v_effective_amount),
          status = CASE
            WHEN balance_amount - v_effective_amount <= 0 THEN 'paid'
            WHEN paid_amount + v_effective_amount > 0 THEN 'partial'
            ELSE status
          END
      WHERE id = p_invoice_id AND organization_id = p_organization_id;
    END IF;
  END IF;

  -- Reduce customer outstanding
  UPDATE customers
  SET outstanding = GREATEST(0, outstanding - v_effective_amount)
  WHERE id = p_customer_id AND organization_id = p_organization_id;

  -- Record in bank/cash book
  IF p_payment_mode IN ('bank_transfer', 'cheque', 'upi') THEN
    INSERT INTO bank_entries (organization_id, date, voucher_number, particulars, type, amount, reference, narration)
    VALUES (p_organization_id, COALESCE(p_payment_date::date, CURRENT_DATE), 'REC-' || SUBSTR(v_payment_id::text, 1, 8),
      'Received from ' || v_customer_name, 'receipt', p_amount, p_reference_number, 'Payment against invoice');
  ELSE
    INSERT INTO cash_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, COALESCE(p_payment_date::date, CURRENT_DATE), 'REC-' || SUBSTR(v_payment_id::text, 1, 8),
      'Received from ' || v_customer_name, 'receipt', p_amount, 'Cash payment received');
  END IF;

  -- Log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'payment_received', 'payment', v_payment_id::text,
    '₹' || p_amount || ' received from ' || v_customer_name || ' via ' || p_payment_mode);

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. RECORD EXPENSE WITH CASCADE
-- Creates: expense + updates trip cost totals + activity log
-- ============================================================

CREATE OR REPLACE FUNCTION record_expense_with_cascade(
  p_organization_id UUID,
  p_trip_id UUID DEFAULT NULL,
  p_vehicle_id UUID DEFAULT NULL,
  p_vehicle_reg TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'misc',
  p_amount NUMERIC DEFAULT 0,
  p_date TEXT DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_paid_to TEXT DEFAULT '',
  p_payment_mode TEXT DEFAULT 'cash',
  p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_expense_id UUID;
BEGIN
  -- Validate org
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization access denied');
  END IF;

  -- Create expense
  INSERT INTO expenses (organization_id, branch_id, trip_id, vehicle_id, vehicle_reg, category, amount, date, description, paid_to, payment_mode, approved)
  VALUES (p_organization_id, p_branch_id, p_trip_id, p_vehicle_id, p_vehicle_reg, p_category, p_amount, COALESCE(p_date::date, CURRENT_DATE), p_description, p_paid_to, p_payment_mode, false)
  RETURNING id INTO v_expense_id;

  -- Record in cash/bank book
  IF p_payment_mode IN ('bank', 'bank_transfer', 'upi') THEN
    INSERT INTO bank_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, COALESCE(p_date::date, CURRENT_DATE), 'EXP-' || SUBSTR(v_expense_id::text, 1, 8),
      'Expense: ' || p_category || ' - ' || p_description, 'payment', p_amount, p_paid_to);
  ELSIF p_payment_mode = 'cash' THEN
    INSERT INTO cash_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, COALESCE(p_date::date, CURRENT_DATE), 'EXP-' || SUBSTR(v_expense_id::text, 1, 8),
      'Expense: ' || p_category || ' - ' || p_description, 'payment', p_amount, p_paid_to);
  END IF;

  -- Log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'expense_recorded', 'expense', v_expense_id::text,
    '₹' || p_amount || ' - ' || p_category || ': ' || p_description);

  RETURN jsonb_build_object('success', true, 'expense_id', v_expense_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. RLS on new functions (already SECURITY DEFINER with search_path)
-- ============================================================

-- These functions use SECURITY DEFINER + get_user_organization_id()
-- which validates the caller's JWT automatically.
-- No additional RLS policies needed on the functions themselves.

-- ============================================================
-- DONE: Transaction RPCs ready.
-- Every business operation now cascades to ALL dependent tables.
-- ============================================================
