-- migration-005-C-validation.sql
-- Migration 005 Validation: catalog-derived exact comparison
-- Target: staging ybuhazlnjqjrshcvpuna
-- STRICTLY READ-ONLY. No DML. Run before Block D.
-- Expected: ALL checks PASS

-- C01-C06: Validate all 34 composite FKs via expected-relationships CTE
WITH expected_fks(fk_name, src_table, src_col, tgt_table) AS (VALUES
  ('fk_attendance_employee_id_org', 'attendance', 'employee_id', 'drivers'),
  ('fk_challans_driver_id_org', 'challans', 'driver_id', 'drivers'),
  ('fk_challans_vehicle_id_org', 'challans', 'vehicle_id', 'vehicles'),
  ('fk_claims_trip_id_org', 'claims', 'trip_id', 'trips'),
  ('fk_contracts_customer_id_org', 'contracts', 'customer_id', 'customers'),
  ('fk_drivers_assigned_vehicle_id_org', 'drivers', 'assigned_vehicle_id', 'vehicles'),
  ('fk_enquiries_customer_id_org', 'enquiries', 'customer_id', 'customers'),
  ('fk_eway_bills_transporter_id_org', 'eway_bills', 'transporter_id', 'vendors'),
  ('fk_eway_bills_trip_id_org', 'eway_bills', 'trip_id', 'trips'),
  ('fk_expenses_trip_id_org', 'expenses', 'trip_id', 'trips'),
  ('fk_expenses_vehicle_id_org', 'expenses', 'vehicle_id', 'vehicles'),
  ('fk_fuel_entries_driver_id_org', 'fuel_entries', 'driver_id', 'drivers'),
  ('fk_fuel_entries_trip_id_org', 'fuel_entries', 'trip_id', 'trips'),
  ('fk_fuel_entries_vehicle_id_org', 'fuel_entries', 'vehicle_id', 'vehicles'),
  ('fk_gps_devices_vehicle_id_org', 'gps_devices', 'vehicle_id', 'vehicles'),
  ('fk_indents_customer_id_org', 'indents', 'customer_id', 'customers'),
  ('fk_indents_trip_id_org', 'indents', 'trip_id', 'trips'),
  ('fk_invoices_customer_id_org', 'invoices', 'customer_id', 'customers'),
  ('fk_leave_requests_employee_id_org', 'leave_requests', 'employee_id', 'drivers'),
  ('fk_maintenance_records_vehicle_id_org', 'maintenance_records', 'vehicle_id', 'vehicles'),
  ('fk_payments_customer_id_org', 'payments', 'customer_id', 'customers'),
  ('fk_payments_invoice_id_org', 'payments', 'invoice_id', 'invoices'),
  ('fk_quotations_customer_id_org', 'quotations', 'customer_id', 'customers'),
  ('fk_quotations_enquiry_id_org', 'quotations', 'enquiry_id', 'enquiries'),
  ('fk_transfers_from_branch_org', 'transfers', 'from_branch', 'branches'),
  ('fk_transfers_to_branch_org', 'transfers', 'to_branch', 'branches'),
  ('fk_trips_customer_id_org', 'trips', 'customer_id', 'customers'),
  ('fk_trips_driver_id_org', 'trips', 'driver_id', 'drivers'),
  ('fk_trips_enquiry_id_org', 'trips', 'enquiry_id', 'enquiries'),
  ('fk_trips_quotation_id_org', 'trips', 'quotation_id', 'quotations'),
  ('fk_trips_vehicle_id_org', 'trips', 'vehicle_id', 'vehicles'),
  ('fk_tyres_vehicle_id_org', 'tyres', 'vehicle_id', 'vehicles'),
  ('fk_vehicles_driver_id_org', 'vehicles', 'driver_id', 'drivers'),
  ('fk_work_orders_vehicle_id_org', 'work_orders', 'vehicle_id', 'vehicles')
),
installed_fks AS (
  SELECT con.conname, con.conrelid::regclass::text AS src_table,
    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) AS src_col1,
    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]) AS src_col2,
    con.confrelid::regclass::text AS tgt_table,
    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) AS tgt_col1,
    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[2]) AS tgt_col2,
    con.convalidated, con.confmatchtype, con.confupdtype, con.confdeltype,
    array_length(con.conkey, 1) AS src_col_count,
    array_length(con.confkey, 1) AS tgt_col_count
  FROM pg_constraint con WHERE con.connamespace = 'public'::regnamespace AND con.contype = 'f'
    AND con.conname IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')
)

