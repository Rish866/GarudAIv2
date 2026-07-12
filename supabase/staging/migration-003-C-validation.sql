-- migration-003-C-validation.sql
-- Migration 003 Validation: Expression-level verification of 102 business RLS policies
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Uses pg_policy + pg_class + pg_namespace + pg_get_expr() for behavioral validation
-- Normalizes expressions to handle PostgreSQL internal formatting differences
-- Expected: ALL 15 CHECKS PASS
-- Generated deterministically from docs/authorization-manifest.json

-- ============================================================
-- Normalization function: strips known pg_get_expr() formatting differences
-- Removes extra parens, ::text[] casts, double schema qualification
-- ============================================================
CREATE OR REPLACE FUNCTION pg_temp.normalize_expr(expr TEXT)
RETURNS TEXT AS $$
BEGIN
  IF expr IS NULL OR expr = '' THEN RETURN ''; END IF;
  -- Remove leading/trailing whitespace
  expr := btrim(expr);
  -- Remove outer parentheses if present
  WHILE expr LIKE '(%)' AND length(expr) > 2 LOOP
    expr := substr(expr, 2, length(expr) - 2);
    expr := btrim(expr);
  END LOOP;
  -- Normalize array type casts: ARRAY[...]::text[] → ARRAY[...]
  expr := regexp_replace(expr, '::text\[\]', '', 'g');
  -- Normalize schema: public.public. → public.
  expr := replace(expr, 'public.public.', 'public.');
  -- Normalize whitespace: collapse multiple spaces
  expr := regexp_replace(expr, '\s+', ' ', 'g');
  -- Lowercase for comparison
  expr := lower(expr);
  RETURN expr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

