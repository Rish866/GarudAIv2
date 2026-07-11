# Garud AI ERP — Production Migration Runbook

## Status: REQUIRES STAGING FIRST

**Do NOT run these migrations directly on production.**
A staging environment is required to validate the migration chain
against a copy of production data before applying to the live database.

---

## Pre-Requisites

### Staging Environment (REQUIRED)

Before touching production, you must:

1. **Create a Supabase staging project** (free tier is sufficient)
2. **Export production schema + data** to staging:
   ```
   Supabase Dashboard → Settings → Database → Backup → Download
   ```
   Or use `pg_dump` if you have direct PostgreSQL access.
3. **Restore to staging project**
4. **Run all migrations (000–007) on staging**
5. **Run post_migration_validation.sql on staging**
6. **Verify application connects to staging correctly**
7. **Only then proceed to production**

If you do NOT have a staging project:
**STOP HERE. Create one at https://supabase.com/dashboard/new before continuing.**

---

## Migration Safety Findings

### Finding 1: Migration 005 is NOT idempotent (CRITICAL)

```sql
ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_org_id_unique UNIQUE (organization_id, id);
```

PostgreSQL does not support `ADD CONSTRAINT IF NOT EXISTS`. If migration 005
fails mid-way and you re-run it, the already-created constraints will cause:

```
ERROR: constraint "vehicles_org_id_unique" already exists
```

**Mitigation:** Before re-running 005, drop existing constraints:
```sql
ALTER TABLE public.vehicles DROP CONSTRAINT IF EXISTS vehicles_org_id_unique;
ALTER TABLE public.drivers DROP CONSTRAINT IF EXISTS drivers_org_id_unique;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_org_id_unique;
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_org_id_unique;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_org_id_unique;
ALTER TABLE public.branches DROP CONSTRAINT IF EXISTS branches_org_id_unique;
```

### Finding 2: RLS lockout window during Migration 003

Migration 003 performs:
1. DROP ALL existing policies on 36 tables
2. Recreate all policies with correct role-based rules

If the migration FAILS between step 1 and step 2:
- Tables have RLS enabled but NO policies
- All access is denied (PostgreSQL default: deny when no policy matches)
- The application will show empty data for ALL users

**Mitigation:** If 003 fails mid-way, re-run it from the beginning.
The first `DO $$` block drops policies idempotently.

### Finding 3: Migration 007 modifies existing data

Migration 007 runs `UPDATE ... SET organization_id = $1 WHERE organization_id IS NULL`
on all tables. This modifies the 14 existing vehicle rows (and any other data).

- **No data is deleted**
- **No columns are dropped**
- All 14 vehicles will be assigned to a default organization
- A NOT NULL constraint is added after mapping

This is safe but irreversible without a backup.

### Finding 4: SECURITY DEFINER functions

Four functions use `SECURITY DEFINER`:
- `is_organization_member()` — reads organization_members
- `current_user_organization_ids()` — reads organization_members
- `has_organization_role()` — reads organization_members
- `is_platform_admin()` — reads platform_admins
- `create_organization_for_user()` — inserts into organizations/members/settings
- `validate_same_organization()` — reads vehicles/drivers/customers
- `log_privileged_action()` — inserts into activity_log

All have `SET search_path = public` which prevents search-path attacks.
All are called via RLS policy evaluation (not directly by users).
Risk: LOW. These are standard patterns for RLS helper functions.

### Finding 5: No anonymous access policies

All policies use `TO authenticated` — anonymous (`anon`) role gets nothing.
After migration 003, unauthenticated requests will receive 0 rows.
This is the desired behavior.

### Finding 6: CHECK constraint conflicts on existing tables

Migration 000 defines CHECK constraints (e.g., `ownership_type IN ('owned', 'attached', 'market')`).
If the production `vehicles` table already has different CHECK constraints,
`CREATE TABLE IF NOT EXISTS` will skip the CREATE (table exists) — no conflict.
Existing data with values outside the CHECK ranges will NOT be affected.

