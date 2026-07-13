#!/usr/bin/env node
/**
 * Deterministic Migration 005 Generator (v2)
 * Same-Organization Relational Integrity: declarative composite FKs
 *
 * Generates four canonical SQL files:
 *   supabase/staging/migration-005-A-preflight.sql
 *   supabase/staging/migration-005-B-migration.sql
 *   supabase/staging/migration-005-C-validation.sql
 *   supabase/staging/migration-005-D-transactional-tests.sql
 *
 * Block A: Read-only preflight (exact catalog FK verification, conflict detection)
 * Block B: Atomic DDL migration
 * Block C: Read-only catalog validation (CTE-based exact comparison)
 * Block D: Transactional DML tests (BEGIN/ROLLBACK, exercises real FKs)
 *
 * Usage: node scripts/generate-migration-005.mjs [--check]
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const inventory = JSON.parse(readFileSync('docs/migration-005-inventory.json', 'utf8'));
const rels = inventory.relationships;
const targetTables = inventory.target_tables_needing_unique;
const ALL_36 = inventory.all_36_business_tables;

const oldFKs = rels.filter(r => r.old_fk_name !== null);
const involvedTables = [...new Set([...rels.map(r => r.source_table), ...rels.map(r => r.target_table)])].sort();

function sha256(content) { return createHash('sha256').update(content).digest('hex'); }
function uqName(table) { return `uq_${table}_org_id`; }
function fkName(r) { return `fk_${r.source_table}_${r.source_column}_org`; }


// ============================================================
// BLOCK A: Preflight (strengthened)
// ============================================================
function generateBlockA() {
  const L = [];
  L.push('-- migration-005-A-preflight.sql');
  L.push('-- Migration 005 Preflight: Same-organization relational integrity prerequisites');
  L.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  L.push('-- Read-only: raises exception on failure, emits PASS on success');
  L.push('-- Checks (10 total):');
  L.push('--   1. Source columns are nullable UUID');
  L.push('--   2. Target id columns are UUID');
  L.push('--   3. organization_id UUID NOT NULL on all source+target tables');
  L.push('--   4. Old simple FKs verified by exact catalog mapping (9 attributes)');
  L.push('--   5. No conflicting composite FK by name');
  L.push('--   6. No equivalent composite FK regardless of name');
  L.push('--   7. No conflicting/equivalent UNIQUE(org_id,id) on target tables');
  L.push('--   8. Zero dangling references');
  L.push('--   9. Zero cross-organization references');
  L.push('--  10. Zero effective privileges (anon/authenticated/PUBLIC/MAINTAIN)');
  L.push('');
  L.push('DO $preflight$');
  L.push('DECLARE');
  L.push('  issues TEXT[];');
  L.push('  cnt BIGINT;');
  L.push('BEGIN');
  L.push('');

  // Check 1: Source columns are nullable UUID
  L.push('  -- Check 1: All 34 source columns are nullable UUID');
  L.push('  SELECT array_agg(t || \'.\' || c || \'(\' || COALESCE(udt_name,\'MISSING\') || \',\' || COALESCE(is_nullable,\'?\') || \')\') INTO issues');
  L.push('  FROM (VALUES');
  L.push(rels.map(r => `    ('${r.source_table}', '${r.source_column}')`).join(',\n'));
  L.push('  ) AS expected(t, c)');
  L.push('  LEFT JOIN information_schema.columns cols');
  L.push("    ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = expected.c");
  L.push("  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'NO';");
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: source columns not nullable UUID: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');

  // Check 2: Target id columns UUID
  L.push('  -- Check 2: Target table id columns are UUID');
  L.push(`  SELECT array_agg(t) INTO issues`);
  L.push(`  FROM unnest(ARRAY[${targetTables.map(t => `'${t}'`).join(',')}]) AS t`);
  L.push('  WHERE NOT EXISTS (');
  L.push("    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'");
  L.push("      AND table_name = t AND column_name = 'id' AND udt_name = 'uuid');");
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: target id not UUID: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');

  // Check 3: organization_id UUID NOT NULL
  L.push('  -- Check 3: organization_id UUID NOT NULL on all involved tables');
  L.push('  SELECT array_agg(t || \':\' || COALESCE(udt_name,\'MISSING\') || \':\' || COALESCE(is_nullable,\'?\')) INTO issues');
  L.push('  FROM (VALUES');
  L.push(involvedTables.map(t => `    ('${t}')`).join(',\n'));
  L.push('  ) AS expected(t)');
  L.push('  LEFT JOIN information_schema.columns cols');
  L.push("    ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = 'organization_id'");
  L.push("  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'YES';");
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: organization_id not UUID NOT NULL: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');
  return L;
}

function generateBlockA_check4(L) {
  // Check 4: Old simple FKs verified by exact catalog mapping (all 9 attributes)
  L.push('  -- Check 4: Old simple FKs verified by exact catalog mapping');
  L.push('  -- Verifies: name, source table, exact source column, target table, target column=id,');
  L.push('  --   contype=f, convalidated=true, MATCH SIMPLE, NO ACTION');
  L.push('  SELECT array_agg(');
  L.push("    e.expected_name || ': ' || CASE");
  L.push("      WHEN con.conname IS NULL THEN 'MISSING'");
  L.push("      WHEN con.contype != 'f' THEN 'not FK (type=' || con.contype || ')'");
  L.push("      WHEN NOT con.convalidated THEN 'NOT VALIDATED'");
  L.push("      WHEN con.confmatchtype != 's' THEN 'MATCH type=' || con.confmatchtype");
  L.push("      WHEN con.confupdtype != 'a' THEN 'ON UPDATE=' || con.confupdtype");
  L.push("      WHEN con.confdeltype != 'a' THEN 'ON DELETE=' || con.confdeltype");
  L.push("      WHEN con.conrelid::regclass::text != e.expected_src_table THEN 'src_table=' || con.conrelid::regclass::text");
  L.push("      WHEN array_length(con.conkey, 1) != 1 THEN 'src_cols=' || array_length(con.conkey, 1)");
  L.push("      WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) != e.expected_src_col");
  L.push("        THEN 'src_col=' || (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1])");
  L.push("      WHEN con.confrelid::regclass::text != e.expected_tgt_table THEN 'tgt_table=' || con.confrelid::regclass::text");
  L.push("      WHEN array_length(con.confkey, 1) != 1 THEN 'tgt_cols=' || array_length(con.confkey, 1)");
  L.push("      WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) != 'id'");
  L.push("        THEN 'tgt_col=' || (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1])");
  L.push("      ELSE NULL END");
  L.push('  ) INTO issues');
  L.push('  FROM (VALUES');
  for (let i = 0; i < oldFKs.length; i++) {
    const r = oldFKs[i];
    const comma = i < oldFKs.length - 1 ? ',' : '';
    L.push(`    ('${r.old_fk_name}', '${r.source_table}', '${r.source_column}', '${r.target_table}')${comma}`);
  }
  L.push('  ) AS e(expected_name, expected_src_table, expected_src_col, expected_tgt_table)');
  L.push("  LEFT JOIN pg_constraint con ON con.connamespace = 'public'::regnamespace AND con.conname = e.expected_name");
  L.push('  WHERE con.conname IS NULL');
  L.push("    OR con.contype != 'f'");
  L.push('    OR NOT con.convalidated');
  L.push("    OR con.confmatchtype != 's'");
  L.push("    OR con.confupdtype != 'a'");
  L.push("    OR con.confdeltype != 'a'");
  L.push("    OR con.conrelid::regclass::text != e.expected_src_table");
  L.push('    OR array_length(con.conkey, 1) != 1');
  L.push("    OR (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) != e.expected_src_col");
  L.push("    OR con.confrelid::regclass::text != e.expected_tgt_table");
  L.push('    OR array_length(con.confkey, 1) != 1');
  L.push("    OR (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) != 'id';");
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: old FK catalog mismatch: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');
  return L;
}


function generateBlockA_checks5to10(L) {
  // Check 5: No conflicting composite FK by exact name
  L.push('  -- Check 5: No composite FK constraints by expected name');
  L.push('  SELECT array_agg(conname) INTO issues FROM pg_constraint');
  L.push("  WHERE connamespace = 'public'::regnamespace");
  L.push(`    AND conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')});`);
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: composite FKs already exist: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');

  // Check 6: No equivalent composite FK regardless of name — exact ordered columns
  L.push('  -- Check 6: No equivalent composite FK (any name) with exact (organization_id, source_col)');
  L.push('  SELECT array_agg(con.conname || \' on \' || con.conrelid::regclass::text) INTO issues');
  L.push('  FROM pg_constraint con');
  L.push("  WHERE con.connamespace = 'public'::regnamespace AND con.contype = 'f'");
  L.push('    AND array_length(con.conkey, 1) = 2');
  L.push("    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) = 'organization_id'");
  L.push('    AND (con.conrelid::regclass::text, (');
  L.push('      SELECT a.attname FROM pg_attribute a');
  L.push('      WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]');
  L.push('    )) IN (');
  L.push(rels.map(r => `      ('${r.source_table}', '${r.source_column}')`).join(',\n'));
  L.push('    );');
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: equivalent composite FKs found: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');

  // Check 7: No conflicting/equivalent UNIQUE(org_id,id) — exact ordered columns
  L.push('  -- Check 7: No existing UNIQUE with exact ordered columns (organization_id, id) on target tables');
  L.push('  SELECT array_agg(con.conname || \' on \' || con.conrelid::regclass::text) INTO issues');
  L.push('  FROM pg_constraint con');
  L.push("  WHERE con.connamespace = 'public'::regnamespace AND con.contype = 'u'");
  L.push(`    AND con.conrelid::regclass::text IN (${targetTables.map(t => `'${t}'`).join(',')})`);
  L.push('    AND array_length(con.conkey, 1) = 2');
  L.push("    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) = 'organization_id'");
  L.push("    AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]) = 'id';");
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: equivalent UNIQUE(organization_id,id) found: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('  issues := NULL;');
  L.push('');

  // Check 8: Zero dangling references
  L.push('  -- Check 8: Zero dangling references');
  for (const r of rels) {
    L.push(`  SELECT count(*) INTO cnt FROM public.${r.source_table} s`);
    L.push(`  WHERE s.${r.source_column} IS NOT NULL`);
    L.push(`    AND NOT EXISTS (SELECT 1 FROM public.${r.target_table} t WHERE t.id = s.${r.source_column});`);
    L.push(`  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % dangling in ${r.source_table}.${r.source_column}', cnt; END IF;`);
  }
  L.push('');

  // Check 9: Zero cross-organization references
  L.push('  -- Check 9: Zero cross-organization references');
  for (const r of rels) {
    L.push(`  SELECT count(*) INTO cnt FROM public.${r.source_table} s`);
    L.push(`  JOIN public.${r.target_table} t ON t.id = s.${r.source_column}`);
    L.push(`  WHERE s.${r.source_column} IS NOT NULL AND s.organization_id != t.organization_id;`);
    L.push(`  IF cnt > 0 THEN RAISE EXCEPTION 'PREFLIGHT FAIL [9]: % cross-org in ${r.source_table}.${r.source_column}', cnt; END IF;`);
  }
  L.push('');

  // Check 10: Privileges
  L.push('  -- Check 10: Zero effective privileges (anon/authenticated/PUBLIC/MAINTAIN)');
  L.push('  SELECT array_agg(t||\':\' ||r||\':\' ||p) INTO issues FROM (');
  L.push(`    SELECT t.t, r.r, p.p FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  L.push("    CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  L.push("    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)");
  L.push("    WHERE has_table_privilege(r.r, 'public.'||t.t, p.p)) violations;");
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [10a]: privileges: %', array_to_string(issues, ', ');");
  L.push('  END IF; issues := NULL;');
  L.push('');
  L.push("  IF current_setting('server_version_num')::int >= 170000 THEN");
  L.push('    SELECT array_agg(t||\':\' ||r||\':MAINTAIN\') INTO issues FROM (');
  L.push(`      SELECT t.t, r.r FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  L.push("      CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  L.push("      WHERE has_table_privilege(r.r, 'public.'||t.t, 'MAINTAIN')) violations;");
  L.push('    IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("      RAISE EXCEPTION 'PREFLIGHT FAIL [10b]: MAINTAIN: %', array_to_string(issues, ', ');");
  L.push('    END IF; issues := NULL;');
  L.push('  END IF;');
  L.push('');
  L.push("  SELECT array_agg(c.relname||':PUBLIC:'||acl.privilege_type) INTO issues");
  L.push("  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'");
  L.push("  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl WHERE c.relkind='r' AND acl.grantee=0");
  L.push(`    AND c.relname IN (${ALL_36.map(t => `'${t}'`).join(',')});`);
  L.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  L.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [10c]: PUBLIC grants: %', array_to_string(issues, ', ');");
  L.push('  END IF;');
  L.push('');
  L.push("  RAISE NOTICE 'PREFLIGHT PASS: all 10 checks passed. Safe to execute Block B.';");
  L.push('END $preflight$;');
  L.push('');
  L.push(`SELECT 'PREFLIGHT PASS: all 10 checks passed. ${rels.length} FKs, ${targetTables.length} UNIQUEs, ${oldFKs.length} old FKs verified.' AS result;`);
  L.push('');
  return L.join('\n');
}

function buildBlockA() {
  let L = generateBlockA();
  L = generateBlockA_check4(L);
  return generateBlockA_checks5to10(L);
}


// ============================================================
// BLOCK B: Migration (atomic, unchanged logic)
// ============================================================
function generateBlockB() {
  const L = [];
  L.push('-- migration-005-B-migration.sql');
  L.push('-- Migration 005: Same-Organization Relational Integrity');
  L.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  L.push('-- ATOMIC: BEGIN/COMMIT');
  L.push(`-- Phase 1: Add UNIQUE(organization_id, id) on ${targetTables.length} tables`);
  L.push(`-- Phase 2: Drop ${oldFKs.length} old simple FKs`);
  L.push(`-- Phase 3: Add ${rels.length} composite FKs`);
  L.push('-- MATCH SIMPLE, ON UPDATE NO ACTION, ON DELETE NO ACTION.');
  L.push('-- No grants, policies, functions, or client access.');
  L.push('');
  L.push('BEGIN;');
  L.push('');
  L.push('-- PHASE 1: UNIQUE constraints');
  for (const t of targetTables) {
    L.push(`ALTER TABLE public.${t} ADD CONSTRAINT ${uqName(t)} UNIQUE (organization_id, id);`);
  }
  L.push('');
  L.push('-- PHASE 2: Drop old simple FKs');
  for (const r of oldFKs) {
    L.push(`ALTER TABLE public.${r.source_table} DROP CONSTRAINT ${r.old_fk_name};`);
  }
  L.push('');
  L.push('-- PHASE 3: Composite FKs');
  for (const r of rels) {
    L.push(`ALTER TABLE public.${r.source_table} ADD CONSTRAINT ${fkName(r)}`);
    L.push(`  FOREIGN KEY (organization_id, ${r.source_column})`);
    L.push(`  REFERENCES public.${r.target_table}(organization_id, id)`);
    L.push('  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;');
  }
  L.push('');
  L.push('COMMIT;');
  L.push('');
  return L.join('\n');
}


// ============================================================
// BLOCK C: Validation (CTE-based, read-only)
// ============================================================
function generateBlockC() {
  const L = [];
  L.push('-- migration-005-C-validation.sql');
  L.push('-- Migration 005 Validation: catalog-derived exact comparison');
  L.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  L.push('-- STRICTLY READ-ONLY. No DML. Run before Block D.');
  L.push('-- Expected: ALL checks PASS');
  L.push('');

  // === FK validation via CTE ===
  L.push('-- C01-C06: Validate all 34 composite FKs via expected-relationships CTE');
  L.push('WITH expected_fks(fk_name, src_table, src_col, tgt_table) AS (VALUES');
  L.push(rels.map((r, i) => `  ('${fkName(r)}', '${r.source_table}', '${r.source_column}', '${r.target_table}')${i < rels.length - 1 ? ',' : ''}`).join('\n'));
  L.push('),');
  L.push('installed_fks AS (');
  L.push('  SELECT con.conname, con.conrelid::regclass::text AS src_table,');
  L.push('    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) AS src_col1,');
  L.push('    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]) AS src_col2,');
  L.push('    con.confrelid::regclass::text AS tgt_table,');
  L.push('    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[1]) AS tgt_col1,');
  L.push('    (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = con.confkey[2]) AS tgt_col2,');
  L.push('    con.convalidated, con.confmatchtype, con.confupdtype, con.confdeltype,');
  L.push('    array_length(con.conkey, 1) AS src_col_count,');
  L.push('    array_length(con.confkey, 1) AS tgt_col_count');
  L.push("  FROM pg_constraint con WHERE con.connamespace = 'public'::regnamespace AND con.contype = 'f'");
  L.push(`    AND con.conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`)
  L.push(')');
  L.push('');

  // C01: Missing FKs
  L.push("SELECT 'C01' AS check_id, 'missing_fks' AS check_name,");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || count(*) || ' missing: ' || string_agg(e.fk_name, ', ')");
  L.push('  END AS result');
  L.push('FROM expected_fks e LEFT JOIN installed_fks i ON i.conname = e.fk_name');
  L.push('WHERE i.conname IS NULL');
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C02: Source columns exactly {organization_id, source_column}
  L.push("SELECT 'C02', 'fk_source_columns',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(i.conname || '(' || i.src_col1 || ',' || i.src_col2 || ')', ', ')");
  L.push('  END');
  L.push("FROM installed_fks i JOIN expected_fks e ON e.fk_name = i.conname");
  L.push("WHERE i.src_col_count != 2 OR i.src_table != e.src_table OR i.src_col1 != 'organization_id' OR i.src_col2 != e.src_col");
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C03: Target columns exactly {organization_id, id}
  L.push("SELECT 'C03', 'fk_target_columns',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(i.conname || ' -> ' || i.tgt_col1 || ',' || i.tgt_col2, ', ')");
  L.push('  END');
  L.push("FROM installed_fks i WHERE i.tgt_col_count != 2 OR i.tgt_col1 != 'organization_id' OR i.tgt_col2 != 'id'");
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C04: Target table matches
  L.push("SELECT 'C04', 'fk_target_table',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(i.conname || ' expected->' || e.tgt_table || ' got->' || i.tgt_table, ', ')");
  L.push('  END');
  L.push("FROM installed_fks i JOIN expected_fks e ON e.fk_name = i.conname WHERE i.tgt_table != e.tgt_table");
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C05: Validated, MATCH SIMPLE, NO ACTION
  L.push("SELECT 'C05', 'fk_validated_match_actions',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(i.conname || '(v=' || i.convalidated || ',m=' || i.confmatchtype || ',u=' || i.confupdtype || ',d=' || i.confdeltype || ')', ', ')");
  L.push('  END');
  L.push("FROM installed_fks i WHERE NOT i.convalidated OR i.confmatchtype != 's' OR i.confupdtype != 'a' OR i.confdeltype != 'a'");
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C06: No extra/unexpected composite FKs — by catalog structure (not naming convention)
  L.push("SELECT 'C06', 'no_extra_composite_fks',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || count(*) || ' unexpected: ' || string_agg(conname || ' on ' || conrelid::regclass::text, ', ')");
  L.push('  END');
  L.push("FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'f'");
  L.push("  AND array_length(conkey, 1) = 2");
  L.push("  AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = conrelid AND a.attnum = conkey[1]) = 'organization_id'");
  L.push(`  AND conrelid::regclass::text IN (${[...new Set(rels.map(r => r.source_table))].sort().map(t => `'${t}'`).join(',')})`);
  L.push(`  AND conname NOT IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`);
  L.push('');
  L.push('UNION ALL');
  L.push('');
  return L;
}


function generateBlockC_uq_and_privs(L) {
  // C07: UNIQUE constraints exactly validated
  L.push('-- C07: All 9 UNIQUE constraints exact (name, table, columns, validated)');
  L.push("SELECT 'C07', 'unique_constraints_exact',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(issue, '; ')");
  L.push('  END');
  L.push('FROM (');
  L.push('  SELECT e.uq_name || \': \' || CASE');
  L.push("    WHEN con.conname IS NULL THEN 'MISSING'");
  L.push("    WHEN NOT con.convalidated THEN 'NOT VALIDATED'");
  L.push('    WHEN array_length(con.conkey, 1) != 2 THEN \'cols=\' || array_length(con.conkey, 1)');
  L.push("    WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[1]) != 'organization_id'");
  L.push("      THEN 'col1 != organization_id'");
  L.push("    WHEN (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = con.conrelid AND a.attnum = con.conkey[2]) != 'id'");
  L.push("      THEN 'col2 != id'");
  L.push("    ELSE NULL END AS issue");
  L.push('  FROM (VALUES');
  L.push(targetTables.map((t, i) => `    ('${uqName(t)}', '${t}')${i < targetTables.length - 1 ? ',' : ''}`).join('\n'));
  L.push('  ) AS e(uq_name, expected_table)');
  L.push("  LEFT JOIN pg_constraint con ON con.connamespace = 'public'::regnamespace");
  L.push("    AND con.conname = e.uq_name AND con.contype = 'u'");
  L.push("    AND con.conrelid::regclass::text = e.expected_table");
  L.push(') sub WHERE issue IS NOT NULL');
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C08: No duplicate/equivalent UNIQUE on target tables — exact (organization_id, id) columns only
  L.push("-- C08: No unexpected equivalent UNIQUE(organization_id,id) duplicates (exact ordered columns)");
  L.push("SELECT 'C08', 'no_duplicate_uniques',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(conname || ' on ' || conrelid::regclass::text, ', ')");
  L.push('  END');
  L.push("FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND contype = 'u'");
  L.push(`  AND conrelid::regclass::text IN (${targetTables.map(t => `'${t}'`).join(',')})`);
  L.push('  AND array_length(conkey, 1) = 2');
  L.push("  AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = conrelid AND a.attnum = conkey[1]) = 'organization_id'");
  L.push("  AND (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = conrelid AND a.attnum = conkey[2]) = 'id'");
  L.push(`  AND conname NOT IN (${targetTables.map(t => `'${uqName(t)}'`).join(',')})`);
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C09: Source columns remain nullable UUID
  L.push('-- C09: All 34 source reference columns remain nullable UUID');
  L.push("SELECT 'C09', 'source_cols_nullable_uuid',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(t || '.' || c || '(' || udt_name || ',' || is_nullable || ')', ', ')");
  L.push('  END');
  L.push('FROM (');
  L.push('  SELECT expected.t, expected.c, cols.udt_name, cols.is_nullable');
  L.push('  FROM (VALUES');
  L.push(rels.map(r => `    ('${r.source_table}', '${r.source_column}')`).join(',\n'));
  L.push("  ) AS expected(t, c) LEFT JOIN information_schema.columns cols ON cols.table_schema = 'public'");
  L.push('    AND cols.table_name = expected.t AND cols.column_name = expected.c');
  L.push("  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'NO'");
  L.push(') mismatched');
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C10: organization_id UUID NOT NULL on all source+target
  L.push('-- C10: organization_id UUID NOT NULL on all source+target tables');
  L.push("SELECT 'C10', 'org_id_uuid_not_null',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(t || ':' || COALESCE(udt_name,'MISSING') || ':' || COALESCE(is_nullable,'?'), ', ')");
  L.push('  END');
  L.push('FROM (');
  L.push(`  SELECT expected.t, cols.udt_name, cols.is_nullable FROM (VALUES ${involvedTables.map(t => `('${t}')`).join(',')}) AS expected(t)`);
  L.push("  LEFT JOIN information_schema.columns cols ON cols.table_schema = 'public'");
  L.push("    AND cols.table_name = expected.t AND cols.column_name = 'organization_id'");
  L.push("  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'YES'");
  L.push(') mismatched');
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C11: Old simple FKs removed
  L.push('-- C11: Old simple FKs removed');
  L.push("SELECT 'C11', 'old_fks_removed',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || string_agg(conname, ', ')");
  L.push('  END');
  L.push("FROM pg_constraint WHERE connamespace = 'public'::regnamespace");
  L.push(`  AND conname IN (${oldFKs.map(r => `'${r.old_fk_name}'`).join(',')})`);
  L.push('');
  L.push('UNION ALL');
  L.push('');

  // C12: Zero privileges (anon/authenticated + MAINTAIN + PUBLIC)
  L.push('-- C12: Zero effective privileges (anon/authenticated/PUBLIC/MAINTAIN)');
  L.push("SELECT 'C12', 'zero_anon_auth_privileges',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || count(*) || ' privileges' END");
  L.push('FROM (');
  L.push(`  SELECT 1 FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  L.push("  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  L.push("  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)");
  L.push("  WHERE has_table_privilege(r.r, 'public.'||t.t, p.p)");
  L.push(') v');
  L.push('');
  L.push('UNION ALL');
  L.push('');
  L.push("-- C13: Zero MAINTAIN privilege (PG17+, graceful skip on older)");
  L.push("SELECT 'C13', 'zero_maintain_privilege',");
  L.push("  CASE");
  L.push("    WHEN current_setting('server_version_num')::int < 170000 THEN 'PASS (skipped: server < PG17)'");
  L.push("    WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: ' || count(*) || ' MAINTAIN privileges'");
  L.push('  END');
  L.push('FROM (');
  L.push(`  SELECT 1 FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  L.push("  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  L.push("  WHERE current_setting('server_version_num')::int >= 170000");
  L.push("    AND has_table_privilege(r.r, 'public.'||t.t, 'MAINTAIN')");
  L.push(') v');
  L.push('');
  L.push('UNION ALL');
  L.push('');
  L.push("-- C14: Zero PUBLIC grants");
  L.push("SELECT 'C14', 'zero_public_grants',");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL: ' || count(*) || ' PUBLIC grants' END");
  L.push("FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'");
  L.push("CROSS JOIN LATERAL aclexplode(c.relacl) AS acl WHERE c.relkind='r' AND acl.grantee=0");
  L.push(`  AND c.relname IN (${ALL_36.map(t => `'${t}'`).join(',')})`);
  L.push('');
  L.push('ORDER BY check_id;');
  L.push('');
  return L.join('\n');
}

function buildBlockC() {
  const L = generateBlockC();
  return generateBlockC_uq_and_privs(L);
}


// ============================================================
// BLOCK D: Transactional DML Tests (BEGIN/ROLLBACK)
// ============================================================
function generateBlockD() {
  const L = [];
  L.push('-- migration-005-D-transactional-tests.sql');
  L.push('-- Migration 005 Transactional DML Validation');
  L.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  L.push('-- NOT read-only. Creates minimal test data, exercises composite FKs,');
  L.push('-- and ALWAYS rolls back. Run ONLY after Block C passes and operator confirms.');
  L.push('-- Expected: All assertions pass, zero rows remain after ROLLBACK.');
  L.push('');
  L.push('-- Create baseline table OUTSIDE the transaction so it survives ROLLBACK');
  L.push('DROP TABLE IF EXISTS pg_temp._m005_baselines;');
  L.push('CREATE TEMP TABLE _m005_baselines(tbl TEXT PRIMARY KEY, cnt BIGINT) ON COMMIT PRESERVE ROWS;');
  L.push("INSERT INTO _m005_baselines VALUES ('organizations',(SELECT count(*) FROM public.organizations));");
  L.push("INSERT INTO _m005_baselines VALUES ('customers',(SELECT count(*) FROM public.customers));");
  L.push("INSERT INTO _m005_baselines VALUES ('drivers',(SELECT count(*) FROM public.drivers));");
  L.push("INSERT INTO _m005_baselines VALUES ('vehicles',(SELECT count(*) FROM public.vehicles));");
  L.push("INSERT INTO _m005_baselines VALUES ('trips',(SELECT count(*) FROM public.trips));");
  L.push("INSERT INTO _m005_baselines VALUES ('enquiries',(SELECT count(*) FROM public.enquiries));");
  L.push("INSERT INTO _m005_baselines VALUES ('quotations',(SELECT count(*) FROM public.quotations));");
  L.push("INSERT INTO _m005_baselines VALUES ('invoices',(SELECT count(*) FROM public.invoices));");
  L.push("INSERT INTO _m005_baselines VALUES ('vendors',(SELECT count(*) FROM public.vendors));");
  L.push("INSERT INTO _m005_baselines VALUES ('branches',(SELECT count(*) FROM public.branches));");
  L.push("INSERT INTO _m005_baselines VALUES ('expenses',(SELECT count(*) FROM public.expenses));");
  L.push('');
  L.push('-- BEGIN the transaction that will be rolled back');
  L.push('BEGIN;');
  L.push('');
  L.push('DO $tests$');
  L.push('DECLARE');
  L.push('  org_a UUID := gen_random_uuid();');
  L.push('  org_b UUID := gen_random_uuid();');
  L.push('  cust_a UUID := gen_random_uuid();');
  L.push('  drv_a UUID := gen_random_uuid();');
  L.push('  veh_a UUID := gen_random_uuid();');
  L.push('  trip_a UUID := gen_random_uuid();');
  L.push('  enq_a UUID := gen_random_uuid();');
  L.push('  quot_a UUID := gen_random_uuid();');
  L.push('  inv_a UUID := gen_random_uuid();');
  L.push('  vendor_a UUID := gen_random_uuid();');
  L.push('  branch_a UUID := gen_random_uuid();');
  L.push('  cust_b UUID := gen_random_uuid();');
  L.push('  nonexist UUID := gen_random_uuid();');
  L.push('  violation_caught BOOLEAN;');
  L.push('BEGIN');
  L.push('');
  L.push('  -- ============================================================');
  L.push('  -- Setup: create minimal test organizations and entities');
  L.push('  -- ============================================================');
  L.push("  INSERT INTO public.organizations (id, name) VALUES (org_a, 'Test Org A'), (org_b, 'Test Org B');");
  L.push('');
  L.push('  -- Org A entities (target tables for FK references)');
  L.push("  INSERT INTO public.customers (id, organization_id, name) VALUES (cust_a, org_a, 'Cust A');");
  L.push("  INSERT INTO public.drivers (id, organization_id, name) VALUES (drv_a, org_a, 'Driver A');");
  L.push("  INSERT INTO public.vehicles (id, organization_id, reg_number) VALUES (veh_a, org_a, 'KA01XX1234');");
  L.push("  INSERT INTO public.trips (id, organization_id, customer_id, status, trip_number) VALUES (trip_a, org_a, cust_a, 'booked', 'TR-TEST1');");
  L.push("  INSERT INTO public.enquiries (id, organization_id, customer_id, status) VALUES (enq_a, org_a, cust_a, 'new');");
  L.push("  INSERT INTO public.quotations (id, organization_id, customer_id, enquiry_id, status, quotation_number) VALUES (quot_a, org_a, cust_a, enq_a, 'draft', 'QT-TEST1');");
  L.push("  INSERT INTO public.invoices (id, organization_id, customer_id, invoice_number, status) VALUES (inv_a, org_a, cust_a, 'INV-TEST1', 'draft');");
  L.push("  INSERT INTO public.vendors (id, organization_id, name) VALUES (vendor_a, org_a, 'Vendor A');");
  L.push("  INSERT INTO public.branches (id, organization_id, name) VALUES (branch_a, org_a, 'Branch A');");
  L.push('');
  L.push('  -- Org B entity (for cross-org test)');
  L.push("  INSERT INTO public.customers (id, organization_id, name) VALUES (cust_b, org_b, 'Cust B');");
  L.push('');
  L.push('  -- ============================================================');
  L.push('  -- TEST 1: Same-organization reference SUCCEEDS');
  L.push('  -- ============================================================');
  L.push("  INSERT INTO public.expenses (id, organization_id, trip_id, vehicle_id, amount, category)");
  L.push("    VALUES (gen_random_uuid(), org_a, trip_a, veh_a, 1000, 'fuel');");
  L.push("  RAISE NOTICE 'TEST 1 PASS: same-org reference succeeds';");
  L.push('');

  // TEST 2: Cross-org FK violation
  L.push('  -- ============================================================');
  L.push('  -- TEST 2: Cross-organization reference raises foreign_key_violation');
  L.push('  -- ============================================================');
  L.push('  violation_caught := FALSE;');
  L.push('  BEGIN');
  L.push('    -- Try to insert expense in org_a referencing trip in org_b (doesn\'t exist there)');
  L.push('    -- Actually: insert trip with customer_id pointing to org_b customer');
  L.push("    INSERT INTO public.trips (id, organization_id, customer_id, status, trip_number)");
  L.push("      VALUES (gen_random_uuid(), org_a, cust_b, 'booked', 'TR-XORG');");
  L.push('  EXCEPTION WHEN foreign_key_violation THEN');
  L.push('    violation_caught := TRUE;');
  L.push('  END;');
  L.push('  IF NOT violation_caught THEN');
  L.push("    RAISE EXCEPTION 'TEST 2 FAIL: cross-org reference was NOT rejected';");
  L.push('  END IF;');
  L.push("  RAISE NOTICE 'TEST 2 PASS: cross-org reference correctly rejected';");
  L.push('');

  // TEST 3: Nonexistent reference FK violation
  L.push('  -- ============================================================');
  L.push('  -- TEST 3: Nonexistent reference raises foreign_key_violation');
  L.push('  -- ============================================================');
  L.push('  violation_caught := FALSE;');
  L.push('  BEGIN');
  L.push("    INSERT INTO public.expenses (id, organization_id, trip_id, amount, category)");
  L.push("      VALUES (gen_random_uuid(), org_a, nonexist, 500, 'misc');");
  L.push('  EXCEPTION WHEN foreign_key_violation THEN');
  L.push('    violation_caught := TRUE;');
  L.push('  END;');
  L.push('  IF NOT violation_caught THEN');
  L.push("    RAISE EXCEPTION 'TEST 3 FAIL: nonexistent reference was NOT rejected';");
  L.push('  END IF;');
  L.push("  RAISE NOTICE 'TEST 3 PASS: nonexistent reference correctly rejected';");
  L.push('');

  // TEST 4: NULL optional reference succeeds
  L.push('  -- ============================================================');
  L.push('  -- TEST 4: NULL optional reference succeeds (MATCH SIMPLE)');
  L.push('  -- ============================================================');
  L.push("  INSERT INTO public.expenses (id, organization_id, trip_id, vehicle_id, amount, category)");
  L.push("    VALUES (gen_random_uuid(), org_a, NULL, NULL, 200, 'misc');");
  L.push("  RAISE NOTICE 'TEST 4 PASS: NULL optional reference succeeds';");
  L.push('');

  // TEST 5: Circular vehicles↔drivers
  L.push('  -- ============================================================');
  L.push('  -- TEST 5: Circular vehicles<->drivers established in stages');
  L.push('  -- ============================================================');
  L.push('  -- Step 1: vehicle exists with driver_id=NULL (already inserted above)');
  L.push('  -- Step 2: driver exists with assigned_vehicle_id=NULL (already inserted above)');
  L.push('  -- Step 3: link vehicle -> driver (same org)');
  L.push('  UPDATE public.vehicles SET driver_id = drv_a WHERE id = veh_a;');
  L.push('  -- Step 4: link driver -> vehicle (same org)');
  L.push('  UPDATE public.drivers SET assigned_vehicle_id = veh_a WHERE id = drv_a;');
  L.push("  RAISE NOTICE 'TEST 5 PASS: circular vehicles<->drivers established';");
  L.push('');

  // TEST 6: Cross-org circular link fails
  L.push('  -- ============================================================');
  L.push('  -- TEST 6: Cross-org circular link is rejected');
  L.push('  -- ============================================================');
  L.push('  violation_caught := FALSE;');
  L.push('  BEGIN');
  L.push('    -- Try to link driver_a.assigned_vehicle_id to a vehicle in org_b');
  L.push("    INSERT INTO public.vehicles (id, organization_id, reg_number) VALUES (gen_random_uuid(), org_b, 'KA02ZZ9999');");
  L.push("    UPDATE public.drivers SET assigned_vehicle_id = (SELECT id FROM public.vehicles WHERE reg_number = 'KA02ZZ9999') WHERE id = drv_a;");
  L.push('  EXCEPTION WHEN foreign_key_violation THEN');
  L.push('    violation_caught := TRUE;');
  L.push('  END;');
  L.push('  IF NOT violation_caught THEN');
  L.push("    RAISE EXCEPTION 'TEST 6 FAIL: cross-org circular link was NOT rejected';");
  L.push('  END IF;');
  L.push("  RAISE NOTICE 'TEST 6 PASS: cross-org circular link correctly rejected';");
  L.push('');

  L.push("  RAISE NOTICE 'ALL 6 TRANSACTIONAL TESTS PASSED';");
  L.push('END $tests$;');
  L.push('');
  L.push('-- ROLLBACK undoes all test DML; baseline table survives (created outside txn)');
  L.push('ROLLBACK;');
  L.push('');
  L.push('-- Verify row counts match baselines after rollback (proves transactional safety)');
  L.push("SELECT 'D_ROLLBACK' AS check_id, 'row_counts_match_baselines' AS check_name,");
  L.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  L.push("    ELSE 'FAIL: row count changed for: ' || string_agg(tbl || '(baseline=' || baseline || ',now=' || current_cnt || ')', ', ')");
  L.push('  END AS result');
  L.push('FROM (');
  L.push("  SELECT b.tbl, b.cnt AS baseline, CASE b.tbl");
  L.push("    WHEN 'organizations' THEN (SELECT count(*) FROM public.organizations)");
  L.push("    WHEN 'customers' THEN (SELECT count(*) FROM public.customers)");
  L.push("    WHEN 'drivers' THEN (SELECT count(*) FROM public.drivers)");
  L.push("    WHEN 'vehicles' THEN (SELECT count(*) FROM public.vehicles)");
  L.push("    WHEN 'trips' THEN (SELECT count(*) FROM public.trips)");
  L.push("    WHEN 'enquiries' THEN (SELECT count(*) FROM public.enquiries)");
  L.push("    WHEN 'quotations' THEN (SELECT count(*) FROM public.quotations)");
  L.push("    WHEN 'invoices' THEN (SELECT count(*) FROM public.invoices)");
  L.push("    WHEN 'vendors' THEN (SELECT count(*) FROM public.vendors)");
  L.push("    WHEN 'branches' THEN (SELECT count(*) FROM public.branches)");
  L.push("    WHEN 'expenses' THEN (SELECT count(*) FROM public.expenses)");
  L.push('  END AS current_cnt');
  L.push('  FROM _m005_baselines b');
  L.push(') cmp WHERE baseline != current_cnt;');
  L.push('');
  L.push('DROP TABLE IF EXISTS _m005_baselines;');
  L.push('');
  return L.join('\n');
}


// ============================================================
// WRITE FILES / CHECK MODE
// ============================================================
const blockA = buildBlockA();
const blockB = generateBlockB();
const blockC = buildBlockC();
const blockD = generateBlockD();

const OUTPUT_FILES = {
  'supabase/staging/migration-005-A-preflight.sql': blockA,
  'supabase/staging/migration-005-B-migration.sql': blockB,
  'supabase/staging/migration-005-C-validation.sql': blockC,
  'supabase/staging/migration-005-D-transactional-tests.sql': blockD,
};

const checkMode = process.argv.includes('--check');

if (checkMode) {
  let allMatch = true;
  console.log('Migration 005 Reproducibility Check:');
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
    console.log(`  ${match ? 'MATCH' : 'MISMATCH'}: ${path}`);
    console.log(`    committed: ${committedHash}`);
    console.log(`    generated: ${generatedHash}`);
    console.log(`    bytes: ${Buffer.byteLength(content)}`);
    if (!match) allMatch = false;
  }
  if (!allMatch) {
    console.log('\nFAIL: Regenerated output does not match committed files.');
    process.exit(1);
  }
  console.log('\nPASS: All 4 blocks match committed files byte-for-byte.');
  process.exit(0);
} else {
  for (const [path, content] of Object.entries(OUTPUT_FILES)) {
    writeFileSync(path, content);
  }
  console.log('Generated Migration 005:');
  for (const [path, content] of Object.entries(OUTPUT_FILES)) {
    console.log(`  ${path}: ${Buffer.byteLength(content)} bytes  sha256:${sha256(content)}`);
  }
  console.log(`  Composite FKs: ${rels.length}`);
  console.log(`  UNIQUE constraints: ${targetTables.length}`);
  console.log(`  Old FKs to drop: ${oldFKs.length}`);
}