WITH expected_policies(policy_name, tablename, cmd, expected_using, expected_check) AS (
  VALUES
    ('role_select_activity_log', 'activity_log', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])', ''),
    ('role_select_approvals', 'approvals', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''accountant''])', ''),
    ('role_select_attendance', 'attendance', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager'',''operations_manager''])', ''),
    ('role_insert_attendance', 'attendance', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])'),
    ('role_select_bank_entries', 'bank_entries', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', ''),
    ('role_insert_bank_entries', 'bank_entries', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_branches', 'branches', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])', ''),
    ('role_insert_branches', 'branches', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])'),
    ('role_update_branches', 'branches', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])'),
    ('role_select_cash_entries', 'cash_entries', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', ''),
    ('role_insert_cash_entries', 'cash_entries', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_challans', 'challans', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])', ''),
    ('role_insert_challans', 'challans', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])'),
    ('role_update_challans', 'challans', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])'),
    ('role_select_claims', 'claims', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''accountant''])', ''),
    ('role_insert_claims', 'claims', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_select_contracts', 'contracts', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', ''),
    ('role_insert_contracts', 'contracts', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_update_contracts', 'contracts', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_select_customers', 'customers', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher'',''accountant''])', ''),
    ('role_insert_customers', 'customers', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''accountant'',''dispatcher''])'),
    ('role_update_customers', 'customers', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''accountant''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''accountant''])'),
    ('role_select_drivers', 'drivers', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])', ''),
    ('role_insert_drivers', 'drivers', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])'),
    ('role_update_drivers', 'drivers', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])'),
    ('role_select_enquiries', 'enquiries', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', ''),
    ('role_insert_enquiries', 'enquiries', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_update_enquiries', 'enquiries', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_delete_enquiries', 'enquiries', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''new''', ''),
    ('role_select_eway_bills', 'eway_bills', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', ''),
    ('role_insert_eway_bills', 'eway_bills', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_update_eway_bills', 'eway_bills', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_select_expenses', 'expenses', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager'',''dispatcher''])', ''),
    ('role_insert_expenses', 'expenses', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager'',''dispatcher''])'),
    ('role_update_expenses', 'expenses', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager''])'),
    ('role_select_fuel_entries', 'fuel_entries', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])', ''),
    ('role_insert_fuel_entries', 'fuel_entries', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager'',''dispatcher''])'),
    ('role_select_geofences', 'geofences', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])', ''),
    ('role_insert_geofences', 'geofences', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])'),
    ('role_update_geofences', 'geofences', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])'),
    ('role_delete_geofences', 'geofences', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])', ''),
    ('role_select_gps_devices', 'gps_devices', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])', ''),
    ('role_insert_gps_devices', 'gps_devices', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])'),
    ('role_update_gps_devices', 'gps_devices', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])'),
    ('role_delete_gps_devices', 'gps_devices', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager''])', ''),
    ('role_select_indents', 'indents', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', ''),
    ('role_insert_indents', 'indents', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_update_indents', 'indents', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_delete_indents', 'indents', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''pending''', ''),
    ('role_select_inventory', 'inventory', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager'',''accountant''])', ''),
    ('role_insert_inventory', 'inventory', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_update_inventory', 'inventory', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_delete_inventory', 'inventory', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])', ''),
    ('role_select_invoices', 'invoices', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager''])', ''),
    ('role_insert_invoices', 'invoices', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_leave_requests', 'leave_requests', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])', ''),
    ('role_insert_leave_requests', 'leave_requests', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''hr_manager''])'),
    ('role_select_ledger_accounts', 'ledger_accounts', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', ''),
    ('role_insert_ledger_accounts', 'ledger_accounts', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_maintenance_records', 'maintenance_records', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', ''),
    ('role_insert_maintenance_records', 'maintenance_records', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_update_maintenance_records', 'maintenance_records', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_delete_maintenance_records', 'maintenance_records', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''scheduled''', ''),
    ('role_select_market_hires', 'market_hires', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', ''),
    ('role_insert_market_hires', 'market_hires', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_update_market_hires', 'market_hires', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_delete_market_hires', 'market_hires', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND payment_status = ''pending''', ''),
    ('role_select_notifications', 'notifications', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher'',''fleet_manager'',''accountant'',''maintenance_manager'',''hr_manager''])', ''),
    ('role_select_payments', 'payments', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', ''),
    ('role_insert_payments', 'payments', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_purchases', 'purchases', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', ''),
    ('role_insert_purchases', 'purchases', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_quotations', 'quotations', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', ''),
    ('role_insert_quotations', 'quotations', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_update_quotations', 'quotations', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_delete_quotations', 'quotations', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''draft''', ''),
    ('role_select_routes', 'routes', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher'',''fleet_manager''])', ''),
    ('role_insert_routes', 'routes', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_update_routes', 'routes', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_delete_routes', 'routes', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin''])', ''),
    ('role_select_sales', 'sales', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', ''),
    ('role_insert_sales', 'sales', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_transfers', 'transfers', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', ''),
    ('role_insert_transfers', 'transfers', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_update_transfers', 'transfers', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager''])'),
    ('role_delete_transfers', 'transfers', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''initiated''', ''),
    ('role_select_trips', 'trips', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher'',''accountant''])', ''),
    ('role_insert_trips', 'trips', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher''])'),
    ('role_select_tyres', 'tyres', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', ''),
    ('role_insert_tyres', 'tyres', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_update_tyres', 'tyres', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_delete_tyres', 'tyres', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''spare''', ''),
    ('role_select_vehicles', 'vehicles', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''operations_manager'',''dispatcher'',''fleet_manager'',''maintenance_manager''])', ''),
    ('role_insert_vehicles', 'vehicles', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])'),
    ('role_update_vehicles', 'vehicles', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''operations_manager''])'),
    ('role_select_vendors', 'vendors', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager''])', ''),
    ('role_insert_vendors', 'vendors', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant'',''operations_manager''])'),
    ('role_update_vendors', 'vendors', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
    ('role_select_work_orders', 'work_orders', 'SELECT', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', ''),
    ('role_insert_work_orders', 'work_orders', 'INSERT', '', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_update_work_orders', 'work_orders', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''fleet_manager'',''maintenance_manager''])'),
    ('role_delete_work_orders', 'work_orders', 'DELETE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''open''', '')
),