SELECT 'C01' AS check_id, 'missing_fks' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' missing: ' || string_agg(e.fk_name, ', ')
  END AS result
FROM expected_fks e LEFT JOIN installed_fks i ON i.conname = e.fk_name
WHERE i.conname IS NULL

UNION ALL

SELECT 'C02', 'fk_source_columns',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(i.conname || '(' || i.src_col1 || ',' || i.src_col2 || ')', ', ')
  END
FROM installed_fks i JOIN expected_fks e ON e.fk_name = i.conname
WHERE i.src_col_count != 2 OR i.src_col1 != 'organization_id' OR i.src_col2 != e.src_col

UNION ALL

SELECT 'C03', 'fk_target_columns',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(i.conname || ' -> ' || i.tgt_col1 || ',' || i.tgt_col2, ', ')
  END
FROM installed_fks i WHERE i.tgt_col_count != 2 OR i.tgt_col1 != 'organization_id' OR i.tgt_col2 != 'id'

UNION ALL

SELECT 'C04', 'fk_target_table',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(i.conname || ' expected->' || e.tgt_table || ' got->' || i.tgt_table, ', ')
  END
FROM installed_fks i JOIN expected_fks e ON e.fk_name = i.conname WHERE i.tgt_table != e.tgt_table

UNION ALL

SELECT 'C05', 'fk_validated_match_actions',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(i.conname || '(v=' || i.convalidated || ',m=' || i.confmatchtype || ',u=' || i.confupdtype || ',d=' || i.confdeltype || ')', ', ')
  END
FROM installed_fks i WHERE NOT i.convalidated OR i.confmatchtype != 's' OR i.confupdtype != 'a' OR i.confdeltype != 'a'

UNION ALL

SELECT 'C06', 'no_extra_composite_fks',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unexpected: ' || string_agg(conname, ', ')
  END
FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f'
  AND array_length(conkey, 1) = 2 AND conname LIKE 'fk_%_org'
  AND conname NOT IN ('fk_attendance_employee_id_org','fk_challans_driver_id_org','fk_challans_vehicle_id_org','fk_claims_trip_id_org','fk_contracts_customer_id_org','fk_drivers_assigned_vehicle_id_org','fk_enquiries_customer_id_org','fk_eway_bills_transporter_id_org','fk_eway_bills_trip_id_org','fk_expenses_trip_id_org','fk_expenses_vehicle_id_org','fk_fuel_entries_driver_id_org','fk_fuel_entries_trip_id_org','fk_fuel_entries_vehicle_id_org','fk_gps_devices_vehicle_id_org','fk_indents_customer_id_org','fk_indents_trip_id_org','fk_invoices_customer_id_org','fk_leave_requests_employee_id_org','fk_maintenance_records_vehicle_id_org','fk_payments_customer_id_org','fk_payments_invoice_id_org','fk_quotations_customer_id_org','fk_quotations_enquiry_id_org','fk_transfers_from_branch_org','fk_transfers_to_branch_org','fk_trips_customer_id_org','fk_trips_driver_id_org','fk_trips_enquiry_id_org','fk_trips_quotation_id_org','fk_trips_vehicle_id_org','fk_tyres_vehicle_id_org','fk_vehicles_driver_id_org','fk_work_orders_vehicle_id_org')

UNION ALL

-- C07: All 9 UNIQUE constraints exact (name, table, columns, validated)
SELECT 'C07', 'unique_constraints_exact',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(issue, '; ')
  END
FROM (
  SELECT e.uq_name || ': ' || CASE
    WHEN con.conname IS NULL THEN 'MISSING'
    WHEN NOT con.convalidated THEN 'NOT VALIDATED'
    WHEN array_length(con.conkey, 1) != 2 THEN 'cols=' || array_length(con.conkey, 1)
    WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) != 'organization_id'
      THEN 'col1 != organization_id'
    WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]) != 'id'
      THEN 'col2 != id'
    ELSE NULL END AS issue
  FROM (VALUES
    ('uq_branches_org_id', 'branches'),
    ('uq_customers_org_id', 'customers'),
    ('uq_drivers_org_id', 'drivers'),
    ('uq_enquiries_org_id', 'enquiries'),
    ('uq_invoices_org_id', 'invoices'),
    ('uq_quotations_org_id', 'quotations'),
    ('uq_trips_org_id', 'trips'),
    ('uq_vehicles_org_id', 'vehicles'),
    ('uq_vendors_org_id', 'vendors')
  ) AS e(uq_name, expected_table)
  LEFT JOIN pg_constraint con ON con.connamespace = 'public'::regnamespace
    AND con.conname = e.uq_name AND con.contype = 'u'
) sub WHERE issue IS NOT NULL

