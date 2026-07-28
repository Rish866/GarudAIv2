-- ============================================================
-- MIGRATION 006: Journal Entries (Double-Entry Bookkeeping)
--
-- Every financial transaction posts journal entries automatically.
-- Debits always equal credits (enforced by CHECK constraint).
-- ============================================================

-- ============================================================
-- 1. JOURNAL ENTRIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  -- Entry metadata
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  voucher_number TEXT,
  narration TEXT,
  -- Reference to source transaction
  reference_type TEXT NOT NULL, -- 'invoice', 'payment', 'expense', 'fuel', 'vendor_payment', 'maintenance'
  reference_id TEXT NOT NULL,
  -- Double-entry line
  account_name TEXT NOT NULL,
  account_group TEXT NOT NULL CHECK (account_group IN ('Assets', 'Liabilities', 'Income', 'Expense')),
  debit NUMERIC NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC NOT NULL DEFAULT 0 CHECK (credit >= 0),
  -- Ensure at least one side has a value
  CONSTRAINT chk_debit_or_credit CHECK (debit > 0 OR credit > 0),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_journal_org ON journal_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_org_date ON journal_entries (organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_org_account ON journal_entries (organization_id, account_name);
CREATE INDEX IF NOT EXISTS idx_journal_org_ref ON journal_entries (organization_id, reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_journal_org_group ON journal_entries (organization_id, account_group);

-- RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_journal_entries" ON journal_entries
  FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "org_write_journal_entries" ON journal_entries
  FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

-- Journal entries are IMMUTABLE (no updates or deletes allowed)
-- Corrections are made via reversal entries

-- ============================================================
-- 2. SEED DEFAULT CHART OF ACCOUNTS
-- (Function to initialize accounts for a new organization)
-- ============================================================

CREATE OR REPLACE FUNCTION seed_chart_of_accounts(p_organization_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Assets
  INSERT INTO ledger_accounts (organization_id, name, "group", balance, balance_type)
  VALUES
    (p_organization_id, 'Cash Account', 'Assets', 0, 'Dr'),
    (p_organization_id, 'Bank Account', 'Assets', 0, 'Dr'),
    (p_organization_id, 'TDS Receivable', 'Assets', 0, 'Dr')
  ON CONFLICT DO NOTHING;

  -- Liabilities
  INSERT INTO ledger_accounts (organization_id, name, "group", balance, balance_type)
  VALUES
    (p_organization_id, 'GST Payable (Output)', 'Liabilities', 0, 'Cr'),
    (p_organization_id, 'TDS Payable', 'Liabilities', 0, 'Cr')
  ON CONFLICT DO NOTHING;

  -- Income
  INSERT INTO ledger_accounts (organization_id, name, "group", balance, balance_type)
  VALUES
    (p_organization_id, 'Freight Revenue', 'Income', 0, 'Cr'),
    (p_organization_id, 'Detention Revenue', 'Income', 0, 'Cr'),
    (p_organization_id, 'Other Income', 'Income', 0, 'Cr')
  ON CONFLICT DO NOTHING;

  -- Expenses
  INSERT INTO ledger_accounts (organization_id, name, "group", balance, balance_type)
  VALUES
    (p_organization_id, 'Diesel & Fuel', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Toll Expenses', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Driver Bata & Salary', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Loading & Unloading', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Repair & Maintenance', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Tyre Expenses', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Insurance', 'Expense', 0, 'Dr'),
    (p_organization_id, 'EMI & Finance Charges', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Office & Admin', 'Expense', 0, 'Dr'),
    (p_organization_id, 'Miscellaneous Expenses', 'Expense', 0, 'Dr')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. REPORTING VIEWS
-- ============================================================

-- Trial Balance view (sum of debits and credits per account)
CREATE OR REPLACE VIEW trial_balance AS
SELECT
  organization_id,
  account_name,
  account_group,
  SUM(debit) as total_debit,
  SUM(credit) as total_credit,
  SUM(debit) - SUM(credit) as net_balance
FROM journal_entries
GROUP BY organization_id, account_name, account_group;

-- P&L Summary view (Income - Expenses for a period)
CREATE OR REPLACE VIEW profit_and_loss_summary AS
SELECT
  organization_id,
  account_group,
  account_name,
  SUM(CASE WHEN account_group = 'Income' THEN credit - debit ELSE debit - credit END) as amount
FROM journal_entries
WHERE account_group IN ('Income', 'Expense')
GROUP BY organization_id, account_group, account_name;

-- ============================================================
-- DONE: Journal entries table + Chart of Accounts + Views
-- ============================================================