### Finding 7: organization_id added as NULLABLE first

Migration 001 adds `organization_id UUID REFERENCES organizations(id)` — nullable.
Migration 007 maps existing rows then adds NOT NULL.
This two-step approach is safe for existing data.

---

## Exact Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| 005 fails on re-run | Medium | Low (run once) | Drop constraints before re-run |
| 003 fails mid-way (lockout) | High | Low | Re-run 003 from beginning |
| 007 maps data to wrong org | Low | Low | Only 1 org will exist at this point |
| Vehicle CHECK conflicts | None | None | IF NOT EXISTS skips |
| Data loss | None | None | Only UPDATEs nulls, no DELETEs |
| Anonymous access window | None | None | 001 enables RLS immediately |

---

## Production Runbook

### Phase 1: Backup (MANDATORY)

```
1. Go to Supabase Dashboard → Settings → Database
2. Create a Point-in-Time Recovery checkpoint (Pro plan)
   OR download a manual backup:
   - Project Settings → Database → "Download backup"
3. Note the backup timestamp: ________________
4. Verify backup file size is > 0 bytes
5. Store backup in a SEPARATE location from the database
```

### Phase 2: Backup Verification

```sql
-- Run on a LOCAL copy of the backup to verify it's restorable
-- (Do NOT run on production)
-- If using pg_dump: pg_restore --list backup.dump
-- If using Supabase: restore to staging project and verify data
```

### Phase 3: Pre-Migration Diagnostic

Run `supabase/scripts/pre_migration_diagnostic.sql` in the SQL Editor.

Record the output. Expected findings for your database:
- `vehicles` table EXISTS with 14 rows
- `organization_id` column likely MISSING
- `organizations` table likely MISSING
- RLS likely DISABLED

### Phase 4: Execute Migrations (IN ORDER)

⚠️ **Run each migration separately. Verify success before proceeding.**

```
STEP 1: 000_prerequisite_base_tables.sql
  Expected: "CREATE TABLE" × 0 (tables already exist) or creates missing ones
  Verify: SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
  
STEP 2: 001_multi_tenant_foundation.sql
  Expected: Creates organizations, organization_members, adds organization_id columns
  Verify: SELECT count(*) FROM public.organizations; -- should be 0
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'vehicles' AND column_name = 'organization_id';
  
STEP 3: 002_complete_tenant_tables.sql
  Expected: Creates 20 additional tables (vendors, contracts, etc.)
  Verify: SELECT count(*) FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
          -- Should be ~42 tables
  
STEP 4: 003_correct_rls_policies.sql
  ⚠️ CRITICAL: Run this completely. Do not stop mid-way.
  Expected: Drops old policies, creates role-based policies on all tables
  Verify: SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
          -- Should be > 100 policies
          
  IMMEDIATE TEST after 003:
  -- Open a new incognito browser tab
  -- Try: curl your-supabase-url/rest/v1/vehicles -H "apikey: your-anon-key"
  -- Should return [] (empty array) — NOT the 14 rows
  
STEP 5: 004_storage_policies.sql
  Expected: Creates erp-documents bucket
  Verify: SELECT * FROM storage.buckets WHERE id = 'erp-documents';
  
STEP 6: 005_api_security_and_relational_integrity.sql
  Expected: Adds constraints and triggers
  Verify: SELECT constraint_name FROM information_schema.table_constraints
          WHERE constraint_name LIKE '%_org_id_unique';
          -- Should show 6 constraints
  
STEP 7: 006-audit-log-and-constraints.sql
  Expected: Enhances activity_log, adds single-membership constraint
  Verify: SELECT indexname FROM pg_indexes 
          WHERE indexname = 'idx_single_active_membership';
  
STEP 8: 007_map_existing_data_to_organizations.sql
  Expected: Creates default org, maps 14 vehicle rows + any other data
  Verify: SELECT count(*) FROM public.organizations; -- should be 1
          SELECT count(*) FROM public.vehicles WHERE organization_id IS NULL;
          -- Should be 0
```

