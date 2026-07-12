-- migration-003-C-validation.sql
-- Migration 003 Validation: Expression-level verification of 104 business RLS policies
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes
-- Uses pg_policy + pg_class + pg_namespace + pg_get_expr() for behavioral validation
-- Expected: ALL CHECKS PASS

-- ============================================================
-- SETUP: Expected policy manifest as a CTE
-- Each row = one expected policy with its exact expression fingerprint
-- ============================================================

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
    ('role_update_purchases', 'purchases', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
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
    ('role_update_sales', 'sales', 'UPDATE', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])', 'public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'',''accountant''])'),
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
-- INSTALLED: Actual policies from pg_policy catalog
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
    AND pol.polname LIKE 'role_%'
),

-- ============================================================
-- BUSINESS TABLES for scope filtering
-- ============================================================
business_tables(t) AS (
  VALUES
    ('vehicles'),('drivers'),('customers'),('trips'),('enquiries'),('quotations'),
    ('invoices'),('payments'),('expenses'),('fuel_entries'),('maintenance_records'),
    ('tyres'),('activity_log'),('notifications'),('eway_bills'),('branches'),
    ('vendors'),('contracts'),('routes'),('indents'),('market_hires'),
    ('work_orders'),('challans'),('geofences'),('claims'),('approvals'),
    ('transfers'),('cash_entries'),('bank_entries'),('ledger_accounts'),
    ('purchases'),('sales'),('inventory'),('attendance'),('leave_requests'),
    ('gps_devices')
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
-- C02: Extra policies (installed but not expected)
-- ============================================================
SELECT 'C02', 'extra_policies',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' extra: ' || string_agg(ip.policy_name, ', ' ORDER BY ip.policy_name)
  END
FROM installed_policies ip
LEFT JOIN expected_policies ep ON ep.policy_name = ip.policy_name AND ep.tablename = ip.tablename
WHERE ep.policy_name IS NULL
  AND ip.tablename IN (SELECT t FROM business_tables)

UNION ALL


-- ============================================================
-- C03: All policies are PERMISSIVE
-- ============================================================
SELECT 'C03', 'all_permissive',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' non-permissive: ' || string_agg(ip.policy_name, ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN (SELECT t FROM business_tables)
  AND ip.permissive != 'PERMISSIVE'

UNION ALL

-- ============================================================
-- C04: All policies target exactly {authenticated} role
-- ============================================================
SELECT 'C04', 'roles_exactly_authenticated',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' wrong roles: ' || string_agg(ip.policy_name || '=' || array_to_string(ip.roles_arr,','), '; ')
  END
FROM installed_policies ip
WHERE ip.tablename IN (SELECT t FROM business_tables)
  AND NOT (ip.roles_arr = ARRAY['authenticated']::text[])

UNION ALL

-- ============================================================
-- C05: Command types match expected
-- ============================================================
SELECT 'C05', 'command_type_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' command mismatches: ' || string_agg(ep.policy_name || ' expected=' || ep.cmd || ' actual=' || ip.cmd, '; ')
  END
FROM expected_policies ep
JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
WHERE ip.cmd != ep.cmd

UNION ALL

-- ============================================================
-- C06: SELECT policies have USING with org membership, no WITH CHECK
-- ============================================================
SELECT 'C06', 'select_expression_check',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' SELECT issues: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ip.policy_name,
    CASE
      WHEN ip.actual_using = '' THEN ip.policy_name || ': missing USING'
      WHEN ip.actual_using NOT LIKE '%is_organization_member%' THEN ip.policy_name || ': no org membership in USING'
      WHEN ip.actual_using NOT LIKE '%has_organization_role%' THEN ip.policy_name || ': no role check in USING'
      WHEN ip.actual_check != '' THEN ip.policy_name || ': unexpected WITH CHECK'
      ELSE NULL
    END AS detail
  FROM installed_policies ip
  WHERE ip.tablename IN (SELECT t FROM business_tables)
    AND ip.cmd = 'SELECT'
) sub
WHERE detail IS NOT NULL

UNION ALL

-- ============================================================
-- C07: INSERT policies have WITH CHECK with org membership, no USING
-- ============================================================
SELECT 'C07', 'insert_expression_check',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' INSERT issues: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ip.policy_name,
    CASE
      WHEN ip.actual_check = '' THEN ip.policy_name || ': missing WITH CHECK'
      WHEN ip.actual_check NOT LIKE '%is_organization_member%' THEN ip.policy_name || ': no org membership in WITH CHECK'
      WHEN ip.actual_check NOT LIKE '%has_organization_role%' THEN ip.policy_name || ': no role check in WITH CHECK'
      WHEN ip.actual_using != '' THEN ip.policy_name || ': unexpected USING'
      ELSE NULL
    END AS detail
  FROM installed_policies ip
  WHERE ip.tablename IN (SELECT t FROM business_tables)
    AND ip.cmd = 'INSERT'
) sub
WHERE detail IS NOT NULL

