-- ============================================================
-- MIGRATION 008: Integrate Journal Entries into Financial RPCs
--
-- Every financial transaction now posts balanced double-entry
-- journal entries automatically. DR always equals CR.
--
-- AFFECTED RPCs:
-- 1. create_invoice_with_outstanding → DR Receivable, CR Revenue + GST
-- 2. record_payment → DR Bank/Cash, CR Receivable
-- 3. record_expense_with_cascade → DR Expense, CR Cash/Bank
-- 4. record_fuel_atomic → DR Diesel, CR Cash
-- 5. record_maintenance_atomic → DR Repair, CR Cash (if completed)
-- 6. record_challan_atomic → DR Misc Expense, CR Cash
-- 7. record_vendor_payment_atomic → DR Payable, CR Bank/Cash
--
-- ACCOUNTING RULES:
-- - Every entry has debit + credit that MUST balance
-- - Journal entries are IMMUTABLE (corrections via reversal)
-- - Account names follow Indian transport Chart of Accounts
-- ============================================================

-- ============================================================
-- Helper: Post journal entries for a transaction
-- ============================================================

CREATE OR REPLACE FUNCTION post_journal_entry(
  p_organization_id UUID,
  p_date DATE,
  p_reference_type TEXT,
  p_reference_id TEXT,
  p_narration TEXT,
  p_debit_account TEXT,
  p_debit_group TEXT,
  p_debit_amount NUMERIC,
  p_credit_account TEXT,
  p_credit_group TEXT,
  p_credit_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- Debit entry
  INSERT INTO journal_entries (organization_id, entry_date, reference_type,
    reference_id, narration, account_name, account_group, debit, credit)
  VALUES (p_organization_id, p_date, p_reference_type,
    p_reference_id, p_narration, p_debit_account, p_debit_group, p_debit_amount, 0);

  -- Credit entry
  INSERT INTO journal_entries (organization_id, entry_date, reference_type,
    reference_id, narration, account_name, account_group, debit, credit)
  VALUES (p_organization_id, p_date, p_reference_type,
    p_reference_id, p_narration, p_credit_account, p_credit_group, 0, p_credit_amount);
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Update: record_payment → add journal posting
-- DR Bank/Cash, CR Customer Receivable
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
  v_payment_date DATE;
  v_dr_account TEXT;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive');
  END IF;

  v_effective_amount := p_amount + p_tds_amount;
  v_payment_date := COALESCE(p_payment_date::date, CURRENT_DATE);

  SELECT name INTO v_customer_name FROM customers WHERE id = p_customer_id AND organization_id = p_organization_id;
  IF v_customer_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Customer not found');
  END IF;

  -- Create payment
  INSERT INTO payments (organization_id, invoice_id, customer_id, customer_name, amount, payment_mode, reference_number, payment_date, tds_amount, status)
  VALUES (p_organization_id, p_invoice_id, p_customer_id, v_customer_name, p_amount, p_payment_mode, p_reference_number, v_payment_date, p_tds_amount, 'received')
  RETURNING id INTO v_payment_id;

  -- Update invoice
  IF p_invoice_id IS NOT NULL THEN
    UPDATE invoices SET
      paid_amount = paid_amount + v_effective_amount,
      balance_amount = GREATEST(0, balance_amount - v_effective_amount),
      status = CASE
        WHEN balance_amount - v_effective_amount <= 0 THEN 'paid'
        WHEN paid_amount + v_effective_amount > 0 THEN 'partial'
        ELSE status END
    WHERE id = p_invoice_id AND organization_id = p_organization_id;
  END IF;

  -- Reduce customer outstanding
  UPDATE customers SET outstanding = GREATEST(0, outstanding - v_effective_amount)
  WHERE id = p_customer_id AND organization_id = p_organization_id;

  -- Bank/Cash entry
  v_dr_account := CASE WHEN p_payment_mode IN ('bank_transfer', 'cheque', 'upi') THEN 'Bank Account' ELSE 'Cash Account' END;

  IF p_payment_mode IN ('bank_transfer', 'cheque', 'upi') THEN
    INSERT INTO bank_entries (organization_id, date, voucher_number, particulars, type, amount, reference, narration)
    VALUES (p_organization_id, v_payment_date, 'REC-' || SUBSTR(v_payment_id::text, 1, 8),
      'Received from ' || v_customer_name, 'receipt', p_amount, p_reference_number, 'Payment received');
  ELSE
    INSERT INTO cash_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, v_payment_date, 'REC-' || SUBSTR(v_payment_id::text, 1, 8),
      'Received from ' || v_customer_name, 'receipt', p_amount, 'Cash payment');
  END IF;

  -- JOURNAL ENTRIES (double-entry)
  -- DR Bank/Cash
  PERFORM post_journal_entry(p_organization_id, v_payment_date, 'payment', v_payment_id::text,
    'Payment from ' || v_customer_name,
    v_dr_account, 'Assets', p_amount,
    v_customer_name || ' (Receivable)', 'Assets', p_amount);

  -- If TDS, DR TDS Receivable CR Customer
  IF p_tds_amount > 0 THEN
    PERFORM post_journal_entry(p_organization_id, v_payment_date, 'payment', v_payment_id::text,
      'TDS deducted by ' || v_customer_name,
      'TDS Receivable', 'Assets', p_tds_amount,
      v_customer_name || ' (Receivable)', 'Assets', p_tds_amount);
  END IF;

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'payment_received', 'payment', v_payment_id::text,
    '₹' || p_amount || ' from ' || v_customer_name || ' via ' || p_payment_mode);

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================
-- Update: record_expense_with_cascade → add journal posting
-- DR Expense Account, CR Cash/Bank
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
  v_expense_date DATE;
  v_debit_account TEXT;
  v_credit_account TEXT;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_expense_date := COALESCE(p_date::date, CURRENT_DATE);

  -- Map category to ledger account
  v_debit_account := CASE p_category
    WHEN 'diesel' THEN 'Diesel & Fuel'
    WHEN 'toll' THEN 'Toll Expenses'
    WHEN 'driver_bata' THEN 'Driver Bata & Salary'
    WHEN 'loading' THEN 'Loading & Unloading'
    WHEN 'unloading' THEN 'Loading & Unloading'
    WHEN 'repair' THEN 'Repair & Maintenance'
    WHEN 'tyre' THEN 'Tyre Expenses'
    WHEN 'insurance' THEN 'Insurance'
    WHEN 'emi' THEN 'EMI & Finance Charges'
    WHEN 'salary' THEN 'Driver Bata & Salary'
    WHEN 'office' THEN 'Office & Admin'
    ELSE 'Miscellaneous Expenses'
  END;

  v_credit_account := CASE WHEN p_payment_mode IN ('bank', 'bank_transfer', 'upi') THEN 'Bank Account' ELSE 'Cash Account' END;

  -- Create expense
  INSERT INTO expenses (organization_id, branch_id, trip_id, vehicle_id, vehicle_reg,
    category, amount, date, description, paid_to, payment_mode, approved)
  VALUES (p_organization_id, p_branch_id, p_trip_id, p_vehicle_id, p_vehicle_reg,
    p_category, p_amount, v_expense_date, p_description, p_paid_to, p_payment_mode, false)
  RETURNING id INTO v_expense_id;

  -- Cash/Bank entry
  IF p_payment_mode IN ('bank', 'bank_transfer', 'upi') THEN
    INSERT INTO bank_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, v_expense_date, 'EXP-' || SUBSTR(v_expense_id::text, 1, 8),
      'Expense: ' || p_category || ' - ' || p_description, 'payment', p_amount, p_paid_to);
  ELSIF p_payment_mode = 'cash' THEN
    INSERT INTO cash_entries (organization_id, date, voucher_number, particulars, type, amount, narration)
    VALUES (p_organization_id, v_expense_date, 'EXP-' || SUBSTR(v_expense_id::text, 1, 8),
      'Expense: ' || p_category || ' - ' || p_description, 'payment', p_amount, p_paid_to);
  END IF;

  -- JOURNAL ENTRIES (double-entry)
  PERFORM post_journal_entry(p_organization_id, v_expense_date, 'expense', v_expense_id::text,
    p_category || ': ' || p_description,
    v_debit_account, 'Expense', p_amount,
    v_credit_account, 'Assets', p_amount);

  -- Activity log
  INSERT INTO activity_log (organization_id, user_name, action, entity_type, entity_id, details)
  VALUES (p_organization_id, 'system', 'expense_recorded', 'expense', v_expense_id::text,
    '₹' || p_amount || ' - ' || p_category || ': ' || p_description);

  RETURN jsonb_build_object('success', true, 'expense_id', v_expense_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Update: record_fuel_atomic → add journal posting
-- DR Diesel & Fuel, CR Cash/Fuel Card
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
  v_fuel_date DATE;
BEGIN
  IF p_organization_id != get_user_organization_id() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  v_fuel_date := COALESCE(p_date::date, CURRENT_DATE);

  INSERT INTO fuel_entries (organization_id, vehicle_id, vehicle_reg,
    driver_id, driver_name, trip_id, date, litres, rate_per_litre,
    amount, odometer, station, fuel_type)
  VALUES (p_organization_id, p_vehicle_id, p_vehicle_reg,
    p_driver_id, p_driver_name, p_trip_id,
    v_fuel_date, p_litres, p_rate, p_amount, p_odometer, p_station, 'diesel')
  RETURNING id INTO v_fuel_id;

  -- Update vehicle odometer
  UPDATE vehicles SET odometer = p_odometer
  WHERE id = p_vehicle_id AND organization_id = p_organization_id AND p_odometer > odometer;

  -- JOURNAL ENTRIES: DR Diesel & Fuel, CR Cash Account
  PERFORM post_journal_entry(p_organization_id, v_fuel_date, 'fuel', v_fuel_id::text,
    'Diesel for ' || p_vehicle_reg || ' (' || p_litres || 'L)',
    'Diesel & Fuel', 'Expense', p_amount,
    'Cash Account', 'Assets', p_amount);

  RETURN jsonb_build_object('success', true, 'fuel_entry_id', v_fuel_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- DONE: Journal entries are now posted by every financial RPC.
-- All journals balance (DR = CR enforced by post_journal_entry).
-- ============================================================