### Phase 5: Post-Migration Validation

Run `supabase/scripts/post_migration_validation.sql` in the SQL Editor.

ALL checks must show ✅ PASS. If any show ❌ FAIL, STOP and investigate.

### Phase 6: Platform Admin Setup

```sql
INSERT INTO public.platform_admins (user_id, level)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'rishkatiyar1@gmail.com'),
  'super_admin'
)
ON CONFLICT (user_id) DO NOTHING;
```

### Phase 7: RLS Verification (Unauthenticated)

From a terminal or API client (NOT the Supabase Dashboard SQL Editor):

```bash
# Replace with your actual URL and anon key
curl -s "https://YOUR-PROJECT.supabase.co/rest/v1/vehicles?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

Expected: `[]` (empty array) — RLS blocks unauthenticated access.

If you see 14 vehicle rows: **MIGRATION 003 DID NOT APPLY CORRECTLY.**

### Phase 8: Authenticated Isolation Test

1. Log in as User A (the admin who owns the default org)
2. Verify they can see the 14 vehicles
3. Create a second user (User B) and a second organization
4. Log in as User B
5. Verify User B sees 0 vehicles, 0 trips, 0 everything
6. Create a vehicle as User B
7. Verify User A cannot see User B's vehicle

---

## Rollback Procedure

### Trigger Conditions
- Post-migration validation shows ❌ FAIL on critical checks
- Application is completely inaccessible after migration
- Data corruption detected

### Procedure

**Option A: Point-in-Time Recovery (Pro plan)**
```
Supabase Dashboard → Settings → Database → Point in Time Recovery
Select timestamp BEFORE migration start
```

**Option B: Manual Rollback (if no PITR)**

```sql
-- 1. Disable RLS (restore access while investigating)
-- ⚠️ This makes ALL data publicly accessible — do this only if app is broken
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- 2. Drop the organization_id NOT NULL constraints
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'vehicles','drivers','customers','trips','enquiries','quotations',
    'invoices','payments','expenses','fuel_entries','maintenance_records',
    'tyres','notifications','eway_bills','branches'
  ])
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id DROP NOT NULL', tbl);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- 3. Application should now function (without multi-tenant isolation)
-- 4. Investigate the failure and re-apply migrations after fixing
```

**Option C: Full schema restore from backup**
```
1. Drop all tables (DESTRUCTIVE — only if backup verified)
2. Restore from backup file
3. Verify data integrity
```

---

## Staging Requirements

You MUST have a staging Supabase project with:
- [ ] A copy of production data (14 vehicles + any other rows)
- [ ] Same auth configuration
- [ ] At least one user in auth.users

If you do not have staging, create one:
1. Go to https://supabase.com/dashboard/new
2. Name it "garudai-staging"
3. Export production data and import to staging
4. Run migrations 000–007 on staging FIRST
5. Run post_migration_validation.sql on staging
6. Test the application against staging
7. Only then proceed to production

**I cannot create a staging project for you. This requires your Supabase account access.**

---

## SQL Corrections Required

### Migration 005: Make ADD CONSTRAINT idempotent

Replace the raw `ADD CONSTRAINT` statements with guarded versions:

```sql
-- Safe version (won't fail on re-run)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicles_org_id_unique') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_org_id_unique UNIQUE (organization_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'drivers_org_id_unique') THEN
    ALTER TABLE public.drivers ADD CONSTRAINT drivers_org_id_unique UNIQUE (organization_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'customers_org_id_unique') THEN
    ALTER TABLE public.customers ADD CONSTRAINT customers_org_id_unique UNIQUE (organization_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_org_id_unique') THEN
    ALTER TABLE public.trips ADD CONSTRAINT trips_org_id_unique UNIQUE (organization_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'invoices_org_id_unique') THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_org_id_unique UNIQUE (organization_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'branches_org_id_unique') THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_org_id_unique UNIQUE (organization_id, id);
  END IF;
END $$;
```

This correction should be applied to migration 005 before running on any environment.
