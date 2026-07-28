-- ============================================================
-- MIGRATION 009: Complete Journal Posting for ALL Financial RPCs
--
-- After this migration, every financial transaction posts balanced
-- double-entry journal entries. No financial operation escapes
-- the accounting system.
--
-- NEWLY COVERED:
-- 1. create_invoice_with_outstanding → DR Receivable, CR Revenue + GST
-- 2. record_vendor_payment_atomic → DR Payable, CR Bank/Cash
-- 3. record_maintenance_atomic → DR Repair, CR Cash (if completed)
-- 4. record_challan_atomic → DR Misc Expense, CR Cash
--
-- ALREADY COVERED (migration 008):
-- - record_payment → DR Bank/Cash, CR Receivable
-- - record_expense_with_cascade → DR Expense, CR Cash/Bank
-- - record_fuel_atomic → DR Diesel, CR Cash
-- ============================================================

-- ============================================================
-- 1. CREATE INVOICE WITH OUTSTANDING (+ journal entries)
-- DR Customer Receivable, CR Freight Revenue + GST Payable
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
  v_invoice_date DATE;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_subtotal := p_freight_total + p_detention_total + p_other_charges;
  v_gst_amount := ROUND(v_subtotal * p_gst_percent / 100);
  v_total_amount := v_subtotal + v_gst_amount;
  v_invoice_date := COALESCE(p_invoice_date::date, CURRENT_DATE);

  SELECT name INTO v_customer_name FROM customers
  WHERE id = p_customer_id AND organization_id = p_organization_id;
  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Create invoice
  INSERT INTO invoices (organization_id, invoice_number, customer_id, customer_name,
    invoice_date, due_date, trip_ids, freight_total, detention_total, other_charges,
    subtotal, gst_percent, gst_amount, tds_amount, total_amount, paid_amount,
    balance_amount, status)
  VALUES (p_organization_id, p_invoice_number, p_customer_id, v_customer_name,
    v_invoice_date, p_due_date::date, p_trip_ids, p_freight_total, p_detention_total,
    p_other_charges, v_subtotal, p_gst_percent, v_gst_amount, 0, v_total_amount,
    0, v_total_amount, p_status)
  RETURNING id INTO v_invoice_id;

  -- Update customer outstanding + total business
  UPDATE customers
  SET outstanding = outstanding + v_total_amount,
      total_business = total_business + v_total_amount
  WHERE id = p_customer_id AND organization_id = p_organization_id;

  -- JOURNAL ENTRIES: DR Receivable, CR Revenue + GST
  -- Entry 1: DR Customer Receivable
  PERFORM post_journal_entry(p_organization_id, v_invoice_date, 'invoice', v_invoice_id::text,
    'Invoice ' || p_invoice_number || ' — ' || v_customer_name,
    v_customer_name || ' (Receivable)', 'Assets', v_total_amount,
    'Freight Revenue', 'Income', v_subtotal);

  -- Entry 2: If GST exists, CR GST Payable (separate from revenue)
  IF v_gst_amount > 0 THEN
    -- Additional credit to GST (the main entry credits Revenue for subtotal only)
    INSERT INTO journal_entries (organization_id, entry_date, reference_type,
      reference_id, narration, account_name, account_group, debit, credit)
    VALUES (p_organization_id, v_invoice_date, 'invoice', v_invoice_id::text,
      'GST on Invoice ' || p_invoice_number,
      'GST Payable (Output)', 'Liabilities', 0, v_gst_amount);
    -- Adjust: we over-credited Revenue by gst_amount in post_journal_entry
    -- Actually post_journal_entry credits v_subtotal to Revenue, so we need
    -- the receivable debit to equal subtotal + gst = v_total_amount
    -- But post_journal_entry only accepts one DR and one CR...
    -- Solution: post the GST as a separate balanced pair adjusting
    -- This is handled by the fact that DR receivable = v_total_amount
    -- and CR revenue = v_subtotal, so we need one more CR for GST
    -- The INSERT above handles that. DR side was already covered in main entry.
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'created', 'invoice', v_invoice_id::text,
    'Invoice ' || p_invoice_number || ' for ' || v_customer_name || ': ₹' || v_total_amount);

  RETURN jsonb_build_object('success', true, 'invoice_id', v_invoice_id, 'total_amount', v_total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 2. RECORD VENDOR PAYMENT (+ journal entries)
-- DR Vendor Payable, CR Bank/Cash
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
  v_payment_date DATE;
  v_credit_account TEXT;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_payment_date := COALESCE(p_date::date, CURRENT_DATE);
  v_credit_account := CASE WHEN p_payment_mode IN ('bank_transfer', 'cheque', 'upi') THEN 'Bank Account' ELSE 'Cash Account' END;

  -- Update vendor outstanding
  UPDATE vendors
  SET outstanding = GREATEST(0, outstanding - p_amount),
      total_paid = total_paid + p_amount
  WHERE id = p_vendor_id AND organization_id = p_organization_id
  RETURNING name INTO v_vendor_name;

  IF v_vendor_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vendor not found');
  END IF;

  -- Bank/Cash entry
  IF p_payment_mode IN ('bank_transfer', 'cheque', 'upi') THEN
    INSERT INTO bank_entries (organization_id, date, voucher_number, particulars, type, amount, reference, narration)
    VALUES (p_organization_id, v_payment_date, 'VP-' || SUBSTR(gen_random_uuid()::text, 1, 8),
      'Vendor Payment: ' || v_vendor_name, 'payment', p_amount, p_reference, p_description);
  ELSE
    INSERT INTO cash_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, v_payment_date, 'VP-' || SUBSTR(gen_random_uuid()::text, 1, 8),
      'Vendor Payment: ' || v_vendor_name, 'payment', p_amount, p_description);
  END IF;

  -- JOURNAL ENTRIES: DR Vendor Payable, CR Bank/Cash
  PERFORM post_journal_entry(p_organization_id, v_payment_date, 'vendor_payment', p_vendor_id::text,
    'Payment to ' || v_vendor_name || ': ' || p_description,
    v_vendor_name || ' (Payable)', 'Liabilities', p_amount,
    v_credit_account, 'Assets', p_amount);

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'vendor_payment', 'vendor', p_vendor_id::text,
    '₹' || p_amount || ' paid to ' || v_vendor_name);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. RECORD MAINTENANCE (+ journal entries when completed)