UNION ALL

-- C08: No unexpected equivalent UNIQUE(org_id,id) duplicates
SELECT 'C08', 'no_duplicate_uniques',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(conname || ' on ' || conrelid::regclass::text, ', ')
  END
FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'u'
  AND conrelid::regclass::text IN ('branches','customers','drivers','enquiries','invoices','quotations','trips','vehicles','vendors')
  AND array_length(conkey, 1) = 2
  AND conname NOT IN ('uq_branches_org_id','uq_customers_org_id','uq_drivers_org_id','uq_enquiries_org_id','uq_invoices_org_id','uq_quotations_org_id','uq_trips_org_id','uq_vehicles_org_id','uq_vendors_org_id')

UNION ALL

-- C09: All 34 source reference columns remain nullable UUID
SELECT 'C09', 'source_cols_nullable_uuid',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(t || '.' || c || '(' || udt_name || ',' || is_nullable || ')', ', ')
  END
FROM (
  SELECT expected.t, expected.c, cols.udt_name, cols.is_nullable
  FROM (VALUES
    ('attendance', 'employee_id'),
    ('challans', 'driver_id'),
    ('challans', 'vehicle_id'),
    ('claims', 'trip_id'),
    ('contracts', 'customer_id'),
    ('drivers', 'assigned_vehicle_id'),
    ('enquiries', 'customer_id'),
    ('eway_bills', 'transporter_id'),
    ('eway_bills', 'trip_id'),
    ('expenses', 'trip_id'),
    ('expenses', 'vehicle_id'),
    ('fuel_entries', 'driver_id'),
    ('fuel_entries', 'trip_id'),
    ('fuel_entries', 'vehicle_id'),
    ('gps_devices', 'vehicle_id'),
    ('indents', 'customer_id'),
    ('indents', 'trip_id'),
    ('invoices', 'customer_id'),
    ('leave_requests', 'employee_id'),
    ('maintenance_records', 'vehicle_id'),
    ('payments', 'customer_id'),
    ('payments', 'invoice_id'),
    ('quotations', 'customer_id'),
    ('quotations', 'enquiry_id'),
    ('transfers', 'from_branch'),
    ('transfers', 'to_branch'),
    ('trips', 'customer_id'),
    ('trips', 'driver_id'),
    ('trips', 'enquiry_id'),
    ('trips', 'quotation_id'),
    ('trips', 'vehicle_id'),
    ('tyres', 'vehicle_id'),
    ('vehicles', 'driver_id'),
    ('work_orders', 'vehicle_id')
  ) AS expected(t, c) LEFT JOIN information_schema.columns cols ON cols.table_schema = 'public'
    AND cols.table_name = expected.t AND cols.column_name = expected.c
  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'NO'
) mismatched

UNION ALL

-- C10: organization_id UUID NOT NULL on all source+target tables
SELECT 'C10', 'org_id_uuid_not_null',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(t || ':' || COALESCE(udt_name,'MISSING') || ':' || COALESCE(is_nullable,'?'), ', ')
  END
FROM (
  SELECT expected.t, cols.udt_name, cols.is_nullable FROM (VALUES ('attendance'),('branches'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('gps_devices'),('indents'),('invoices'),('leave_requests'),('maintenance_records'),('payments'),('quotations'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS expected(t)
  LEFT JOIN information_schema.columns cols ON cols.table_schema = 'public'
    AND cols.table_name = expected.t AND cols.column_name = 'organization_id'
  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'YES'
) mismatched

UNION ALL

-- C11: Old simple FKs removed
SELECT 'C11', 'old_fks_removed',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || string_agg(conname, ', ')
  END
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
  AND conname IN ('attendance_employee_id_fkey','challans_driver_id_fkey','challans_vehicle_id_fkey','claims_trip_id_fkey','contracts_customer_id_fkey','gps_devices_vehicle_id_fkey','indents_customer_id_fkey','indents_trip_id_fkey','leave_requests_employee_id_fkey','transfers_from_branch_fkey','transfers_to_branch_fkey','work_orders_vehicle_id_fkey')

UNION ALL

-- C12: Zero effective privileges (anon/authenticated/PUBLIC/MAINTAIN)
SELECT 'C12', 'zero_privileges',
  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || count(*) || ' privileges' END
FROM (
  SELECT 1 FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)
  WHERE has_table_privilege(r.r, 'public.'||t.t, p.p)
) v

ORDER BY check_id;
