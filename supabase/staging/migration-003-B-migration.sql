-- migration-003-B-migration.sql
-- Migration 003: 104 role-based business RLS policies
-- Target: staging ybuhazlnjqjrshcvpuna
-- ATOMIC: BEGIN/COMMIT
-- Pattern: role_{command}_{table} TO authenticated
-- Organization scope: is_organization_member + has_organization_role
-- NO grants issued: policies dormant until Migration 013 activates privileges
-- Activation: Migration 013 (single point for all client grants)

BEGIN;

-- activity_log
DROP POLICY IF EXISTS "role_select_activity_log" ON public.activity_log;
CREATE POLICY "role_select_activity_log" ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

-- approvals
DROP POLICY IF EXISTS "role_select_approvals" ON public.approvals;
CREATE POLICY "role_select_approvals" ON public.approvals FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','accountant']));

-- attendance
DROP POLICY IF EXISTS "role_select_attendance" ON public.attendance;
CREATE POLICY "role_select_attendance" ON public.attendance FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager','operations_manager']));
DROP POLICY IF EXISTS "role_insert_attendance" ON public.attendance;
CREATE POLICY "role_insert_attendance" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']));

-- bank_entries
DROP POLICY IF EXISTS "role_select_bank_entries" ON public.bank_entries;
CREATE POLICY "role_select_bank_entries" ON public.bank_entries FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_insert_bank_entries" ON public.bank_entries;
CREATE POLICY "role_insert_bank_entries" ON public.bank_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- branches
DROP POLICY IF EXISTS "role_select_branches" ON public.branches;
CREATE POLICY "role_select_branches" ON public.branches FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));
DROP POLICY IF EXISTS "role_insert_branches" ON public.branches;
CREATE POLICY "role_insert_branches" ON public.branches FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));
DROP POLICY IF EXISTS "role_update_branches" ON public.branches;
CREATE POLICY "role_update_branches" ON public.branches FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

-- cash_entries
DROP POLICY IF EXISTS "role_select_cash_entries" ON public.cash_entries;
CREATE POLICY "role_select_cash_entries" ON public.cash_entries FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_insert_cash_entries" ON public.cash_entries;
CREATE POLICY "role_insert_cash_entries" ON public.cash_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- challans
DROP POLICY IF EXISTS "role_select_challans" ON public.challans;
CREATE POLICY "role_select_challans" ON public.challans FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']));
DROP POLICY IF EXISTS "role_insert_challans" ON public.challans;
CREATE POLICY "role_insert_challans" ON public.challans FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']));
DROP POLICY IF EXISTS "role_update_challans" ON public.challans;
CREATE POLICY "role_update_challans" ON public.challans FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));

-- claims
DROP POLICY IF EXISTS "role_select_claims" ON public.claims;
CREATE POLICY "role_select_claims" ON public.claims FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','accountant']));
DROP POLICY IF EXISTS "role_insert_claims" ON public.claims;
CREATE POLICY "role_insert_claims" ON public.claims FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));

-- contracts
DROP POLICY IF EXISTS "role_select_contracts" ON public.contracts;
CREATE POLICY "role_select_contracts" ON public.contracts FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_insert_contracts" ON public.contracts;
CREATE POLICY "role_insert_contracts" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_update_contracts" ON public.contracts;
CREATE POLICY "role_update_contracts" ON public.contracts FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));

-- customers
DROP POLICY IF EXISTS "role_select_customers" ON public.customers;
CREATE POLICY "role_select_customers" ON public.customers FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher','accountant']));
DROP POLICY IF EXISTS "role_insert_customers" ON public.customers;
CREATE POLICY "role_insert_customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','accountant','dispatcher']));
DROP POLICY IF EXISTS "role_update_customers" ON public.customers;
CREATE POLICY "role_update_customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','accountant']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','accountant']));

