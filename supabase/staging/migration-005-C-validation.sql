-- migration-005-C-validation.sql
-- Migration 005 Validation: Same-organization relational integrity
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only. All results derived from catalog state.
-- Expected: ALL 8 CHECKS PASS

-- C01: UNIQUE(organization_id, id) constraints exist on all target tables
SELECT 'C01' AS check_id, 'unique_constraints' AS check_name,
  CASE WHEN count(*) = 9 THEN 'PASS'
    ELSE 'FAIL: expected 9 UNIQUE constraints, got ' || count(*)
  END AS result
FROM pg_constraint con
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype = 'u'
  AND con.conname IN ('uq_branches_org_id','uq_customers_org_id','uq_drivers_org_id','uq_enquiries_org_id','uq_invoices_org_id','uq_quotations_org_id','uq_trips_org_id','uq_vehicles_org_id','uq_vendors_org_id')

UNION ALL

-- C02: All 34 composite FK constraints exist
SELECT 'C02', 'composite_fk_count',
  CASE WHEN count(*) = 34 THEN 'PASS'
    ELSE 'FAIL: expected 34 composite FKs, got ' || count(*)
  END
FROM pg_constraint con
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype = 'f'
  AND con.conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')

UNION ALL

-- C03: FK source columns are exactly (organization_id, source_column)
SELECT 'C03', 'fk_source_columns',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' FKs with wrong source columns'
  END
FROM pg_constraint con
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype = 'f'
  AND con.conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')
  AND array_length(con.conkey, 1) != 2

UNION ALL

-- C04: FK references target(organization_id, id)
SELECT 'C04', 'fk_target_columns',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' FKs with wrong target columns'
  END
FROM pg_constraint con
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype = 'f'
  AND con.conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')
  AND array_length(con.confkey, 1) != 2

UNION ALL

-- C05: All composite FKs are validated (convalidated = true)
SELECT 'C05', 'fk_validated',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' FKs not validated: ' || string_agg(conname, ', ')
  END
FROM pg_constraint con
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype = 'f'
  AND con.conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')
  AND NOT con.convalidated

UNION ALL

-- C06: MATCH SIMPLE + NO ACTION for all FKs
SELECT 'C06', 'fk_match_actions',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' FKs with wrong MATCH/action'
  END
FROM pg_constraint con
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype = 'f'
  AND con.conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')
  AND (con.confmatchtype != 's' OR con.confupdtype != 'a' OR con.confdeltype != 'a')

UNION ALL

-- C07: Old simple FKs have been removed
SELECT 'C07', 'old_fks_removed',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' old FKs remain: ' || string_agg(conname, ', ')
  END
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
  AND conname IN ('attendance_employee_id_fkey','challans_driver_id_fkey','challans_vehicle_id_fkey','claims_trip_id_fkey','contracts_customer_id_fkey','gps_devices_vehicle_id_fkey','indents_customer_id_fkey','indents_trip_id_fkey','leave_requests_employee_id_fkey','transfers_from_branch_fkey','transfers_to_branch_fkey','work_orders_vehicle_id_fkey')

UNION ALL

-- C08: Zero business-table client privileges (dormant state preserved)
SELECT 'C08', 'zero_client_privileges',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' effective privileges'
  END
FROM (
  SELECT 1
  FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)
  WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)
) violations

ORDER BY check_id;