UNION ALL


-- ============================================================
-- C08: UPDATE policies have USING and WITH CHECK both with org checks
--      USING == WITH CHECK ensures organization_id cannot be reassigned
-- ============================================================
SELECT 'C08', 'update_expression_check',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' UPDATE issues: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ip.policy_name,
    CASE
      WHEN ip.actual_using = '' THEN ip.policy_name || ': missing USING'
      WHEN ip.actual_check = '' THEN ip.policy_name || ': missing WITH CHECK'
      WHEN ip.actual_using NOT LIKE '%is_organization_member%' THEN ip.policy_name || ': no org membership in USING'
      WHEN ip.actual_check NOT LIKE '%is_organization_member%' THEN ip.policy_name || ': no org membership in WITH CHECK'
      WHEN ip.actual_using NOT LIKE '%has_organization_role%' THEN ip.policy_name || ': no role check in USING'
      WHEN ip.actual_check NOT LIKE '%has_organization_role%' THEN ip.policy_name || ': no role check in WITH CHECK'
      ELSE NULL
    END AS detail
  FROM installed_policies ip
  WHERE ip.tablename IN (SELECT t FROM business_tables)
    AND ip.cmd = 'UPDATE'
) sub
WHERE detail IS NOT NULL

UNION ALL

-- ============================================================
-- C09: DELETE policies have USING with org checks + status conditions where expected
-- ============================================================
SELECT 'C09', 'delete_expression_check',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' DELETE issues: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_using = '' THEN ep.policy_name || ': missing USING'
      WHEN ip.actual_using NOT LIKE '%is_organization_member%' THEN ep.policy_name || ': no org membership'
      WHEN ip.actual_using NOT LIKE '%has_organization_role%' THEN ep.policy_name || ': no role check'
      WHEN ip.actual_check != '' THEN ep.policy_name || ': unexpected WITH CHECK'
      -- Check status conditions for policies that require them
      WHEN ep.expected_using LIKE '%status =%' AND ip.actual_using NOT LIKE '%status%' THEN ep.policy_name || ': missing status condition'
      WHEN ep.expected_using LIKE '%payment_status =%' AND ip.actual_using NOT LIKE '%payment_status%' THEN ep.policy_name || ': missing payment_status condition'
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
    ELSE 'FAIL: ' || count(*) || ' forbidden policies: ' || string_agg(ip.policy_name || '(' || ip.cmd || ')', ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN ('activity_log','attendance','bank_entries','cash_entries','fuel_entries','notifications')
  AND ip.cmd IN ('UPDATE','DELETE')

UNION ALL

-- ============================================================
-- C11: Function-managed tables have NO UPDATE/DELETE policies
-- ============================================================
SELECT 'C11', 'function_managed_protected',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' forbidden policies: ' || string_agg(ip.policy_name || '(' || ip.cmd || ')', ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN ('trips','invoices','payments','claims','approvals','leave_requests','ledger_accounts')
  AND ip.cmd IN ('UPDATE','DELETE')

UNION ALL


-- ============================================================
-- C12: No driver/customer role in any policy expression
-- ============================================================
SELECT 'C12', 'no_driver_customer_roles',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' policies with forbidden roles: ' || string_agg(ip.policy_name, ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN (SELECT t FROM business_tables)
  AND (ip.actual_using LIKE '%''driver''%' OR ip.actual_using LIKE '%''customer''%'
    OR ip.actual_check LIKE '%''driver''%' OR ip.actual_check LIKE '%''customer''%')

UNION ALL

-- ============================================================
-- C13: No anon policies on business tables
-- ============================================================
SELECT 'C13', 'no_anon_business_policies',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' anon policies found'
  END
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (SELECT t FROM business_tables)
  AND pol.polroles @> ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'anon')]::oid[]

UNION ALL

-- ============================================================
-- C14: Platform policies still intact (>= 10)
-- ============================================================
SELECT 'C14', 'platform_policies_intact',
  CASE WHEN count(*) >= 10 THEN 'PASS'
    ELSE 'FAIL: expected >= 10 platform policies, got ' || count(*)
  END
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('organizations','organization_members','organization_settings',
                    'organization_invitations','user_profiles','platform_admins')

UNION ALL

-- ============================================================
-- C15: Total business policy count = 104
-- ============================================================
SELECT 'C15', 'total_count_104',
  CASE WHEN count(*) = 104 THEN 'PASS'
    ELSE 'FAIL: expected 104, got ' || count(*)
  END
FROM installed_policies ip
WHERE ip.tablename IN (SELECT t FROM business_tables)

ORDER BY check_id;
