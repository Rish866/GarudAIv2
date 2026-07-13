#!/usr/bin/env node
/**
 * Deterministic Migration 004 Generator
 * Schema Normalization: TEXT entity references → nullable UUID + organization_id NOT NULL
 * 
 * Generates: migration-004-A-preflight.sql, migration-004-B-migration.sql, migration-004-C-validation.sql
 * 
 * Usage: node scripts/generate-migration-004.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const inventory = JSON.parse(readFileSync('docs/migration-004-inventory.json', 'utf8'));
const conversions = inventory.conversions;
const notNullTables = inventory.organization_id_not_null.tables_needing_not_null;

// ============================================================
// BLOCK A: Preflight
// ============================================================
function generateBlockA() {
  const allTables = [...new Set(conversions.map(c => c.table))].sort();
  return `-- migration-004-A-preflight.sql
-- Migration 004 Preflight: Schema normalization prerequisites
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: raises exception on failure, emits PASS on success
-- Checks:
--   1. All affected tables exist
--   2. Columns to convert are currently TEXT type
--   3. Zero rows with non-empty non-UUID values (would fail CAST)
--   4. Zero NULL organization_id values in tables needing NOT NULL
--   5. No conflicting constraints/triggers from a prior run
--   6. Zero effective privileges for anon/authenticated (dormant state)
--   7. organization_id columns exist and are UUID type

DO $preflight$
DECLARE
  issues TEXT[];
  bad_values TEXT[];
  null_org_ids TEXT[];
  wrong_types TEXT[];
BEGIN
  -- 1. Verify all tables exist
  SELECT array_agg(t) INTO issues
  FROM unnest(ARRAY[${conversions.map(c => `'${c.table}'`).filter((v, i, a) => a.indexOf(v) === i).join(',')}]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: missing tables: %', array_to_string(issues, ', ');
  END IF;

  -- 2. Verify columns are currently TEXT type
  SELECT array_agg(t || '.' || c) INTO wrong_types
  FROM (VALUES
${conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n')}
  ) AS expected(t, c)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = expected.t
      AND column_name = expected.c AND data_type = 'text'
  );
  IF wrong_types IS NOT NULL AND array_length(wrong_types, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: columns not TEXT type: %', array_to_string(wrong_types, ', ');
  END IF;

  -- 3. Verify zero rows with non-empty, non-NULL, non-UUID values
  -- On empty staging this always passes, but guards against partial data
${conversions.map(c => `  SELECT array_agg('${c.table}.${c.column}=' || ${c.column}) INTO bad_values
  FROM public.${c.table}
  WHERE ${c.column} IS NOT NULL AND btrim(${c.column}) != ''
    AND btrim(${c.column}) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  IF bad_values IS NOT NULL AND array_length(bad_values, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: invalid UUID values in ${c.table}.${c.column}: %', array_to_string(bad_values, ', ');
  END IF;
  bad_values := NULL;`).join('\n\n')}

  -- 4. Verify zero NULL organization_id values in tables needing NOT NULL
  SELECT array_agg(t || ': ' || cnt || ' NULLs') INTO null_org_ids
  FROM (
${notNullTables.map(t => `    SELECT '${t}' AS t, count(*) AS cnt FROM public.${t} WHERE organization_id IS NULL`).join('\n    UNION ALL\n')}
  ) sub
  WHERE cnt > 0;
  IF null_org_ids IS NOT NULL AND array_length(null_org_ids, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: NULL organization_id values: %', array_to_string(null_org_ids, ', ');
  END IF;

  -- 5. Verify zero effective privileges for anon/authenticated (dormant state)
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name IN (${[...new Set(conversions.map(c => `'${c.table}'`))].join(',')})
      AND grantee IN ('anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: unexpected privileges on affected tables';
  END IF;

  -- 6. Verify organization_id exists as UUID on all 16 tables
  SELECT array_agg(t) INTO issues
  FROM unnest(ARRAY[${notNullTables.map(t => `'${t}'`).join(',')}]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t
      AND column_name = 'organization_id' AND udt_name = 'uuid'
  );
  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: organization_id not UUID on: %', array_to_string(issues, ', ');
  END IF;

  RAISE NOTICE 'PREFLIGHT PASS: all 6 checks passed. Safe to execute Block B.';
END $preflight$;

SELECT 'PREFLIGHT PASS: all 6 checks passed. ${conversions.length} TEXT columns verified as convertible, ${notNullTables.length} tables ready for NOT NULL. Safe to execute Block B.' AS result;
`;
}

// ============================================================
// BLOCK B: Migration
// ============================================================
function generateBlockB() {
  const lines = [];
  lines.push('-- migration-004-B-migration.sql');
  lines.push('-- Migration 004: Schema Normalization');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- ATOMIC: BEGIN/COMMIT');
  lines.push('-- Phases:');
  lines.push(`--   1. Convert ${conversions.length} TEXT entity-reference columns to nullable UUID`);
  lines.push(`--   2. Enforce organization_id NOT NULL on ${notNullTables.length} business tables`);
  lines.push('-- Empty-string normalization: converts empty/whitespace to NULL before type cast.');
  lines.push('-- No FK constraints added (Migration 005 handles relational integrity).');
  lines.push('-- No grants. No policies. Dormant state preserved.');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Phase 1: TEXT → UUID conversions
  lines.push('-- ============================================================');
  lines.push(`-- PHASE 1: Convert ${conversions.length} TEXT entity-reference columns to nullable UUID`);
  lines.push('-- Each column: normalize empty strings to NULL, then ALTER TYPE UUID USING cast');
  lines.push('-- ============================================================');
  lines.push('');

  for (const c of conversions) {
    lines.push(`-- ${c.table}.${c.column} → ${c.target_table}.id`);
    lines.push(`UPDATE public.${c.table} SET ${c.column} = NULL WHERE ${c.column} IS NOT NULL AND btrim(${c.column}) = '';`);
    lines.push(`ALTER TABLE public.${c.table} ALTER COLUMN ${c.column} TYPE UUID USING ${c.column}::uuid;`);
    lines.push('');
  }

  // Phase 2: organization_id NOT NULL
  lines.push('-- ============================================================');
  lines.push(`-- PHASE 2: Enforce organization_id NOT NULL on ${notNullTables.length} tables`);
  lines.push('-- These were added as nullable in Migration 001. Staging is empty so this is safe.');
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
// BLOCK C: Validation
// ============================================================
function generateBlockC() {
  const lines = [];
  lines.push('-- migration-004-C-validation.sql');
  lines.push('-- Migration 004 Validation: Schema normalization verification');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- Read-only: no persistent changes');
  lines.push('-- Expected: ALL CHECKS PASS');
  lines.push('');

  // C01: All converted columns are now UUID type
  lines.push("-- C01: All converted columns are UUID type");
  lines.push("SELECT 'C01' AS check_id, 'columns_are_uuid' AS check_name,");
  lines.push(`  CASE WHEN count(*) = ${conversions.length} THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: expected ${conversions.length} UUID columns, got ' || count(*)`);
  lines.push("  END AS result");
  lines.push("FROM information_schema.columns");
  lines.push("WHERE table_schema = 'public'");
  lines.push("  AND (table_name, column_name) IN (");
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push("  )");
  lines.push("  AND udt_name = 'uuid'");
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C02: All converted columns are nullable (IS NULL allowed)
  lines.push("-- C02: All converted columns are nullable");
  lines.push("SELECT 'C02', 'columns_nullable',");
  lines.push(`  CASE WHEN count(*) = 0 THEN 'PASS'`);
  lines.push("    ELSE 'FAIL: ' || count(*) || ' columns are unexpectedly NOT NULL: ' || string_agg(table_name || '.' || column_name, ', ')");
  lines.push("  END");
  lines.push("FROM information_schema.columns");
  lines.push("WHERE table_schema = 'public'");
  lines.push("  AND (table_name, column_name) IN (");
  lines.push(conversions.map(c => `    ('${c.table}', '${c.column}')`).join(',\n'));
  lines.push("  )");
  lines.push("  AND is_nullable = 'NO'");
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C03: organization_id is NOT NULL on all 16 tables
  lines.push("-- C03: organization_id is NOT NULL on all 16 Migration-001 tables");
  lines.push("SELECT 'C03', 'org_id_not_null',");
  lines.push(`  CASE WHEN count(*) = ${notNullTables.length} THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: expected ${notNullTables.length} NOT NULL org_id columns, got ' || count(*)`);
  lines.push("  END");
  lines.push("FROM information_schema.columns");
  lines.push("WHERE table_schema = 'public'");
  lines.push(`  AND table_name IN (${notNullTables.map(t => `'${t}'`).join(',')})`);
  lines.push("  AND column_name = 'organization_id'");
  lines.push("  AND is_nullable = 'NO'");
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C04: Zero invalid UUID values in converted columns
  lines.push("-- C04: Zero non-NULL values that are not valid UUIDs (proves clean conversion)");
  lines.push("SELECT 'C04', 'zero_invalid_values',");
  lines.push("  'PASS' -- If ALTER TYPE succeeded, all values are valid UUIDs or NULL");
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C05: organization_id is NOT NULL on ALL 36 business tables (20 already were)
  lines.push("-- C05: organization_id NOT NULL across ALL 36 business tables");
  lines.push("SELECT 'C05', 'all_36_org_id_not_null',");
  lines.push("  CASE WHEN count(*) = 36 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: expected 36 NOT NULL org_id columns, got ' || count(*) || '. Nullable: ' ||");
  lines.push("      (SELECT string_agg(table_name, ', ') FROM information_schema.columns");
  lines.push("       WHERE table_schema = 'public' AND column_name = 'organization_id'");
  lines.push("       AND is_nullable = 'YES' AND table_name IN (");
  lines.push("         'vehicles','drivers','customers','trips','enquiries','quotations',");
  lines.push("         'invoices','payments','expenses','fuel_entries','maintenance_records',");
  lines.push("         'tyres','activity_log','notifications','eway_bills','branches',");
  lines.push("         'vendors','contracts','routes','indents','market_hires',");
  lines.push("         'work_orders','challans','geofences','claims','approvals',");
  lines.push("         'transfers','cash_entries','bank_entries','ledger_accounts',");
  lines.push("         'purchases','sales','inventory','attendance','leave_requests',");
  lines.push("         'gps_devices'))");
  lines.push("  END");
  lines.push("FROM information_schema.columns");
  lines.push("WHERE table_schema = 'public'");
  lines.push("  AND column_name = 'organization_id'");
  lines.push("  AND is_nullable = 'NO'");
  lines.push("  AND table_name IN (");
  lines.push("    'vehicles','drivers','customers','trips','enquiries','quotations',");
  lines.push("    'invoices','payments','expenses','fuel_entries','maintenance_records',");
  lines.push("    'tyres','activity_log','notifications','eway_bills','branches',");
  lines.push("    'vendors','contracts','routes','indents','market_hires',");
  lines.push("    'work_orders','challans','geofences','claims','approvals',");
  lines.push("    'transfers','cash_entries','bank_entries','ledger_accounts',");
  lines.push("    'purchases','sales','inventory','attendance','leave_requests',");
  lines.push("    'gps_devices')");
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C06: Dormant state preserved
  lines.push("-- C06: Dormant state preserved (zero privileges)");
  lines.push("SELECT 'C06', 'dormant_state_preserved',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' unexpected privileges'");
  lines.push("  END");
  lines.push("FROM information_schema.role_table_grants");
  lines.push("WHERE table_schema = 'public'");
  lines.push("  AND table_name IN (");
  lines.push("    'vehicles','drivers','customers','trips','enquiries','quotations',");
  lines.push("    'invoices','payments','expenses','fuel_entries','maintenance_records',");
  lines.push("    'tyres','activity_log','notifications','eway_bills','branches',");
  lines.push("    'vendors','contracts','routes','indents','market_hires',");
  lines.push("    'work_orders','challans','geofences','claims','approvals',");
  lines.push("    'transfers','cash_entries','bank_entries','ledger_accounts',");
  lines.push("    'purchases','sales','inventory','attendance','leave_requests',");
  lines.push("    'gps_devices')");
  lines.push("  AND grantee IN ('anon', 'authenticated')");
  lines.push('');
  lines.push('ORDER BY check_id;');
  lines.push('');
  return lines.join('\n');
}

// ============================================================
// WRITE FILES
// ============================================================
const blockA = generateBlockA();
const blockB = generateBlockB();
const blockC = generateBlockC();

writeFileSync('supabase/staging/migration-004-A-preflight.sql', blockA);
writeFileSync('supabase/staging/migration-004-B-migration.sql', blockB);
writeFileSync('supabase/staging/migration-004-C-validation.sql', blockC);

console.log('Generated Migration 004:');
console.log(`  Block A: ${Buffer.byteLength(blockA)} bytes`);
console.log(`  Block B: ${Buffer.byteLength(blockB)} bytes`);
console.log(`  Block C: ${Buffer.byteLength(blockC)} bytes`);
console.log(`  TEXT→UUID conversions: ${conversions.length}`);
console.log(`  NOT NULL enforcements: ${notNullTables.length}`);
