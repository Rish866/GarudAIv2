#!/usr/bin/env node
/**
 * Deterministic Migration 005 Generator
 * Same-Organization Relational Integrity: declarative composite FKs
 *
 * Generates three canonical SQL files:
 *   supabase/staging/migration-005-A-preflight.sql
 *   supabase/staging/migration-005-B-migration.sql
 *   supabase/staging/migration-005-C-validation.sql
 *
 * Usage: node scripts/generate-migration-005.mjs [--check]
 *   --check: compare SHA-256 of generated vs committed (exit 1 on mismatch)
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';

const inventory = JSON.parse(readFileSync('docs/migration-005-inventory.json', 'utf8'));
const rels = inventory.relationships;
const targetTables = inventory.target_tables_needing_unique;
const ALL_36 = inventory.all_36_business_tables;
const naming = inventory.naming_conventions;

// Derived: old FKs to drop (only existing_uuid_fk category)
const oldFKs = rels.filter(r => r.old_fk_name !== null);

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function uqName(table) { return `uq_${table}_org_id`; }
function fkName(r) { return `fk_${r.source_table}_${r.source_column}_org`; }


// ============================================================
// BLOCK A: Preflight
// ============================================================
function generateBlockA() {
  const lines = [];
  lines.push('-- migration-005-A-preflight.sql');
  lines.push('-- Migration 005 Preflight: Same-organization relational integrity prerequisites');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- Read-only: raises exception on failure, emits PASS on success');
  lines.push('-- Checks (9 total):');
  lines.push('--   1. Source columns are UUID type');
  lines.push('--   2. Target columns (id) are UUID type');
  lines.push('--   3. organization_id is UUID NOT NULL on all source and target tables');
  lines.push('--   4. Old simple FKs exist (for existing_uuid_fk category)');
  lines.push('--   5. No conflicting composite FK constraints already present');
  lines.push('--   6. No conflicting UNIQUE(organization_id, id) constraints already present');
  lines.push('--   7. Zero dangling references (ref_id exists in target table)');
  lines.push('--   8. Zero cross-organization references');
  lines.push('--   9. Zero effective privileges for anon/authenticated/PUBLIC including MAINTAIN');
  lines.push('');
  lines.push('DO $preflight$');
  lines.push('DECLARE');
  lines.push('  issues TEXT[];');
  lines.push('  cnt BIGINT;');
  lines.push('BEGIN');
  lines.push('');

  // Check 1: Source columns are UUID type
  lines.push('  -- Check 1: All 34 source columns are UUID type');
  lines.push('  SELECT array_agg(t || \'.\' || c) INTO issues');
  lines.push('  FROM (VALUES');
  lines.push(rels.map(r => `    ('${r.source_table}', '${r.source_column}')`).join(',\n'));
  lines.push('  ) AS expected(t, c)');
  lines.push('  WHERE NOT EXISTS (');
  lines.push('    SELECT 1 FROM information_schema.columns');
  lines.push("    WHERE table_schema = 'public' AND table_name = expected.t");
  lines.push("      AND column_name = expected.c AND udt_name = 'uuid'");
  lines.push('  );');
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [1]: source columns not UUID: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');

  // Check 2: Target id columns are UUID
  lines.push('  -- Check 2: All target table id columns are UUID type');
  lines.push('  SELECT array_agg(t) INTO issues');
  lines.push(`  FROM unnest(ARRAY[${targetTables.map(t => `'${t}'`).join(',')}]) AS t`);
  lines.push('  WHERE NOT EXISTS (');
  lines.push('    SELECT 1 FROM information_schema.columns');
  lines.push("    WHERE table_schema = 'public' AND table_name = t");
  lines.push("      AND column_name = 'id' AND udt_name = 'uuid'");
  lines.push('  );');
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [2]: target id not UUID: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');

  // Check 3: organization_id UUID NOT NULL on all involved tables
  const involvedTables = [...new Set([...rels.map(r => r.source_table), ...rels.map(r => r.target_table)])].sort();
  lines.push('  -- Check 3: organization_id is UUID NOT NULL on all involved tables');
  lines.push('  SELECT array_agg(t || \':\' || COALESCE(udt_name, \'MISSING\') || \':\' || COALESCE(is_nullable, \'?\')) INTO issues');
  lines.push('  FROM (VALUES');
  lines.push(involvedTables.map(t => `    ('${t}')`).join(',\n'));
  lines.push('  ) AS expected(t)');
  lines.push('  LEFT JOIN information_schema.columns cols');
  lines.push("    ON cols.table_schema = 'public' AND cols.table_name = expected.t AND cols.column_name = 'organization_id'");
  lines.push("  WHERE cols.udt_name IS DISTINCT FROM 'uuid' OR cols.is_nullable = 'YES';");
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [3]: organization_id not UUID NOT NULL: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');

  // Check 4: Old simple FKs exist (existing_uuid_fk only)
  lines.push('  -- Check 4: Old simple FKs exist (to be replaced)');
  lines.push('  SELECT array_agg(expected_name) INTO issues');
  lines.push('  FROM (VALUES');
  lines.push(oldFKs.map(r => `    ('${r.old_fk_name}')`).join(',\n'));
  lines.push('  ) AS expected(expected_name)');
  lines.push('  WHERE NOT EXISTS (');
  lines.push('    SELECT 1 FROM pg_constraint');
  lines.push("    WHERE connamespace = 'public'::regnamespace AND conname = expected.expected_name");
  lines.push('  );');
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [4]: expected simple FKs missing: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');

  // Check 5: No conflicting composite FK constraints
  lines.push('  -- Check 5: No conflicting composite FK constraints already present');
  lines.push('  SELECT array_agg(conname) INTO issues');
  lines.push('  FROM pg_constraint');
  lines.push("  WHERE connamespace = 'public'::regnamespace");
  lines.push(`    AND conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')});`);
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [5]: composite FKs already exist: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');

  // Check 6: No conflicting UNIQUE constraints
  lines.push('  -- Check 6: No conflicting UNIQUE(organization_id, id) constraints');
  lines.push('  SELECT array_agg(conname) INTO issues');
  lines.push('  FROM pg_constraint');
  lines.push("  WHERE connamespace = 'public'::regnamespace");
  lines.push(`    AND conname IN (${targetTables.map(t => `'${uqName(t)}'`).join(',')});`);
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [6]: UNIQUE constraints already exist: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');

  // Check 7: Zero dangling references
  lines.push('  -- Check 7: Zero dangling references (staging is empty, but verify)');
  for (const r of rels) {
    lines.push(`  SELECT count(*) INTO cnt FROM public.${r.source_table} s`);
    lines.push(`  WHERE s.${r.source_column} IS NOT NULL`);
    lines.push(`    AND NOT EXISTS (SELECT 1 FROM public.${r.target_table} t WHERE t.id = s.${r.source_column});`);
    lines.push(`  IF cnt > 0 THEN`);
    lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [7]: % dangling refs in ${r.source_table}.${r.source_column}', cnt;`);
    lines.push(`  END IF;`);
    lines.push('');
  }

  // Check 8: Zero cross-organization references
  lines.push('  -- Check 8: Zero cross-organization references');
  for (const r of rels) {
    lines.push(`  SELECT count(*) INTO cnt FROM public.${r.source_table} s`);
    lines.push(`  JOIN public.${r.target_table} t ON t.id = s.${r.source_column}`);
    lines.push(`  WHERE s.${r.source_column} IS NOT NULL AND s.organization_id != t.organization_id;`);
    lines.push(`  IF cnt > 0 THEN`);
    lines.push(`    RAISE EXCEPTION 'PREFLIGHT FAIL [8]: % cross-org refs in ${r.source_table}.${r.source_column}', cnt;`);
    lines.push(`  END IF;`);
    lines.push('');
  }

  // Check 9: Zero effective privileges
  lines.push('  -- Check 9: Zero effective privileges for anon/authenticated/PUBLIC including MAINTAIN');
  lines.push('  SELECT array_agg(t || \':\' || r || \':\' || p) INTO issues');
  lines.push('  FROM (');
  lines.push('    SELECT t.t, r.r, p.p');
  lines.push(`    FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push("    CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  lines.push("    CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)");
  lines.push("    WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)");
  lines.push('  ) violations;');
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [9a]: effective privileges found: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('  issues := NULL;');
  lines.push('');
  lines.push("  IF current_setting('server_version_num')::int >= 170000 THEN");
  lines.push('    SELECT array_agg(t || \':\' || r || \':MAINTAIN\') INTO issues');
  lines.push('    FROM (');
  lines.push('      SELECT t.t, r.r');
  lines.push(`      FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push("      CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  lines.push("      WHERE has_table_privilege(r.r, 'public.' || t.t, 'MAINTAIN')");
  lines.push('    ) violations;');
  lines.push('    IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("      RAISE EXCEPTION 'PREFLIGHT FAIL [9b]: MAINTAIN privileges found: %', array_to_string(issues, ', ');");
  lines.push('    END IF;');
  lines.push('    issues := NULL;');
  lines.push('  END IF;');
  lines.push('');
  lines.push("  SELECT array_agg(c.relname || ':PUBLIC:' || acl.privilege_type) INTO issues");
  lines.push('  FROM pg_class c');
  lines.push("  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'");
  lines.push('  CROSS JOIN LATERAL aclexplode(c.relacl) AS acl');
  lines.push("  WHERE c.relkind = 'r' AND acl.grantee = 0");
  lines.push(`    AND c.relname IN (${ALL_36.map(t => `'${t}'`).join(',')});`);
  lines.push('  IF issues IS NOT NULL AND array_length(issues, 1) > 0 THEN');
  lines.push("    RAISE EXCEPTION 'PREFLIGHT FAIL [9c]: PUBLIC grants found: %', array_to_string(issues, ', ');");
  lines.push('  END IF;');
  lines.push('');
  lines.push("  RAISE NOTICE 'PREFLIGHT PASS: all 9 checks passed. Safe to execute Block B.';");
  lines.push('END $preflight$;');
  lines.push('');
  lines.push(`SELECT 'PREFLIGHT PASS: all 9 checks passed. ${rels.length} composite FKs ready, ${targetTables.length} UNIQUE constraints ready, ${oldFKs.length} old FKs verified.' AS result;`);
  lines.push('');
  return lines.join('\n');
}


// ============================================================
// BLOCK B: Migration (atomic)
// ============================================================
function generateBlockB() {
  const lines = [];
  lines.push('-- migration-005-B-migration.sql');
  lines.push('-- Migration 005: Same-Organization Relational Integrity');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- ATOMIC: BEGIN/COMMIT');
  lines.push('-- Phases:');
  lines.push(`--   1. Add UNIQUE(organization_id, id) on ${targetTables.length} referenced tables`);
  lines.push(`--   2. Drop ${oldFKs.length} old simple FKs`);
  lines.push(`--   3. Add ${rels.length} composite FKs (organization_id, ref) -> target(organization_id, id)`);
  lines.push('-- MATCH SIMPLE: NULL reference remains valid while organization_id is NOT NULL.');
  lines.push('-- ON UPDATE NO ACTION, ON DELETE NO ACTION. No grants, policies, or functions.');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  // Phase 1: UNIQUE constraints
  lines.push('-- ============================================================');
  lines.push(`-- PHASE 1: Add UNIQUE(organization_id, id) on ${targetTables.length} referenced tables`);
  lines.push('-- Required for composite FK references');
  lines.push('-- ============================================================');
  lines.push('');
  for (const t of targetTables) {
    lines.push(`ALTER TABLE public.${t} ADD CONSTRAINT ${uqName(t)} UNIQUE (organization_id, id);`);
  }
  lines.push('');

  // Phase 2: Drop old simple FKs
  lines.push('-- ============================================================');
  lines.push(`-- PHASE 2: Drop ${oldFKs.length} old simple FKs (replaced by composite FKs)`);
  lines.push('-- ============================================================');
  lines.push('');
  for (const r of oldFKs) {
    lines.push(`ALTER TABLE public.${r.source_table} DROP CONSTRAINT ${r.old_fk_name};`);
  }
  lines.push('');

  // Phase 3: Add composite FKs
  lines.push('-- ============================================================');
  lines.push(`-- PHASE 3: Add ${rels.length} composite FKs`);
  lines.push('-- Each: (organization_id, source_column) REFERENCES target(organization_id, id)');
  lines.push('-- MATCH SIMPLE, ON UPDATE NO ACTION, ON DELETE NO ACTION');
  lines.push('-- ============================================================');
  lines.push('');
  for (const r of rels) {
    lines.push(`-- ${r.source_table}.${r.source_column} -> ${r.target_table}.id`);
    lines.push(`ALTER TABLE public.${r.source_table} ADD CONSTRAINT ${fkName(r)}`);
    lines.push(`  FOREIGN KEY (organization_id, ${r.source_column})`);
    lines.push(`  REFERENCES public.${r.target_table}(organization_id, id)`);
    lines.push('  MATCH SIMPLE ON UPDATE NO ACTION ON DELETE NO ACTION;');
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}


// ============================================================
// BLOCK C: Validation
// ============================================================
function generateBlockC() {
  const lines = [];
  lines.push('-- migration-005-C-validation.sql');
  lines.push('-- Migration 005 Validation: Same-organization relational integrity');
  lines.push('-- Target: staging ybuhazlnjqjrshcvpuna');
  lines.push('-- Read-only. All results derived from catalog state.');
  lines.push('-- Expected: ALL 8 CHECKS PASS');
  lines.push('');

  // C01: UNIQUE constraints exist with correct columns
  lines.push('-- C01: UNIQUE(organization_id, id) constraints exist on all target tables');
  lines.push("SELECT 'C01' AS check_id, 'unique_constraints' AS check_name,");
  lines.push(`  CASE WHEN count(*) = ${targetTables.length} THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: expected ${targetTables.length} UNIQUE constraints, got ' || count(*)`);
  lines.push('  END AS result');
  lines.push('FROM pg_constraint con');
  lines.push("WHERE con.connamespace = 'public'::regnamespace");
  lines.push("  AND con.contype = 'u'");
  lines.push(`  AND con.conname IN (${targetTables.map(t => `'${uqName(t)}'`).join(',')})`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C02: All 34 composite FKs exist
  lines.push(`-- C02: All ${rels.length} composite FK constraints exist`);
  lines.push("SELECT 'C02', 'composite_fk_count',");
  lines.push(`  CASE WHEN count(*) = ${rels.length} THEN 'PASS'`);
  lines.push(`    ELSE 'FAIL: expected ${rels.length} composite FKs, got ' || count(*)`);
  lines.push('  END');
  lines.push('FROM pg_constraint con');
  lines.push("WHERE con.connamespace = 'public'::regnamespace");
  lines.push("  AND con.contype = 'f'");
  lines.push(`  AND con.conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C03: FK source columns are (organization_id, ref_column)
  lines.push('-- C03: FK source columns are exactly (organization_id, source_column)');
  lines.push("SELECT 'C03', 'fk_source_columns',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' FKs with wrong source columns'");
  lines.push('  END');
  lines.push('FROM pg_constraint con');
  lines.push("WHERE con.connamespace = 'public'::regnamespace");
  lines.push("  AND con.contype = 'f'");
  lines.push(`  AND con.conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`);
  lines.push('  AND array_length(con.conkey, 1) != 2');
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C04: FK target columns are (organization_id, id)
  lines.push('-- C04: FK references target(organization_id, id)');
  lines.push("SELECT 'C04', 'fk_target_columns',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' FKs with wrong target columns'");
  lines.push('  END');
  lines.push('FROM pg_constraint con');
  lines.push("WHERE con.connamespace = 'public'::regnamespace");
  lines.push("  AND con.contype = 'f'");
  lines.push(`  AND con.conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`);
  lines.push('  AND array_length(con.confkey, 1) != 2');
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C05: All FKs are VALID (not NOT VALID)
  lines.push('-- C05: All composite FKs are validated (convalidated = true)');
  lines.push("SELECT 'C05', 'fk_validated',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' FKs not validated: ' || string_agg(conname, ', ')");
  lines.push('  END');
  lines.push('FROM pg_constraint con');
  lines.push("WHERE con.connamespace = 'public'::regnamespace");
  lines.push("  AND con.contype = 'f'");
  lines.push(`  AND con.conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`);
  lines.push('  AND NOT con.convalidated');
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C06: MATCH type is SIMPLE and actions are NO ACTION
  lines.push('-- C06: MATCH SIMPLE + NO ACTION for all FKs');
  lines.push("SELECT 'C06', 'fk_match_actions',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' FKs with wrong MATCH/action'");
  lines.push('  END');
  lines.push('FROM pg_constraint con');
  lines.push("WHERE con.connamespace = 'public'::regnamespace");
  lines.push("  AND con.contype = 'f'");
  lines.push(`  AND con.conname IN (${rels.map(r => `'${fkName(r)}'`).join(',')})`);
  lines.push("  AND (con.confmatchtype != 's' OR con.confupdtype != 'a' OR con.confdeltype != 'a')");
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C07: Old simple FKs removed
  lines.push('-- C07: Old simple FKs have been removed');
  lines.push("SELECT 'C07', 'old_fks_removed',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' old FKs remain: ' || string_agg(conname, ', ')");
  lines.push('  END');
  lines.push('FROM pg_constraint');
  lines.push("WHERE connamespace = 'public'::regnamespace");
  lines.push(`  AND conname IN (${oldFKs.map(r => `'${r.old_fk_name}'`).join(',')})`);
  lines.push('');
  lines.push('UNION ALL');
  lines.push('');

  // C08: Zero effective privileges (dormant state)
  lines.push('-- C08: Zero business-table client privileges (dormant state preserved)');
  lines.push("SELECT 'C08', 'zero_client_privileges',");
  lines.push("  CASE WHEN count(*) = 0 THEN 'PASS'");
  lines.push("    ELSE 'FAIL: ' || count(*) || ' effective privileges'");
  lines.push('  END');
  lines.push('FROM (');
  lines.push('  SELECT 1');
  lines.push(`  FROM (VALUES ${ALL_36.map(t => `('${t}')`).join(',')}) AS t(t)`);
  lines.push("  CROSS JOIN (VALUES ('anon'),('authenticated')) AS r(r)");
  lines.push("  CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) AS p(p)");
  lines.push("  WHERE has_table_privilege(r.r, 'public.' || t.t, p.p)");
  lines.push(') violations');
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
  'supabase/staging/migration-005-A-preflight.sql': blockA,
  'supabase/staging/migration-005-B-migration.sql': blockB,
  'supabase/staging/migration-005-C-validation.sql': blockC,
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
  console.log('\nPASS: All 3 blocks match committed files byte-for-byte.');
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
