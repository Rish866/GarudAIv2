#!/usr/bin/env node
/**
 * Deterministic Migration 004 Generator (v3)
 * Schema Normalization: TEXT entity references → nullable UUID + organization_id NOT NULL
 *
 * Generates three canonical SQL files:
 *   supabase/staging/migration-004-A-preflight.sql
 *   supabase/staging/migration-004-B-migration.sql
 *   supabase/staging/migration-004-C-validation.sql
 *
 * Requirements:
 *   - Block A: comprehensive catalog checks (types, partial state, FK/UNIQUE, M005 leftovers, org_id)
 *   - Block B: USING NULLIF(btrim(column), '')::uuid for all conversions
 *   - Block C: catalog-derived validations with distinct C04 (FK/UNIQUE constraint check)
 *   - MAINTAIN privilege checking (version-compatible)
 *   - Machine-readable inventory and write-path matrix remain generator-owned
 *
 * Usage: node scripts/generate-migration-004.mjs [--check]
 *   --check: regenerate to temp files and compare SHA-256 (exit 1 on mismatch)
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { join } from 'path';

const inventory = JSON.parse(readFileSync('docs/migration-004-inventory.json', 'utf8'));
const conversions = inventory.conversions;
const notNullTables = inventory.organization_id_not_null.tables_needing_not_null;
const alreadyNotNull = inventory.organization_id_not_null.tables_already_not_null;
const allTables = [...notNullTables, ...alreadyNotNull].sort();


// Unique sorted table list from conversions
const affectedTables = [...new Set(conversions.map(c => c.table))].sort();

// All 36 business tables (sorted)
const ALL_36 = allTables;

// ============================================================
// BLOCK A: Preflight (strengthened)
// ============================================================
function generateBlockA() {
  const lines = [];
  lines.push('-- migration-004-A-preflight.sql');
  lines.push('-- Migration 004 Preflight: Schema normalization prerequisites');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- Read-only: raises exception on failure, emits PASS on success');
  lines.push('-- Checks (11 total):');
  lines.push('--   1. All 12 affected tables exist');
  lines.push('--   2. Target columns are currently TEXT type (not already converted)');
  lines.push('--   3. Zero non-NULL, non-empty, invalid UUID values in 22 columns');
  lines.push('--   4. Zero NULL organization_id values in 16 tables needing NOT NULL');
  lines.push('--   5. Zero effective privileges for anon/authenticated (dormant state)');
  lines.push('--   6. organization_id exists as UUID on all 16 tables');
  lines.push('--   7. No conflicting partially-applied state (column already UUID = prior run)');
  lines.push('--   8. No unexpected column types on converted columns');
  lines.push('--   9. No unexpected FK/UNIQUE constraints involving converted fields');
  lines.push('--  10. No leftover Migration 005 functions, triggers, or constraints');
  lines.push('--  11. No partially applied organization_id NOT NULL changes');
  lines.push('');
  lines.push('DO $preflight$');
  lines.push('DECLARE');
  lines.push('  issues TEXT[];');
  lines.push('  bad_values TEXT[];');
  lines.push('BEGIN');
  lines.push('');

  // Check 1: All affected tables exist
  lines.push(`  -- Check 1: All affected tables exist`);
  lines.push(`  SELECT array_agg(t) INTO issues`);
  lines.push(`  FROM unnest(ARRAY[${affectedTables.map(t => `'${t}'`).join(',')}]) AS t`);
  lines.push(`  WHERE NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t);`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: missing tables: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 2: Target columns are currently TEXT
  lines.push(`  -- Check 2: Target columns are currently TEXT (not already UUID)`);
  lines.push(`  SELECT array_agg(t || '.' || c) INTO issues`);
  lines.push(`  FROM (VALUES`);
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`  ) AS expected(t, c)`);
  lines.push(`  WHERE NOT EXISTS (`);
  lines.push(`    SELECT 1 FROM information_schema.columns`);
  lines.push(`    WHERE table_schema = 'public' AND table_name = expected.t`);
  lines.push(`      AND column_name = expected.c AND data_type = 'text'`);
  lines.push(`  );`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: columns not TEXT (already converted or missing): %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 3: Zero invalid UUID values (case-insensitive)
  lines.push(`  -- Check 3: Zero invalid UUID values (case-insensitive)`);
  for (const c of conversions) {
    lines.push(`  SELECT array_agg('${c.table}.${c.column}=(' || id::text || ')' || ${c.column}) INTO bad_values`);
    lines.push(`  FROM public.${c.table}`);
    lines.push(`  WHERE ${c.column} IS NOT NULL AND btrim(${c.column}) != ''`);
    lines.push(`    AND btrim(${c.column}) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';`);
    lines.push(`  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN`);
    lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID in ${c.table}.${c.column}: %', array_to_string(bad_values, ', ');`);
    lines.push(`  END IF;`);
    lines.push(`  bad_values := NULL;`);
    lines.push('');
  }

  // Check 4: Zero NULL organization_id values
  lines.push(`  -- Check 4: Zero NULL organization_id values`);
  lines.push(`  SELECT array_agg(t || ': ' || cnt || ' NULLs') INTO issues`);
  lines.push(`  FROM (`);
  lines.push(notNullTables.map(t => `    SELECT '${t}' AS t, count(*) AS cnt FROM public.${t} WHERE organization_id IS NULL`).join('\n    UNION ALL\n'));
  lines.push(`  ) sub WHERE cnt > 0;`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: NULL organization_id: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 5: Zero effective privileges for anon/authenticated/PUBLIC (version-compatible MAINTAIN)
  lines.push(`  -- Check 5: Zero effective privileges for anon/authenticated (dormant state)`);
  lines.push(`  -- Version-compatible: checks SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER`);
  lines.push(`  -- MAINTAIN privilege checked separately via pg_class ACL for PG17+ compatibility`);
  lines.push(`  SELECT array_agg(t || ':' || r || ':' || p) INTO issues`);
  lines.push(`  FROM (`);
  lines.push(`    SELECT t.t, r.r, p.p`);
  lines.push(`    FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push(`    CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)`);
  lines.push(`    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)`);
  lines.push(`    WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)`);
  lines.push(`  ) violations;`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: effective privileges found (dormant state violated): %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 5b: MAINTAIN privilege (PG17+ only, graceful skip on older)
  lines.push(`  -- Check 5b: MAINTAIN privilege (PG17+, graceful degradation)`);
  lines.push(`  IF current_setting('server_version_num')::int >= 170000 THEN`);
  lines.push(`    SELECT array_agg(t || ':' || r || ':MAINTAIN') INTO issues`);
  lines.push(`    FROM (`);
  lines.push(`      SELECT t.t, r.r`);
  lines.push(`      FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push(`      CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)`);
  lines.push(`      WHERE has_table_privilege(r.r, 'public.' || t.t, 'MAINTAIN')`);
  lines.push(`    ) violations;`);
  lines.push(`    IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`      RAISE EXCEPTION 'PREFLIGHT FAIL [5b]: MAINTAIN privileges found: %', array_to_string(issues, ', ');`);
  lines.push(`    END IF;`);
  lines.push(`    issues := NULL;`);
  lines.push(`  END IF;`);
  lines.push('');

  // Check 5c: PUBLIC role ACL check via pg_class
  lines.push(`  -- Check 5c: PUBLIC role grants via pg_class ACL`);
  lines.push(`  SELECT array_agg(c.relname || ':PUBLIC:' || acl.privilege_type) INTO issues`);
  lines.push(`  FROM pg_class c`);
  lines.push(`  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'`);
  lines.push(`  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl`);
  lines.push(`  WHERE c.relkind = 'r' AND acl.grantee = 0`);
  lines.push(`    AND c.relname IN (${ALL_36.map(t => `'${t}'`).join(',')});`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [5c]: PUBLIC grants found: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 6: organization_id exists as UUID type on all 16 tables
  lines.push(`  -- Check 6: organization_id exists as UUID type on all 16 tables`);
  lines.push(`  SELECT array_agg(t) INTO issues`);
  lines.push(`  FROM unnest(ARRAY[${notNullTables.map(t => `'${t}'`).join(',')}]) AS t`);
  lines.push(`  WHERE NOT EXISTS (`);
  lines.push(`    SELECT 1 FROM information_schema.columns`);
  lines.push(`    WHERE table_schema = 'public' AND table_name = t`);
  lines.push(`      AND column_name = 'organization_id' AND udt_name = 'uuid'`);
  lines.push(`  );`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: organization_id not UUID: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 7: No conflicting partial state (columns already UUID)
  lines.push(`  -- Check 7: No conflicting partial state (columns already UUID = prior partial run)`);
  lines.push(`  SELECT array_agg(t || '.' || c) INTO issues`);
  lines.push(`  FROM (VALUES`);
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`  ) AS expected(t, c)`);
  lines.push(`  WHERE EXISTS (`);
  lines.push(`    SELECT 1 FROM information_schema.columns`);
  lines.push(`    WHERE table_schema = 'public' AND table_name = expected.t`);
  lines.push(`      AND column_name = expected.c AND udt_name = 'uuid'`);
  lines.push(`  );`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: columns already UUID (partial prior execution?): %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 8: No unexpected column types (should only be text or uuid, not varchar/char/etc)
  lines.push(`  -- Check 8: No unexpected column types on converted columns (must be text pre-migration)`);
  lines.push(`  SELECT array_agg(t || '.' || c || '=' || actual_type) INTO issues`);
  lines.push(`  FROM (`);
  lines.push(`    SELECT expected.t, expected.c, cols.data_type AS actual_type`);
  lines.push(`    FROM (VALUES`);
  lines.push(conversions.map(c => `      ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`    ) AS expected(t, c)`);
  lines.push(`    LEFT JOIN information_schema.columns cols`);
  lines.push(`      ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = expected.c`);
  lines.push(`    WHERE cols.data_type IS NOT NULL AND cols.data_type NOT IN ('text', 'uuid')`);
  lines.push(`  ) mistyped;`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: unexpected column types (expected text): %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 9: No unexpected FK or UNIQUE constraints involving converted fields
  lines.push(`  -- Check 9: No unexpected FK/UNIQUE constraints involving converted fields`);
  lines.push(`  SELECT array_agg(conname || ' on ' || conrelid::regclass::text || '(' || a.attname || ')') INTO issues`);
  lines.push(`  FROM pg_constraint con`);
  lines.push(`  JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)`);
  lines.push(`  WHERE con.connamespace = 'public'::regnamespace`);
  lines.push(`    AND con.contype IN ('f', 'u')`);
  lines.push(`    AND (con.conrelid::regclass::text, a.attname) IN (`);
  lines.push(conversions.map(c => `      ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`    );`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [9]: FK/UNIQUE constraints on converted columns (remove first): %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 10: No leftover Migration 005 functions, triggers, or constraints
  // Uses exact-name inventory from the known rejected Migration 005 package
  lines.push(`  -- Check 10: No leftover Migration 005 artifacts (exact-name inventory)`);
  lines.push(`  -- Functions: enforce_same_org_* (12 per-table validation functions)`);
  const m005Functions = [
    'enforce_same_org_drivers', 'enforce_same_org_enquiries',
    'enforce_same_org_eway_bills', 'enforce_same_org_expenses',
    'enforce_same_org_fuel_entries', 'enforce_same_org_invoices',
    'enforce_same_org_maintenance_records', 'enforce_same_org_payments',
    'enforce_same_org_quotations', 'enforce_same_org_trips',
    'enforce_same_org_tyres', 'enforce_same_org_vehicles',
  ];
  lines.push(`  SELECT array_agg(proname || '(' || pg_get_function_identity_arguments(oid) || ')') INTO issues`);
  lines.push(`  FROM pg_proc`);
  lines.push(`  WHERE pronamespace = 'public'::regnamespace`);
  lines.push(`    AND proname IN (${m005Functions.map(f => `'${f}'`).join(',')});`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [10a]: leftover M005 functions: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Triggers: enforce_same_org_refs_* (12 BEFORE INSERT OR UPDATE triggers)
  const m005Triggers = [
    'enforce_same_org_refs_drivers', 'enforce_same_org_refs_enquiries',
    'enforce_same_org_refs_eway_bills', 'enforce_same_org_refs_expenses',
    'enforce_same_org_refs_fuel_entries', 'enforce_same_org_refs_invoices',
    'enforce_same_org_refs_maintenance_records', 'enforce_same_org_refs_payments',
    'enforce_same_org_refs_quotations', 'enforce_same_org_refs_trips',
    'enforce_same_org_refs_tyres', 'enforce_same_org_refs_vehicles',
  ];
  lines.push(`  -- Triggers: enforce_same_org_refs_* (12 per-table triggers)`);
  lines.push(`  SELECT array_agg(tgname || ' on ' || tgrelid::regclass::text) INTO issues`);
  lines.push(`  FROM pg_trigger`);
  lines.push(`  WHERE tgname IN (${m005Triggers.map(t => `'${t}'`).join(',')});`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [10b]: leftover M005 triggers: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // FK constraints: fk_*_org (11 composite FK constraints)
  const m005FKs = [
    'fk_contracts_customer_id_org', 'fk_indents_customer_id_org',
    'fk_indents_trip_id_org', 'fk_work_orders_vehicle_id_org',
    'fk_challans_vehicle_id_org', 'fk_challans_driver_id_org',
    'fk_claims_trip_id_org', 'fk_transfers_from_branch_org',
    'fk_transfers_to_branch_org', 'fk_attendance_employee_id_org',
    'fk_leave_requests_employee_id_org', 'fk_gps_devices_vehicle_id_org',
  ];
  lines.push(`  -- FK constraints: fk_*_org (12 composite FK constraints)`);
  lines.push(`  SELECT array_agg(conname || ' on ' || conrelid::regclass::text) INTO issues`);
  lines.push(`  FROM pg_constraint`);
  lines.push(`  WHERE connamespace = 'public'::regnamespace`);
  lines.push(`    AND conname IN (${m005FKs.map(c => `'${c}'`).join(',')});`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [10c]: leftover M005 FK constraints: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Unique constraints: uq_*_org_id (9 composite UNIQUE constraints)
  const m005Uniques = [
    'uq_customers_org_id', 'uq_trips_org_id', 'uq_vehicles_org_id',
    'uq_drivers_org_id', 'uq_branches_org_id', 'uq_enquiries_org_id',
    'uq_quotations_org_id', 'uq_invoices_org_id', 'uq_vendors_org_id',
  ];
  lines.push(`  -- Unique constraints: uq_*_org_id (9 composite UNIQUE constraints)`);
  lines.push(`  SELECT array_agg(conname || ' on ' || conrelid::regclass::text) INTO issues`);
  lines.push(`  FROM pg_constraint`);
  lines.push(`  WHERE connamespace = 'public'::regnamespace`);
  lines.push(`    AND conname IN (${m005Uniques.map(c => `'${c}'`).join(',')});`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [10d]: leftover M005 UNIQUE constraints: %', array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Check 11: No partially applied organization_id NOT NULL changes
  lines.push(`  -- Check 11: Partially applied organization_id NOT NULL (some converted, some not)`);
  lines.push(`  -- All 16 tables must be nullable (pre-migration) or all NOT NULL (post-migration)`);
  lines.push(`  -- A mix indicates partial prior execution`);
  lines.push(`  SELECT array_agg(table_name || '=' || is_nullable) INTO issues`);
  lines.push(`  FROM information_schema.columns`);
  lines.push(`  WHERE table_schema = 'public'`);
  lines.push(`    AND column_name = 'organization_id'`);
  lines.push(`    AND table_name IN (${notNullTables.map(t => `'${t}'`).join(',')})`);
  lines.push(`    AND is_nullable = 'NO';`);
  lines.push(`  -- If some but not all 16 are NOT NULL, it's partial`);
  lines.push(`  IF issues IS NOT NULL AND array_length(issues, 1) > 0 AND array_length(issues, 1) < ${notNullTables.length} THEN`);
  lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [11]: partially applied NOT NULL (% of ${notNullTables.length}): %', array_length(issues, 1), array_to_string(issues, ', ');`);
  lines.push(`  END IF;`);
  lines.push(`  issues := NULL;`);
  lines.push('');

  // Final pass message
  lines.push(`  RAISE NOTICE 'PREFLIGHT PASS: all 11 checks passed. Safe to execute Block B.';`);
  lines.push(`END $preflight$;`);
  lines.push('');
  lines.push(`SELECT 'PREFLIGHT PASS: all 11 checks passed. ${conversions.length} columns ready for TEXT->UUID, ${notNullTables.length} tables ready for NOT NULL.' AS result;`);
  lines.push('');

  return lines.join('\n');
}


// ============================================================
// BLOCK B: Migration (USING NULLIF(btrim(col),'')::uuid)
// ============================================================
function generateBlockB() {
  const lines = [];
  lines.push('-- migration-004-B-migration.sql');
  lines.push('-- Migration 004: Schema Normalization (TEXT->UUID + org_id NOT NULL)');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- ATOMIC: BEGIN/COMMIT');
  lines.push(`-- Phase 1: Convert ${conversions.length} TEXT entity-reference columns to nullable UUID`);
  lines.push(`-- Phase 2: Enforce organization_id NOT NULL on ${notNullTables.length} business tables`);
  lines.push('-- Conversion uses NULLIF(btrim(col),\'\')::uuid so preflight and migration');
  lines.push('-- accept identical inputs (empty/whitespace -> NULL, valid UUID -> cast).');
  lines.push('-- No FK constraints (Migration 005). No grants. Dormant state preserved.');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');
  lines.push('-- ============================================================');
  lines.push(`-- PHASE 1: Convert ${conversions.length} TEXT entity-reference columns to nullable UUID`);
  lines.push('-- Each column: ALTER TYPE UUID USING NULLIF(btrim(col),\'\')::uuid');
  lines.push('-- This atomically handles empty strings without a separate UPDATE pass.');
  lines.push('-- ============================================================');
  lines.push('');

  for (const c of conversions) {
    lines.push(`-- ${c.table}.${c.column} -> ${c.target_table}.id`);
    lines.push(`ALTER TABLE public.${c.table} ALTER COLUMN ${c.column} TYPE UUID USING NULLIF(btrim(${c.column}), '')::uuid;`);
    lines.push('');
  }

  lines.push('-- ============================================================');
  lines.push(`-- PHASE 2: Enforce organization_id NOT NULL on ${notNullTables.length} tables`);
  lines.push('-- These were added as nullable in Migration 001. Staging is empty so safe.');
  lines.push('-- ============================================================');
  lines.push('');

  for (const t of notNullTables) {
    lines.push(`ALTER TABLE public.${t} ALTER COLUMN organization_id SET NOT NULL;`);
  }

  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}


// ============================================================
// BLOCK C: Validation (fixed C04)
// ============================================================
function generateBlockC() {
  const lines = [];
  lines.push('-- migration-004-C-validation.sql');
  lines.push('-- Migration 004 Validation: Schema normalization verification');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- Read-only. All results derived from catalog state.');
  lines.push('-- Expected: ALL 8 CHECKS PASS');
  lines.push('');

  // C01: All 22 converted columns are UUID type
  lines.push('-- C01: All 22 converted columns are UUID type');
  lines.push("SELECT 'C01' AS check_id, 'columns_are_uuid' AS check_name,");
  lines.push(`  CASE WHEN count(*) = ${conversions.length} THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: expected ${conversions.length} UUID columns, got ' || count(*) || '. Non-UUID: ' ||`);
  lines.push(`      (SELECT string_agg(t || '.' || c, ', ') FROM (VALUES`);
  lines.push(conversions.map(c => `        ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`      ) AS expected(t, c)`);
  lines.push(`      WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns`);
  lines.push(`        WHERE table_schema = 'public' AND table_name = expected.t AND column_name = expected.c AND udt_name = 'uuid'))`);
  lines.push(`  END AS result`);
  lines.push(`FROM information_schema.columns`);
  lines.push(`WHERE table_schema = 'public'`);
  lines.push(`  AND (table_name, column_name) IN (`);
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`  ) AND udt_name = 'uuid'`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C02: All 22 converted columns are nullable
  lines.push('-- C02: All 22 converted columns are nullable');
  lines.push("SELECT 'C02', 'columns_nullable',");
  lines.push(`  CASE WHEN count(*) = 0 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: ' || count(*) || ' unexpectedly NOT NULL: ' || string_agg(table_name || '.' || column_name, ', ')`);
  lines.push(`  END`);
  lines.push(`FROM information_schema.columns`);
  lines.push(`WHERE table_schema = 'public'`);
  lines.push(`  AND (table_name, column_name) IN (`);
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`  ) AND is_nullable = 'NO'`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C03: organization_id NOT NULL on ALL 36 business tables
  lines.push('-- C03: organization_id NOT NULL on ALL 36 business tables');
  lines.push("SELECT 'C03', 'org_id_not_null_all_36',");
  lines.push(`  CASE WHEN count(*) = 36 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: expected 36, got ' || count(*) || '. Nullable: ' ||`);
  lines.push(`      (SELECT string_agg(table_name, ', ') FROM information_schema.columns`);
  lines.push(`       WHERE table_schema = 'public' AND column_name = 'organization_id' AND is_nullable = 'YES'`);
  lines.push(`       AND table_name IN (${ALL_36.map(t => `'${t}'`).join(',')}))`);
  lines.push(`  END`);
  lines.push(`FROM information_schema.columns`);
  lines.push(`WHERE table_schema = 'public' AND column_name = 'organization_id' AND is_nullable = 'NO'`);
  lines.push(`  AND table_name IN (${ALL_36.map(t => `'${t}'`).join(',')})`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C04: No FK or UNIQUE constraints on converted columns (distinct catalog-derived check)
  // Fixed: name, query, and explanation all describe the same validation —
  // verifying that no FK/UNIQUE constraints exist on the freshly converted UUID columns
  // (Migration 005 adds these later; their presence here would be premature)
  lines.push('-- C04: No FK/UNIQUE constraints exist on converted UUID columns');
  lines.push('-- (Migration 005 adds composite FKs later; premature constraints = error)');
  lines.push("SELECT 'C04', 'no_premature_fk_unique',");
  lines.push(`  CASE WHEN count(*) = 0 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: ' || count(*) || ' unexpected FK/UNIQUE constraints: ' || string_agg(conname, ', ')`);
  lines.push(`  END`);
  lines.push(`FROM pg_constraint con`);
  lines.push(`JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)`);
  lines.push(`WHERE con.connamespace = 'public'::regnamespace`);
  lines.push(`  AND con.contype IN ('f', 'u')`);
  lines.push(`  AND (con.conrelid::regclass::text, a.attname) IN (`);
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`  )`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C05: Zero effective privileges for anon/authenticated across all 36 tables
  lines.push('-- C05: Zero effective privileges for anon/authenticated across all 36 tables');
  lines.push("SELECT 'C05', 'dormant_effective_privileges',");
  lines.push(`  CASE WHEN count(*) = 0 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: ' || count(*) || ' effective privileges: ' || string_agg(t || ':' || r || ':' || p, ', ' ORDER BY t,r,p)`);
  lines.push(`  END`);
  lines.push(`FROM (`);
  lines.push(`  SELECT t.t, r.r, p.p`);
  lines.push(`  FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push(`  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)`);
  lines.push(`  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)`);
  lines.push(`  WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)`);
  lines.push(`) violations`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C06: No TEXT type remaining on converted columns
  lines.push('-- C06: No TEXT type remaining on converted columns');
  lines.push("SELECT 'C06', 'no_text_remaining',");
  lines.push(`  CASE WHEN count(*) = 0 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: ' || count(*) || ' still TEXT: ' || string_agg(table_name || '.' || column_name, ', ')`);
  lines.push(`  END`);
  lines.push(`FROM information_schema.columns`);
  lines.push(`WHERE table_schema = 'public'`);
  lines.push(`  AND (table_name, column_name) IN (`);
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push(`  ) AND data_type = 'text'`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C07: Zero PUBLIC grants on all 36 business tables
  lines.push('-- C07: Zero PUBLIC grants on all 36 business tables');
  lines.push("SELECT 'C07', 'zero_public_grants',");
  lines.push(`  CASE WHEN count(*) = 0 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: ' || count(*) || ' PUBLIC grants'`);
  lines.push(`  END`);
  lines.push(`FROM pg_class c`);
  lines.push(`JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'`);
  lines.push(`CROSS JOIN LATERAL aclexplode(c.relacl) AS acl`);
  lines.push(`WHERE c.relkind = 'r' AND acl.grantee = 0`);
  lines.push(`  AND c.relname IN (${ALL_36.map(t => `'${t}'`).join(',')})`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C08: Zero MAINTAIN privilege for anon/authenticated (PG17+, graceful skip)
  lines.push('-- C08: Zero MAINTAIN privilege for anon/authenticated (PG17+; PASS on older)');
  lines.push("SELECT 'C08', 'zero_maintain_privilege',");
  lines.push(`  CASE`);
  lines.push(`    WHEN current_setting('server_version_num')::int < 170000 THEN 'PASS (skipped: server < PG17)'`);
  lines.push(`    WHEN count(*) = 0 THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: ' || count(*) || ' MAINTAIN privileges: ' || string_agg(t || ':' || r, ', ' ORDER BY t,r)`);
  lines.push(`  END`);
  lines.push(`FROM (`);
  lines.push(`  SELECT t.t, r.r`);
  lines.push(`  FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push(`  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)`);
  lines.push(`  WHERE current_setting('server_version_num')::int >= 170000`);
  lines.push(`    AND has_table_privilege(r.r, 'public.' || t.t, 'MAINTAIN')`);
  lines.push(`) violations`);
  lines.push('');
  lines.push('ORDER BY check_id;');
  lines.push('');

  return lines.join('\n');
}


// ============================================================
// WRITE FILES / CHECK MODE
// ============================================================
const blockA = generateBlockA();
const blockB = generateBlockB();
const blockC = generateBlockC();

const OUTPUT_FILES = {
  'supabase/staging/migration-004-A-preflight.sql': blockA,
  'supabase/staging/migration-004-B-migration.sql': blockB,
  'supabase/staging/migration-004-C-validation.sql': blockC,
};

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const checkMode = process.argv.includes('--check');

if (checkMode) {
  // Reproducibility check: compare generated content against committed files.
  // Normalize CRLF→LF on read so Windows checkouts pass even without .gitattributes.
  let allMatch = true;
  console.log('Migration 004 Reproducibility Check:');
  for (const [path, content] of Object.entries(OUTPUT_FILES)) {
    const generatedHash = sha256(content);
    let committedContent;
    try {
      committedContent = readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
    } catch (e) {
      console.log(`  FAIL: ${path} — file not found`);
      allMatch = false;
      continue;
    }
    const committedHash = sha256(committedContent);
    const match = generatedHash === committedHash;
    const status = match ? 'MATCH' : 'MISMATCH';
    console.log(`  ${status}: ${path}`);
    console.log(`    committed: ${committedHash}`);
    console.log(`    generated: ${generatedHash}`);
    console.log(`    bytes: ${Buffer.byteLength(content)}`);
    if (!match) allMatch = false;
  }
  if (!allMatch) {
    console.log('\nFAIL: Regenerated output does not match committed files.');
    process.exit(1);
  }
  console.log('\nPASS: All 3 blocks match committed files byte-for-byte.');
  process.exit(0);
} else {
  // Normal generation mode
  for (const [path, content] of Object.entries(OUTPUT_FILES)) {
    writeFileSync(path, content);
  }
  console.log('Generated Migration 004:');
  for (const [path, content] of Object.entries(OUTPUT_FILES)) {
    console.log(`  ${path}: ${Buffer.byteLength(content)} bytes  sha256:${sha256(content)}`);
  }
  console.log(`  TEXT->UUID conversions: ${conversions.length}`);
  console.log(`  NOT NULL enforcements: ${notNullTables.length}`);
  console.log(`  Business tables validated: ${ALL_36.length}`);
}