-- drivers
DROP POLICY IF EXISTS "role_select_drivers" ON public.drivers;
CREATE POLICY "role_select_drivers" ON public.drivers FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']));
DROP POLICY IF EXISTS "role_insert_drivers" ON public.drivers;
CREATE POLICY "role_insert_drivers" ON public.drivers FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']));
DROP POLICY IF EXISTS "role_update_drivers" ON public.drivers;
CREATE POLICY "role_update_drivers" ON public.drivers FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']));

-- enquiries
DROP POLICY IF EXISTS "role_select_enquiries" ON public.enquiries;
CREATE POLICY "role_select_enquiries" ON public.enquiries FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_insert_enquiries" ON public.enquiries;
CREATE POLICY "role_insert_enquiries" ON public.enquiries FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_update_enquiries" ON public.enquiries;
CREATE POLICY "role_update_enquiries" ON public.enquiries FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_delete_enquiries" ON public.enquiries;
CREATE POLICY "role_delete_enquiries" ON public.enquiries FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'new');

-- eway_bills
DROP POLICY IF EXISTS "role_select_eway_bills" ON public.eway_bills;
CREATE POLICY "role_select_eway_bills" ON public.eway_bills FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_insert_eway_bills" ON public.eway_bills;
CREATE POLICY "role_insert_eway_bills" ON public.eway_bills FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_update_eway_bills" ON public.eway_bills;
CREATE POLICY "role_update_eway_bills" ON public.eway_bills FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));

-- expenses
DROP POLICY IF EXISTS "role_select_expenses" ON public.expenses;
CREATE POLICY "role_select_expenses" ON public.expenses FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_insert_expenses" ON public.expenses;
CREATE POLICY "role_insert_expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_update_expenses" ON public.expenses;
CREATE POLICY "role_update_expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager']));

-- fuel_entries
DROP POLICY IF EXISTS "role_select_fuel_entries" ON public.fuel_entries;
CREATE POLICY "role_select_fuel_entries" ON public.fuel_entries FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']));
DROP POLICY IF EXISTS "role_insert_fuel_entries" ON public.fuel_entries;
CREATE POLICY "role_insert_fuel_entries" ON public.fuel_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager','dispatcher']));

-- geofences
DROP POLICY IF EXISTS "role_select_geofences" ON public.geofences;
CREATE POLICY "role_select_geofences" ON public.geofences FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']));
DROP POLICY IF EXISTS "role_insert_geofences" ON public.geofences;
CREATE POLICY "role_insert_geofences" ON public.geofences FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));
DROP POLICY IF EXISTS "role_update_geofences" ON public.geofences;
CREATE POLICY "role_update_geofences" ON public.geofences FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));
DROP POLICY IF EXISTS "role_delete_geofences" ON public.geofences;
CREATE POLICY "role_delete_geofences" ON public.geofences FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));

-- gps_devices
DROP POLICY IF EXISTS "role_select_gps_devices" ON public.gps_devices;
CREATE POLICY "role_select_gps_devices" ON public.gps_devices FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));
DROP POLICY IF EXISTS "role_insert_gps_devices" ON public.gps_devices;
CREATE POLICY "role_insert_gps_devices" ON public.gps_devices FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));
DROP POLICY IF EXISTS "role_update_gps_devices" ON public.gps_devices;
CREATE POLICY "role_update_gps_devices" ON public.gps_devices FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));
DROP POLICY IF EXISTS "role_delete_gps_devices" ON public.gps_devices;
CREATE POLICY "role_delete_gps_devices" ON public.gps_devices FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager']));

-- indents
DROP POLICY IF EXISTS "role_select_indents" ON public.indents;
CREATE POLICY "role_select_indents" ON public.indents FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_insert_indents" ON public.indents;
CREATE POLICY "role_insert_indents" ON public.indents FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_update_indents" ON public.indents;
CREATE POLICY "role_update_indents" ON public.indents FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_delete_indents" ON public.indents;
CREATE POLICY "role_delete_indents" ON public.indents FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'pending');

