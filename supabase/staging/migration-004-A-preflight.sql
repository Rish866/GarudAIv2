-- migration-004-A-preflight.sql
-- Migration 004 Preflight: Schema normalization prerequisites
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Checks (11 total):
--   1. All 12 affected tables exist
--   2. Target columns are currently TEXT type (not already converted)
--   3. Zero non-NULL, non-empty, invalid UUID values in 22 columns
--   4. Zero NULL organization_id values in 16 tables needing NOT NULL
--   5. Zero effective privileges for anon/authenticated (dormant state)
--   6. organization_id exists as UUID on all 16 tables
--   7. No conflicting partially-applied state (column already UUID = prior run)
--   8. No unexpected column types on converted columns
--   9. No unexpected FK/UNIQUE constraints involving converted fields
--  10. No leftover Migration 005 functions, triggers, or constraints
--  11. No partially applied organization_id NOT NULL changes

DO $preflight$
DECLARE
  issues TEXT[];
  bad_values TEXT[];
BEGIN

  -- Check 1: All affected tables exist
  SELECT array_agg(t) INTO issues
  FROM unnest(ARRAY['drivers','enquiries','eway_bills','expenses','fuel_entries','invoices','maintenance_records','payments','quotations','trips','tyres','vehicles']) AS t
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t);
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: missing tables: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 2: Target columns are currently TEXT (not already UUID)
  SELECT array_agg(t || '.' || c) INTO issues
  FROM (VALUES
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
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = expected.t
      AND column_name = expected.c AND data_type = 'text'
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: columns not TEXT (already converted or missing): %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 3: Zero invalid UUID values (case-insensitive)
  SELECT array_agg('drivers.assigned_vehicle_id=(' || id::text || ')' || assigned_vehicle_id) INTO bad_values
  FROM public.drivers
  WHERE assigned_vehicle_id IS NOT NULL AND btrim(assigned_vehicle_id) != ''
    AND btrim(assigned_vehicle_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in drivers.assigned_vehicle_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('enquiries.customer_id=(' || id::text || ')' || customer_id) INTO bad_values
  FROM public.enquiries
  WHERE customer_id IS NOT NULL AND btrim(customer_id) != ''
    AND btrim(customer_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in enquiries.customer_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('eway_bills.transporter_id=(' || id::text || ')' || transporter_id) INTO bad_values
  FROM public.eway_bills
  WHERE transporter_id IS NOT NULL AND btrim(transporter_id) != ''
    AND btrim(transporter_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in eway_bills.transporter_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('eway_bills.trip_id=(' || id::text || ')' || trip_id) INTO bad_values
  FROM public.eway_bills
  WHERE trip_id IS NOT NULL AND btrim(trip_id) != ''
    AND btrim(trip_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in eway_bills.trip_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('expenses.trip_id=(' || id::text || ')' || trip_id) INTO bad_values
  FROM public.expenses
  WHERE trip_id IS NOT NULL AND btrim(trip_id) != ''
    AND btrim(trip_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in expenses.trip_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('expenses.vehicle_id=(' || id::text || ')' || vehicle_id) INTO bad_values
  FROM public.expenses
  WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) != ''
    AND btrim(vehicle_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in expenses.vehicle_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('fuel_entries.driver_id=(' || id::text || ')' || driver_id) INTO bad_values
  FROM public.fuel_entries
  WHERE driver_id IS NOT NULL AND btrim(driver_id) != ''
    AND btrim(driver_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in fuel_entries.driver_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('fuel_entries.trip_id=(' || id::text || ')' || trip_id) INTO bad_values
  FROM public.fuel_entries
  WHERE trip_id IS NOT NULL AND btrim(trip_id) != ''
    AND btrim(trip_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in fuel_entries.trip_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('fuel_entries.vehicle_id=(' || id::text || ')' || vehicle_id) INTO bad_values
  FROM public.fuel_entries
  WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) != ''
    AND btrim(vehicle_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in fuel_entries.vehicle_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('invoices.customer_id=(' || id::text || ')' || customer_id) INTO bad_values
  FROM public.invoices
  WHERE customer_id IS NOT NULL AND btrim(customer_id) != ''
    AND btrim(customer_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in invoices.customer_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('maintenance_records.vehicle_id=(' || id::text || ')' || vehicle_id) INTO bad_values
  FROM public.maintenance_records
  WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) != ''
    AND btrim(vehicle_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in maintenance_records.vehicle_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('payments.customer_id=(' || id::text || ')' || customer_id) INTO bad_values
  FROM public.payments
  WHERE customer_id IS NOT NULL AND btrim(customer_id) != ''
    AND btrim(customer_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in payments.customer_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('payments.invoice_id=(' || id::text || ')' || invoice_id) INTO bad_values
  FROM public.payments
  WHERE invoice_id IS NOT NULL AND btrim(invoice_id) != ''
    AND btrim(invoice_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in payments.invoice_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('quotations.customer_id=(' || id::text || ')' || customer_id) INTO bad_values
  FROM public.quotations
  WHERE customer_id IS NOT NULL AND btrim(customer_id) != ''
    AND btrim(customer_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in quotations.customer_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('quotations.enquiry_id=(' || id::text || ')' || enquiry_id) INTO bad_values
  FROM public.quotations
  WHERE enquiry_id IS NOT NULL AND btrim(enquiry_id) != ''
    AND btrim(enquiry_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in quotations.enquiry_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('trips.customer_id=(' || id::text || ')' || customer_id) INTO bad_values
  FROM public.trips
  WHERE customer_id IS NOT NULL AND btrim(customer_id) != ''
    AND btrim(customer_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in trips.customer_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('trips.driver_id=(' || id::text || ')' || driver_id) INTO bad_values
  FROM public.trips
  WHERE driver_id IS NOT NULL AND btrim(driver_id) != ''
    AND btrim(driver_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in trips.driver_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('trips.enquiry_id=(' || id::text || ')' || enquiry_id) INTO bad_values
  FROM public.trips
  WHERE enquiry_id IS NOT NULL AND btrim(enquiry_id) != ''
    AND btrim(enquiry_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in trips.enquiry_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('trips.quotation_id=(' || id::text || ')' || quotation_id) INTO bad_values
  FROM public.trips
  WHERE quotation_id IS NOT NULL AND btrim(quotation_id) != ''
    AND btrim(quotation_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in trips.quotation_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('trips.vehicle_id=(' || id::text || ')' || vehicle_id) INTO bad_values
  FROM public.trips
  WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) != ''
    AND btrim(vehicle_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in trips.vehicle_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('tyres.vehicle_id=(' || id::text || ')' || vehicle_id) INTO bad_values
  FROM public.tyres
  WHERE vehicle_id IS NOT NULL AND btrim(vehicle_id) != ''
    AND btrim(vehicle_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in tyres.vehicle_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  SELECT array_agg('vehicles.driver_id=(' || id::text || ')' || driver_id) INTO bad_values
  FROM public.vehicles
  WHERE driver_id IS NOT NULL AND btrim(driver_id) != ''
    AND btrim(driver_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in vehicles.driver_id: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;

  -- Check 4: Zero NULL organization_id values
  SELECT array_agg(t || ': ' || cnt || ' NULLs') INTO issues
  FROM (
    SELECT 'activity_log' AS t, count(*) AS cnt FROM public.activity_log WHERE organization_id IS NULL
    UNION ALL
    SELECT 'branches' AS t, count(*) AS cnt FROM public.branches WHERE organization_id IS NULL
    UNION ALL
    SELECT 'customers' AS t, count(*) AS cnt FROM public.customers WHERE organization_id IS NULL
    UNION ALL
    SELECT 'drivers' AS t, count(*) AS cnt FROM public.drivers WHERE organization_id IS NULL
    UNION ALL
    SELECT 'enquiries' AS t, count(*) AS cnt FROM public.enquiries WHERE organization_id IS NULL
    UNION ALL
    SELECT 'eway_bills' AS t, count(*) AS cnt FROM public.eway_bills WHERE organization_id IS NULL
    UNION ALL
    SELECT 'expenses' AS t, count(*) AS cnt FROM public.expenses WHERE organization_id IS NULL
    UNION ALL
    SELECT 'fuel_entries' AS t, count(*) AS cnt FROM public.fuel_entries WHERE organization_id IS NULL
    UNION ALL
    SELECT 'invoices' AS t, count(*) AS cnt FROM public.invoices WHERE organization_id IS NULL
    UNION ALL
    SELECT 'maintenance_records' AS t, count(*) AS cnt FROM public.maintenance_records WHERE organization_id IS NULL
    UNION ALL
    SELECT 'notifications' AS t, count(*) AS cnt FROM public.notifications WHERE organization_id IS NULL
    UNION ALL
    SELECT 'payments' AS t, count(*) AS cnt FROM public.payments WHERE organization_id IS NULL
    UNION ALL
    SELECT 'quotations' AS t, count(*) AS cnt FROM public.quotations WHERE organization_id IS NULL
    UNION ALL
    SELECT 'trips' AS t, count(*) AS cnt FROM public.trips WHERE organization_id IS NULL
    UNION ALL
    SELECT 'tyres' AS t, count(*) AS cnt FROM public.tyres WHERE organization_id IS NULL
    UNION ALL
    SELECT 'vehicles' AS t, count(*) AS cnt FROM public.vehicles WHERE organization_id IS NULL
  ) sub WHERE cnt > 0;
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: NULL organization_id: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 5: Zero effective privileges for anon/authenticated (dormant state)
  -- Version-compatible: checks SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER
  -- MAINTAIN privilege checked separately via pg_class ACL for PG17+ compatibility
  SELECT array_agg(t || ':' || r || ':' || p) INTO issues
  FROM (
    SELECT t.t, r.r, p.p
    FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
    CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)
    WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)
  ) violations;
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: effective privileges found (dormant state violated): %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 5b: MAINTAIN privilege (PG17+, graceful degradation)
  IF current_setting('server_version_num')::int >= 170000 THEN
    SELECT array_agg(t || ':' || r || ':MAINTAIN') INTO issues
    FROM (
      SELECT t.t, r.r
      FROM (VALUES ('activity_log'),('approvals'),('attendance'),('bank_entries'),('branches'),('cash_entries'),('challans'),('claims'),('contracts'),('customers'),('drivers'),('enquiries'),('eway_bills'),('expenses'),('fuel_entries'),('geofences'),('gps_devices'),('indents'),('inventory'),('invoices'),('leave_requests'),('ledger_accounts'),('maintenance_records'),('market_hires'),('notifications'),('payments'),('purchases'),('quotations'),('routes'),('sales'),('transfers'),('trips'),('tyres'),('vehicles'),('vendors'),('work_orders')) AS t(t)
      CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)
      WHERE has_table_privilege(r.r, 'public.' || t.t, 'MAINTAIN')
    ) violations;
    IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
      RAISE EXCEPTION 'PREFLIGHT FAIL [5b]: MAINTAIN privileges found: %', array_to_string(issues, ', ');
    END IF;
    issues := NULL;
  END IF;

  -- Check 5c: PUBLIC role grants via pg_class ACL
  SELECT array_agg(c.relname || ':PUBLIC:' || acl.privilege_type) INTO issues
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
  WHERE c.relkind = 'r' AND acl.grantee = 0
    AND c.relname IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5c]: PUBLIC grants found: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 6: organization_id exists as UUID type on all 16 tables
  SELECT array_agg(t) INTO issues
  FROM unnest(ARRAY['activity_log','branches','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','invoices','maintenance_records','notifications','payments','quotations','trips','tyres','vehicles']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t
      AND column_name = 'organization_id' AND udt_name = 'uuid'
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: organization_id not UUID: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 7: No conflicting partial state (columns already UUID = prior partial run)
  SELECT array_agg(t || '.' || c) INTO issues
  FROM (VALUES
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
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = expected.t
      AND column_name = expected.c AND udt_name = 'uuid'
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: columns already UUID (partial prior execution?): %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 8: No unexpected column types on converted columns (must be text pre-migration)
  SELECT array_agg(t || '.' || c || '=' || actual_type) INTO issues
  FROM (
    SELECT expected.t, expected.c, cols.data_type AS actual_type
    FROM (VALUES
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
    LEFT JOIN information_schema.columns cols
      ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = expected.c
    WHERE cols.data_type IS NOT NULL AND cols.data_type NOT IN ('text', 'uuid')
  ) mistyped;
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: unexpected column types (expected text): %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 9: No unexpected FK/UNIQUE constraints involving converted fields
  SELECT array_agg(conname || ' on ' || conrelid::regclass::text || '(' || a.attname || ')') INTO issues
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
    );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [9]: FK/UNIQUE constraints on converted columns (remove first): %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 10: No leftover Migration 005 functions, triggers, or constraints
  -- Functions: enforce_* (composite FK enforcement functions)
  SELECT array_agg(proname) INTO issues
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname LIKE 'enforce_%_fk%';
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [10a]: leftover M005 functions: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Triggers: trg_enforce_* (composite FK triggers)
  SELECT array_agg(tgname || ' on ' || tgrelid::regclass::text) INTO issues
  FROM pg_trigger
  WHERE tgname LIKE 'trg_enforce_%'
    AND tgrelid::regclass::text IN ('activity_log','approvals','attendance','bank_entries','branches','cash_entries','challans','claims','contracts','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','geofences','gps_devices','indents','inventory','invoices','leave_requests','ledger_accounts','maintenance_records','market_hires','notifications','payments','purchases','quotations','routes','sales','transfers','trips','tyres','vehicles','vendors','work_orders');
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [10b]: leftover M005 triggers: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Constraints: composite FK constraints from M005
  SELECT array_agg(conname || ' on ' || conrelid::regclass::text) INTO issues
  FROM pg_constraint
  WHERE connamespace = 'public'::regnamespace
    AND conname LIKE '%_org_fk%';
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [10c]: leftover M005 constraints: %', array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  -- Check 11: Partially applied organization_id NOT NULL (some converted, some not)
  -- All 16 tables must be nullable (pre-migration) or all NOT NULL (post-migration)
  -- A mix indicates partial prior execution
  SELECT array_agg(table_name || '=' || is_nullable) INTO issues
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'organization_id'
    AND table_name IN ('activity_log','branches','customers','drivers','enquiries','eway_bills','expenses','fuel_entries','invoices','maintenance_records','notifications','payments','quotations','trips','tyres','vehicles')
    AND is_nullable = 'NO';
  -- If some but not all 16 are NOT NULL, it's partial
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 AND array_length(issues, 1) < 16 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [11]: partially applied NOT NULL (% of 16): %', array_length(issues, 1), array_to_string(issues, ', ');
  END IF;
  issues := NULL;

  RAISE NOTICE 'PREFLIGHT PASS: all 11 checks passed. Safe to execute Block B.';
END $preflight$;

SELECT 'PREFLIGHT PASS: all 11 checks passed. 22 columns ready for TEXT->UUID, 16 tables ready for NOT NULL.' AS result;
