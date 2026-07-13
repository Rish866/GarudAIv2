-- migration-004-C-validation.sql
-- Migration 004 Validation: Schema normalization verification
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only. All results derived from catalog state.
-- Expected: ALL 7 CHECKS PASS

-- C01: All 22 converted columns are UUID type
SELECT 'C01' AS check_id, 'columns_are_uuid' AS check_name,
  CASE WHEN count(*) = 22 THEN 'PASS'
    ELSE 'FAIL: expected 22 UUID columns, got ' || count(*) || '. Non-UUID: ' ||
      (SELECT string_agg(t || '.' || c, ', ') FROM (VALUES
        ('drivers', 'assigned_vehicle_id'),
        ('enquiries', 'customer_id'),
        ('eway_bills', 'transporter_id'),
        ('eway_bills', 'trip_id'),
        ('expenses', 'trip_id'),
        ('expenses', 'vehicle_id'),
        ('fuel_entries', 'driver_id'),
        ('fuel_entries', 'trip_id'),
        ('fuel_entries', 'vehicle_id'),
        ('invoices', 'customer_id'),
        ('maintenance_records', 'vehicle_id'),
        ('payments', 'customer_id'),
        ('payments', 'invoice_id'),
        ('quotations', 'customer_id'),
        ('quotations', 'enquiry_id'),
        ('trips', 'customer_id'),
        ('trips', 'driver_id'),
        ('trips', 'enquiry_id'),
        ('trips', 'quotation_id'),
        ('trips', 'vehicle_id'),
        ('tyres', 'vehicle_id'),
        ('vehicles', 'driver_id')
      ) AS expected(t, c)
      WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = expected.t AND column_name = expected.c AND udt_name = 'uuid'))
  END AS result
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('drivers', 'assigned_vehicle_id'),
    ('enquiries', 'customer_id'),
    ('eway_bills', 'transporter_id'),
    ('eway_bills', 'trip_id'),
    ('expenses', 'trip_id'),
    ('expenses', 'vehicle_id'),
    ('fuel_entries', 'driver_id'),
    ('fuel_entries', 'trip_id'),
    ('fuel_entries', 'vehicle_id'),
    ('invoices', 'customer_id'),
    ('maintenance_records', 'vehicle_id'),
    ('payments', 'customer_id'),
    ('payments', 'invoice_id'),
    ('quotations', 'customer_id'),
    ('quotations', 'enquiry_id'),
    ('trips', 'customer_id'),
    ('trips', 'driver_id'),
    ('trips', 'enquiry_id'),
    ('trips', 'quotation_id'),
    ('trips', 'vehicle_id'),
    ('tyres', 'vehicle_id'),
    ('vehicles', 'driver_id')
  ) AND udt_name = 'uuid'

UNION ALL

-- C02: All 22 converted columns are nullable
SELECT 'C02', 'columns_nullable',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unexpectedly NOT NULL: ' || string_agg(table_name || '.' || column_name, ', ')
  END
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('drivers', 'assigned_vehicle_id'),
    ('enquiries', 'customer_id'),
    ('eway_bills', 'transporter_id'),
    ('eway_bills', 'trip_id'),
    ('expenses', 'trip_id'),
    ('expenses', 'vehicle_id'),
    ('fuel_entries', 'driver_id'),
    ('fuel_entries', 'trip_id'),
    ('fuel_entries', 'vehicle_id'),
    ('invoices', 'customer_id'),
    ('maintenance_records', 'vehicle_id'),
    ('payments', 'customer_id'),
    ('payments', 'invoice_id'),
    ('quotations', 'customer_id'),
    ('quotations', 'enquiry_id'),
    ('trips', 'customer_id'),
    ('trips', 'driver_id'),
    ('trips', 'enquiry_id'),
    ('trips', 'quotation_id'),
    ('trips', 'vehicle_id'),
    ('tyres', 'vehicle_id'),
    ('vehicles', 'driver_id')
  ) AND is_nullable = 'NO'