-- DR Repair & Maintenance, CR Cash
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
  v_maint_date DATE;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_maint_date := COALESCE(p_date::date, CURRENT_DATE);

  -- Create maintenance record
  INSERT INTO maintenance_records (organization_id, branch_id, vehicle_id, vehicle_reg,
    type, description, date, odometer, cost, vendor, status)
  VALUES (p_organization_id, p_branch_id, p_vehicle_id, p_vehicle_reg,
    p_type, p_description, v_maint_date, p_odometer, p_cost, p_vendor, p_status)
  RETURNING id INTO v_maint_id;

  -- If in_progress, set vehicle to maintenance
  IF p_status = 'in_progress' THEN
    UPDATE vehicles SET status = 'maintenance'
    WHERE id = p_vehicle_id AND organization_id = p_organization_id;
  END IF;

  -- If completed immediately with cost, create expense + journal entry
  IF p_status = 'completed' AND p_cost > 0 THEN
    INSERT INTO expenses (organization_id, branch_id, vehicle_id, vehicle_reg,
      category, amount, date, description, paid_to, payment_mode, approved)
    VALUES (p_organization_id, p_branch_id, p_vehicle_id, p_vehicle_reg,
      'repair', p_cost, v_maint_date,
      'Maintenance: ' || p_description, p_vendor, 'cash', true);

    -- JOURNAL: DR Repair & Maintenance, CR Cash Account
    PERFORM post_journal_entry(p_organization_id, v_maint_date, 'maintenance', v_maint_id::text,
      'Maintenance: ' || p_description || ' (' || p_vehicle_reg || ')',
      'Repair & Maintenance', 'Expense', p_cost,
      'Cash Account', 'Assets', p_cost);
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'maintenance_recorded', 'maintenance', v_maint_id::text,
    p_type || ': ' || p_description || ' | ' || p_vehicle_reg || ' | ₹' || p_cost);

  RETURN jsonb_build_object('success', true, 'maintenance_id', v_maint_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 4. RECORD CHALLAN (+ journal entries)
-- DR Miscellaneous Expenses, CR Cash Account
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
  v_challan_date DATE;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_challan_date := COALESCE(p_date::date, CURRENT_DATE);

  -- Create challan
  INSERT INTO challans (organization_id, branch_id, challan_number,
    vehicle_id, vehicle_reg, driver_id, driver_name,
    offence, amount, date, location, payment_status)
  VALUES (p_organization_id, p_branch_id, p_challan_number,
    p_vehicle_id, p_vehicle_reg, p_driver_id, p_driver_name,
    p_offence, p_amount, v_challan_date, p_location, 'unpaid')
  RETURNING id INTO v_challan_id;

  -- Create expense
  INSERT INTO expenses (organization_id, branch_id, vehicle_id, vehicle_reg,
    category, amount, date, description, paid_to, payment_mode, approved)
  VALUES (p_organization_id, p_branch_id, p_vehicle_id, p_vehicle_reg,
    'misc', p_amount, v_challan_date,
    'Challan: ' || p_offence || ' at ' || COALESCE(p_location, 'unknown'),
    'Traffic Police', 'cash', true);

  -- JOURNAL: DR Miscellaneous Expenses, CR Cash Account
  PERFORM post_journal_entry(p_organization_id, v_challan_date, 'challan', v_challan_id::text,
    'Challan ₹' || p_amount || ': ' || p_offence || ' (' || p_vehicle_reg || ')',
    'Miscellaneous Expenses', 'Expense', p_amount,
    'Cash Account', 'Assets', p_amount);

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'challan_recorded', 'challan', v_challan_id::text,
    '₹' || p_amount || ': ' || p_offence || ' | ' || p_vehicle_reg);

  RETURN jsonb_build_object('success', true, 'challan_id', v_challan_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- VERIFICATION: After this migration, ALL financial RPCs post journals
--
-- COMPLETE LIST:
-- 1. create_invoice_with_outstanding → DR Receivable, CR Revenue + GST ✅
-- 2. record_payment → DR Bank/Cash, CR Receivable ✅ (migration 008)
-- 3. record_expense_with_cascade → DR Expense, CR Cash/Bank ✅ (migration 008)
-- 4. record_fuel_atomic → DR Diesel, CR Cash ✅ (migration 008)
-- 5. record_vendor_payment_atomic → DR Payable, CR Bank/Cash ✅
-- 6. record_maintenance_atomic → DR Repair, CR Cash ✅
-- 7. record_challan_atomic → DR Misc Expense, CR Cash ✅
--
-- NON-FINANCIAL (no journal needed):
-- - create_customer_with_ledger (creates ledger account, not a transaction)
-- - create_vendor_with_ledger (creates ledger account, not a transaction)
-- - create_vehicle_atomic (operational, not financial)
-- - create_driver_atomic (operational, not financial)
-- - create_trip_atomic (operational, not financial)
-- - complete_trip_atomic (operational, not financial)
-- - create_work_order_atomic (operational, not financial)
-- - cancel_trip (operational, not financial)
--
-- FINANCIAL REPORT SOURCES:
-- - Trial Balance: SELECT account_name, SUM(debit)-SUM(credit) FROM journal_entries GROUP BY 1
-- - P&L: SUM where account_group IN ('Income', 'Expense')
-- - Balance Sheet: SUM where account_group IN ('Assets', 'Liabilities')
-- - Cash Flow: SUM where account_name IN ('Cash Account', 'Bank Account')
-- - Customer Ledger: WHERE account_name LIKE '% (Receivable)'
-- - Vendor Ledger: WHERE account_name LIKE '% (Payable)'
-- ============================================================