-- ============================================================
-- INSTALLED: Actual policies from pg_policy catalog (ALL policies, not just role_%)
-- ============================================================
installed_policies AS (
  SELECT
    pol.polname::text AS policy_name,
    c.relname::text AS tablename,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END AS cmd,
    CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
    pol.polroles::regrole[]::text[] AS roles_arr,
    COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '') AS actual_using,
    COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '') AS actual_check
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
    ('activity_log'),
    ('approvals'),
    ('attendance'),
    ('bank_entries'),
    ('branches'),
    ('cash_entries'),
    ('challans'),
    ('claims'),
    ('contracts'),
    ('customers'),
    ('drivers'),
    ('enquiries'),
    ('eway_bills'),
    ('expenses'),
    ('fuel_entries'),
    ('geofences'),
    ('gps_devices'),
    ('indents'),
    ('inventory'),
    ('invoices'),
    ('leave_requests'),
    ('ledger_accounts'),
    ('maintenance_records'),
    ('market_hires'),
    ('notifications'),
    ('payments'),
    ('purchases'),
    ('quotations'),
    ('routes'),
    ('sales'),
    ('transfers'),
    ('trips'),
    ('tyres'),
    ('vehicles'),
    ('vendors'),
    ('work_orders')
    )
),

-- ============================================================
-- BUSINESS TABLES for scope filtering
-- ============================================================
business_tables(t) AS (
  VALUES
    ('activity_log'),
    ('approvals'),
    ('attendance'),
    ('bank_entries'),
    ('branches'),
    ('cash_entries'),
    ('challans'),
    ('claims'),
    ('contracts'),
    ('customers'),
    ('drivers'),
    ('enquiries'),
    ('eway_bills'),
    ('expenses'),
    ('fuel_entries'),
    ('geofences'),
    ('gps_devices'),
    ('indents'),
    ('inventory'),
    ('invoices'),
    ('leave_requests'),
    ('ledger_accounts'),
    ('maintenance_records'),
    ('market_hires'),
    ('notifications'),
    ('payments'),
    ('purchases'),
    ('quotations'),
    ('routes'),
    ('sales'),
    ('transfers'),
    ('trips'),
    ('tyres'),
    ('vehicles'),
    ('vendors'),
    ('work_orders')
)

-- ============================================================
-- C01: Missing policies (expected but not installed)
-- ============================================================
SELECT 'C01' AS check_id, 'missing_policies' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' missing: ' || string_agg(ep.policy_name, ', ' ORDER BY ep.policy_name)
  END AS result
FROM expected_policies ep
LEFT JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
WHERE ip.policy_name IS NULL

UNION ALL

-- ============================================================
-- C02: Extra policies (installed but not in manifest)
-- ============================================================
SELECT 'C02', 'extra_policies',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' extra: ' || string_agg(ip.policy_name || ' ON ' || ip.tablename, ', ' ORDER BY ip.policy_name)
  END
FROM installed_policies ip
LEFT JOIN expected_policies ep ON ep.policy_name = ip.policy_name AND ep.tablename = ip.tablename
WHERE ep.policy_name IS NULL

UNION ALL

-- ============================================================
-- C03: All policies are PERMISSIVE
-- ============================================================
SELECT 'C03', 'all_permissive',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' non-permissive: ' || string_agg(ip.policy_name, ', ')
  END
FROM installed_policies ip
WHERE ip.permissive != 'PERMISSIVE'

UNION ALL

-- ============================================================
-- C04: All policies target exactly {authenticated} role
-- ============================================================
SELECT 'C04', 'roles_exactly_authenticated',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' wrong roles: ' || string_agg(ip.policy_name || '=' || array_to_string(ip.roles_arr, ','), '; ')
  END
FROM installed_policies ip
WHERE NOT (ip.roles_arr = ARRAY['authenticated']::text[])

UNION ALL

-- ============================================================
-- C05: Command types match expected
-- ============================================================
SELECT 'C05', 'command_type_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' mismatches: ' || string_agg(ep.policy_name || '(expected=' || ep.cmd || ',actual=' || ip.cmd || ')', '; ')
  END
FROM expected_policies ep
JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
WHERE ip.cmd != ep.cmd

UNION ALL

-- ============================================================
-- C06: SELECT expression validation (USING with org checks, no WITH CHECK)
-- ============================================================
SELECT 'C06', 'select_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' SELECT expression mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_check != '' THEN ep.policy_name || ': has unexpected WITH CHECK'
      WHEN pg_temp.normalize_expr(ip.actual_using) != pg_temp.normalize_expr(ep.expected_using)
        THEN ep.policy_name || ': USING mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'SELECT'
) sub
WHERE detail IS NOT NULL

UNION ALL