-- inventory
DROP POLICY IF EXISTS "role_select_inventory" ON public.inventory;
CREATE POLICY "role_select_inventory" ON public.inventory FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager','accountant']));
DROP POLICY IF EXISTS "role_insert_inventory" ON public.inventory;
CREATE POLICY "role_insert_inventory" ON public.inventory FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_update_inventory" ON public.inventory;
CREATE POLICY "role_update_inventory" ON public.inventory FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_delete_inventory" ON public.inventory;
CREATE POLICY "role_delete_inventory" ON public.inventory FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

-- invoices
DROP POLICY IF EXISTS "role_select_invoices" ON public.invoices;
CREATE POLICY "role_select_invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager']));
DROP POLICY IF EXISTS "role_insert_invoices" ON public.invoices;
CREATE POLICY "role_insert_invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- leave_requests
DROP POLICY IF EXISTS "role_select_leave_requests" ON public.leave_requests;
CREATE POLICY "role_select_leave_requests" ON public.leave_requests FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']));
DROP POLICY IF EXISTS "role_insert_leave_requests" ON public.leave_requests;
CREATE POLICY "role_insert_leave_requests" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','hr_manager']));

-- ledger_accounts
DROP POLICY IF EXISTS "role_select_ledger_accounts" ON public.ledger_accounts;
CREATE POLICY "role_select_ledger_accounts" ON public.ledger_accounts FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_insert_ledger_accounts" ON public.ledger_accounts;
CREATE POLICY "role_insert_ledger_accounts" ON public.ledger_accounts FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- maintenance_records
DROP POLICY IF EXISTS "role_select_maintenance_records" ON public.maintenance_records;
CREATE POLICY "role_select_maintenance_records" ON public.maintenance_records FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_insert_maintenance_records" ON public.maintenance_records;
CREATE POLICY "role_insert_maintenance_records" ON public.maintenance_records FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_update_maintenance_records" ON public.maintenance_records;
CREATE POLICY "role_update_maintenance_records" ON public.maintenance_records FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_delete_maintenance_records" ON public.maintenance_records;
CREATE POLICY "role_delete_maintenance_records" ON public.maintenance_records FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'scheduled');

-- market_hires
DROP POLICY IF EXISTS "role_select_market_hires" ON public.market_hires;
CREATE POLICY "role_select_market_hires" ON public.market_hires FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_insert_market_hires" ON public.market_hires;
CREATE POLICY "role_insert_market_hires" ON public.market_hires FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_update_market_hires" ON public.market_hires;
CREATE POLICY "role_update_market_hires" ON public.market_hires FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_delete_market_hires" ON public.market_hires;
CREATE POLICY "role_delete_market_hires" ON public.market_hires FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND payment_status = 'pending');

-- notifications
DROP POLICY IF EXISTS "role_select_notifications" ON public.notifications;
CREATE POLICY "role_select_notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher','fleet_manager','accountant','maintenance_manager','hr_manager']));

-- payments
DROP POLICY IF EXISTS "role_select_payments" ON public.payments;
CREATE POLICY "role_select_payments" ON public.payments FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_insert_payments" ON public.payments;
CREATE POLICY "role_insert_payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- purchases
DROP POLICY IF EXISTS "role_select_purchases" ON public.purchases;
CREATE POLICY "role_select_purchases" ON public.purchases FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_insert_purchases" ON public.purchases;
CREATE POLICY "role_insert_purchases" ON public.purchases FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_update_purchases" ON public.purchases;
CREATE POLICY "role_update_purchases" ON public.purchases FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- quotations
DROP POLICY IF EXISTS "role_select_quotations" ON public.quotations;
CREATE POLICY "role_select_quotations" ON public.quotations FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_insert_quotations" ON public.quotations;
CREATE POLICY "role_insert_quotations" ON public.quotations FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_update_quotations" ON public.quotations;
CREATE POLICY "role_update_quotations" ON public.quotations FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));
DROP POLICY IF EXISTS "role_delete_quotations" ON public.quotations;
CREATE POLICY "role_delete_quotations" ON public.quotations FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'draft');