UNION ALL

-- C03: organization_id NOT NULL on ALL 36 business tables
SELECT 'C03', 'org_id_not_null_all_36',
  CASE WHEN count(*) = 36 THEN 'PASS'
    ELSE 'FAIL: expected 36, got ' || count(*) || '. Nullable: ' ||
      (SELECT string_agg(table_name, ', ') FROM information_schema.columns
       WHERE table_schema = 'public' AND column_name = 'organization_id' AND is_nullable = 'YES'
       AND table_name IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders'))
  END
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'organization_id' AND is_nullable = 'NO'
  AND table_name IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders')

UNION ALL

-- C04: No FK/UNIQUE constraints exist on converted UUID columns
-- (Migration 005 adds composite FKs later; premature constraints = error)
SELECT 'C04', 'no_premature_fk_unique',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' unexpected FK/UNIQUE constraints: ' || string_agg(conname, ', ')
  END
FROM pg_constraint con
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
WHERE con.connamespace = 'public'::regnamespace
  AND con.contype IN ('f', 'u')
  AND (con.conrelid::regclass::text, a.attname) IN (
    ('drivers', 'assigned_vehicle_id'),
    ('enquiries', 'customer_id'),
    ('eway_bills', 'transporter_id'),
    ('eway_bills', 'trip_id'),
    ('expenses', 'trip_id'),
    ('expenses', 'vehicle_id'),
    ('fuel_entries', 'driver_id'),
    ('fuel_entries', 'trip_id'),
    ('fuel_entries', 'vehicle_id'),
    ('invoices', 'customer_id'),
    ('maintenance_records', 'vehicle_id'),
    ('payments', 'customer_id'),
    ('payments', 'invoice_id'),
    ('quotations', 'customer_id'),
    ('quotations', 'enquiry_id'),
    ('trips', 'customer_id'),
    ('trips', 'driver_id'),
    ('trips', 'enquiry_id'),
    ('trips', 'quotation_id'),
    ('trips', 'vehicle_id'),
    ('tyres', 'vehicle_id'),
    ('vehicles', 'driver_id')
  )

UNION ALL

-- C05: Zero effective privileges for anon/authenticated across all 36 tables
SELECT 'C05', 'dormant_effective_privileges',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' effective privileges: ' || string_agg(t || ':' || r || ':' || p, ', ' ORDER BY t,r,p)
  END
FROM (
  SELECT t.t, r.r, p.p
  FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)
  WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)
) violations

UNION ALL

-- C06: No TEXT type remaining on converted columns
SELECT 'C06', 'no_text_remaining',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' still TEXT: ' || string_agg(table_name || '.' || column_name, ', ')
  END
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('drivers', 'assigned_vehicle_id'),
    ('enquiries', 'customer_id'),
    ('eway_bills', 'transporter_id'),
    ('eway_bills', 'trip_id'),
    ('expenses', 'trip_id'),
    ('expenses', 'vehicle_id'),
    ('fuel_entries', 'driver_id'),
    ('fuel_entries', 'trip_id'),
    ('fuel_entries', 'vehicle_id'),
    ('invoices', 'customer_id'),
    ('maintenance_records', 'vehicle_id'),
    ('payments', 'customer_id'),
    ('payments', 'invoice_id'),
    ('quotations', 'customer_id'),
    ('quotations', 'enquiry_id'),
    ('trips', 'customer_id'),
    ('trips', 'driver_id'),
    ('trips', 'enquiry_id'),
    ('trips', 'quotation_id'),
    ('trips', 'vehicle_id'),
    ('tyres', 'vehicle_id'),
    ('vehicles', 'driver_id')
  ) AND data_type = 'text'

UNION ALL

-- C07: Zero PUBLIC grants on all 36 business tables
SELECT 'C07', 'zero_public_grants',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' PUBLIC grants'
  END
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
WHERE c.relkind = 'r' AND acl.grantee = 0
  AND c.relname IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders')

ORDER BY check_id;