-- ============================================================
-- C07: INSERT expression validation (WITH CHECK with org checks, no USING)
-- ============================================================
SELECT 'C07', 'insert_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' INSERT expression mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_using != '' THEN ep.policy_name || ': has unexpected USING'
      WHEN pg_temp.normalize_expr(ip.actual_check) != pg_temp.normalize_expr(ep.expected_check)
        THEN ep.policy_name || ': WITH CHECK mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'INSERT'
) sub
WHERE detail IS NOT NULL

UNION ALL

-- ============================================================
-- C08: UPDATE expression validation (USING + WITH CHECK both match, prevents org_id reassignment)
-- ============================================================
SELECT 'C08', 'update_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' UPDATE expression mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_using = '' THEN ep.policy_name || ': missing USING'
      WHEN ip.actual_check = '' THEN ep.policy_name || ': missing WITH CHECK'
      WHEN pg_temp.normalize_expr(ip.actual_using) != pg_temp.normalize_expr(ep.expected_using)
        THEN ep.policy_name || ': USING mismatch'
      WHEN pg_temp.normalize_expr(ip.actual_check) != pg_temp.normalize_expr(ep.expected_check)
        THEN ep.policy_name || ': WITH CHECK mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'UPDATE'
) sub
WHERE detail IS NOT NULL

UNION ALL

-- ============================================================
-- C09: DELETE expression validation (USING matches including status conditions, no WITH CHECK)
-- ============================================================
SELECT 'C09', 'delete_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' DELETE expression mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_check != '' THEN ep.policy_name || ': has unexpected WITH CHECK'
      WHEN pg_temp.normalize_expr(ip.actual_using) != pg_temp.normalize_expr(ep.expected_using)
        THEN ep.policy_name || ': USING mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'DELETE'
) sub
WHERE detail IS NOT NULL

UNION ALL

-- ============================================================
-- C10: Immutable tables have NO UPDATE/DELETE policies
-- ============================================================
SELECT 'C10', 'immutable_tables_protected',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' forbidden policies: ' || string_agg(ip.policy_name || '(' || ip.cmd || ' ON ' || ip.tablename || ')', ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN ('activity_log','attendance','bank_entries','cash_entries','fuel_entries','notifications','purchases','sales')
  AND ip.cmd IN ('UPDATE', 'DELETE')

UNION ALL

-- ============================================================
-- C11: Function-managed tables have NO UPDATE/DELETE policies
-- ============================================================
SELECT 'C11', 'function_managed_protected',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' forbidden policies: ' || string_agg(ip.policy_name || '(' || ip.cmd || ' ON ' || ip.tablename || ')', ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN ('trips','invoices','payments','claims','approvals','leave_requests','ledger_accounts')
  AND ip.cmd IN ('UPDATE', 'DELETE')

UNION ALL

-- ============================================================
-- C12: No driver/customer role string in any policy expression
-- ============================================================
SELECT 'C12', 'no_driver_customer_roles',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' policies with forbidden roles: ' || string_agg(ip.policy_name, ', ')
  END
FROM installed_policies ip
WHERE (ip.actual_using LIKE '%''driver''%' OR ip.actual_using LIKE '%''customer''%'
  OR ip.actual_check LIKE '%''driver''%' OR ip.actual_check LIKE '%''customer''%')

UNION ALL

-- ============================================================
-- C13: No anon policies on business tables
-- ============================================================
SELECT 'C13', 'no_anon_business_policies',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' anon-targeted policies found'
  END
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (SELECT t FROM business_tables)
  AND pol.polroles @> ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'anon')]::oid[]

UNION ALL

-- ============================================================
-- C14: Immutable org_id trigger exists on all 36 business tables
-- ============================================================
SELECT 'C14', 'immutable_org_id_triggers',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' tables missing trigger: ' || string_agg(t, ', ')
  END
FROM (SELECT t FROM business_tables) bt
WHERE NOT EXISTS (
  SELECT 1 FROM pg_trigger tr
  JOIN pg_class c ON c.oid = tr.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = bt.t
    AND tr.tgname = 'enforce_immutable_organization_id'
)

UNION ALL

-- ============================================================
-- C15: Total policy count = 102 (36S + 33I + 21U + 12D)
-- ============================================================
SELECT 'C15', 'total_count_102',
  CASE WHEN count(*) = 102 THEN 'PASS'
    ELSE 'FAIL: expected 102, got ' || count(*)
  END
FROM installed_policies ip

ORDER BY check_id;