-- routes
DROP POLICY IF EXISTS "role_select_routes" ON public.routes;
CREATE POLICY "role_select_routes" ON public.routes FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher','fleet_manager']));
DROP POLICY IF EXISTS "role_insert_routes" ON public.routes;
CREATE POLICY "role_insert_routes" ON public.routes FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_update_routes" ON public.routes;
CREATE POLICY "role_update_routes" ON public.routes FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_delete_routes" ON public.routes;
CREATE POLICY "role_delete_routes" ON public.routes FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

-- sales
DROP POLICY IF EXISTS "role_select_sales" ON public.sales;
CREATE POLICY "role_select_sales" ON public.sales FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_insert_sales" ON public.sales;
CREATE POLICY "role_insert_sales" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));
DROP POLICY IF EXISTS "role_update_sales" ON public.sales;
CREATE POLICY "role_update_sales" ON public.sales FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- transfers
DROP POLICY IF EXISTS "role_select_transfers" ON public.transfers;
CREATE POLICY "role_select_transfers" ON public.transfers FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_insert_transfers" ON public.transfers;
CREATE POLICY "role_insert_transfers" ON public.transfers FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_update_transfers" ON public.transfers;
CREATE POLICY "role_update_transfers" ON public.transfers FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager']));
DROP POLICY IF EXISTS "role_delete_transfers" ON public.transfers;
CREATE POLICY "role_delete_transfers" ON public.transfers FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'initiated');

-- trips
DROP POLICY IF EXISTS "role_select_trips" ON public.trips;
CREATE POLICY "role_select_trips" ON public.trips FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher','accountant']));
DROP POLICY IF EXISTS "role_insert_trips" ON public.trips;
CREATE POLICY "role_insert_trips" ON public.trips FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher']));

-- tyres
DROP POLICY IF EXISTS "role_select_tyres" ON public.tyres;
CREATE POLICY "role_select_tyres" ON public.tyres FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_insert_tyres" ON public.tyres;
CREATE POLICY "role_insert_tyres" ON public.tyres FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_update_tyres" ON public.tyres;
CREATE POLICY "role_update_tyres" ON public.tyres FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_delete_tyres" ON public.tyres;
CREATE POLICY "role_delete_tyres" ON public.tyres FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'spare');

-- vehicles
DROP POLICY IF EXISTS "role_select_vehicles" ON public.vehicles;
CREATE POLICY "role_select_vehicles" ON public.vehicles FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','operations_manager','dispatcher','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_insert_vehicles" ON public.vehicles;
CREATE POLICY "role_insert_vehicles" ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']));
DROP POLICY IF EXISTS "role_update_vehicles" ON public.vehicles;
CREATE POLICY "role_update_vehicles" ON public.vehicles FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','operations_manager']));

-- vendors
DROP POLICY IF EXISTS "role_select_vendors" ON public.vendors;
CREATE POLICY "role_select_vendors" ON public.vendors FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager']));
DROP POLICY IF EXISTS "role_insert_vendors" ON public.vendors;
CREATE POLICY "role_insert_vendors" ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant','operations_manager']));
DROP POLICY IF EXISTS "role_update_vendors" ON public.vendors;
CREATE POLICY "role_update_vendors" ON public.vendors FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','accountant']));

-- work_orders
DROP POLICY IF EXISTS "role_select_work_orders" ON public.work_orders;
CREATE POLICY "role_select_work_orders" ON public.work_orders FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_insert_work_orders" ON public.work_orders;
CREATE POLICY "role_insert_work_orders" ON public.work_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_update_work_orders" ON public.work_orders;
CREATE POLICY "role_update_work_orders" ON public.work_orders FOR UPDATE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']))
  WITH CHECK (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin','fleet_manager','maintenance_manager']));
DROP POLICY IF EXISTS "role_delete_work_orders" ON public.work_orders;
CREATE POLICY "role_delete_work_orders" ON public.work_orders FOR DELETE TO authenticated
  USING (public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY['organization_owner','admin']) AND status = 'open');

COMMIT;
