#!/usr/bin/env node
/**
 * Deterministic Migration 003 Block C SQL Generator (v3)
 * Reads docs/authorization-manifest.json → writes supabase/staging/migration-003-C-validation.sql
 * 
 * Produces expression-level validation using pg_policy + pg_get_expr().
 * Normalizes expressions before comparison to handle PostgreSQL internal formatting.
 * Includes validation fixtures proving normalization correctness.
 * 
 * Usage: node scripts/generate-migration-003-C.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('docs/authorization-manifest.json', 'utf8'));
const policies = manifest.business_policies;
const immutableTables = ['activity_log','attendance','bank_entries','cash_entries','fuel_entries','notifications','purchases','sales'];
const fnManagedTables = ['trips','invoices','payments','claims','approvals','leave_requests','ledger_accounts'];

const allTables = [...new Set(policies.map(p => p.table))].sort();

const CMD_ORDER = { SELECT: 0, INSERT: 1, UPDATE: 2, DELETE: 3 };
const sorted = [...policies].sort((a, b) => {
  const tc = a.table.localeCompare(b.table);
  if (tc !== 0) return tc;
  return CMD_ORDER[a.command] - CMD_ORDER[b.command];
});

function esc(s) {
  if (s === null || s === undefined) return '';
  return s.replace(/'/g, "''");
}

const valuesRows = sorted.map((p, i) => {
  const using = esc(p.using_sql || '');
  const check = esc(p.with_check_sql || '');
  const comma = i < sorted.length - 1 ? ',' : '';
  return `    ('${p.policy_name}', '${p.table}', '${p.command}', '${using}', '${check}')${comma}`;
}).join('\n');

const businessTablesValues = allTables.map(t => `    ('${t}')`).join(',\n');
const policyCount = policies.length;
const selectCount = policies.filter(p => p.command === 'SELECT').length;
const insertCount = policies.filter(p => p.command === 'INSERT').length;
const updateCount = policies.filter(p => p.command === 'UPDATE').length;
const deleteCount = policies.filter(p => p.command === 'DELETE').length;

const sql = `-- migration-003-C-validation.sql
-- Migration 003 Validation: Expression-level verification of ${policyCount} business RLS policies
-- Target: staging ybuhazlnjqjrshcvpuna
-- Read-only: no persistent changes (pg_temp function auto-drops at session end)
-- Uses pg_policy + pg_class + pg_namespace + pg_get_expr() for behavioral validation
-- Normalizes expressions to handle PostgreSQL internal formatting differences
-- Expected: ALL 16 CHECKS PASS
-- Generated deterministically from docs/authorization-manifest.json

-- ============================================================
-- Normalization function (Fix 1): handles ::text, ::text[], public. qualification,
-- redundant parentheses (safe balanced-pair stripping), whitespace, case.
-- ============================================================
CREATE OR REPLACE FUNCTION pg_temp.normalize_expr(expr TEXT)
RETURNS TEXT AS $$
DECLARE
  inner_expr TEXT;
  depth INT;
  ch TEXT;
  i INT;
  balanced BOOLEAN;
BEGIN
  IF expr IS NULL OR expr = '' THEN RETURN ''; END IF;
  expr := btrim(expr);
  -- Safe outer-parenthesis stripping (only matching balanced pairs)
  LOOP
    EXIT WHEN length(expr) <= 2;
    EXIT WHEN left(expr, 1) != '(' OR right(expr, 1) != ')';
    inner_expr := substr(expr, 2, length(expr) - 2);
    depth := 0; balanced := true;
    FOR i IN 1..length(inner_expr) LOOP
      ch := substr(inner_expr, i, 1);
      IF ch = '(' THEN depth := depth + 1;
      ELSIF ch = ')' THEN depth := depth - 1; END IF;
      IF depth < 0 THEN balanced := false; EXIT; END IF;
    END LOOP;
    EXIT WHEN NOT balanced OR depth != 0;
    expr := inner_expr;
    expr := btrim(expr);
  END LOOP;
  -- Remove type casts: ::text[] first, then ::text (order matters)
  expr := regexp_replace(expr, '::text\\[\\]', '', 'g');
  expr := regexp_replace(expr, '::text', '', 'g');
  -- Remove redundant parentheses around ARRAY constructors.
  -- After cast removal, pg_get_expr leaves (ARRAY[...]) where source has ARRAY[...].
  -- Pattern: '(' immediately before 'ARRAY[' with matching ')' after ']'
  -- Safe because ARRAY constructor content never contains unbalanced brackets.
  expr := regexp_replace(expr, '\\(ARRAY\\[([^\\]]*)\\]\\)', 'ARRAY[\\1]', 'g');
  -- Remove redundant parentheses around simple column references: (column_name) → column_name
  -- Matches (word) where word is a simple identifier (letters, digits, underscore)
  expr := regexp_replace(expr, '\\(([a-z_][a-z0-9_]*)\\)', '\\1', 'g');
  -- Remove redundant parentheses around simple equality comparisons:
  -- (identifier = 'literal') → identifier = 'literal'
  expr := regexp_replace(expr, '\\(([a-z_][a-z0-9_]* = ''[^'']*'')\\)', '\\1', 'g');
  -- Normalize function qualification: strip optional 'public.' prefix on known functions
  expr := replace(expr, 'public.is_organization_member', 'is_organization_member');
  expr := replace(expr, 'public.has_organization_role', 'has_organization_role');
  -- Collapse whitespace
  expr := regexp_replace(expr, '\\s+', ' ', 'g');
  -- Normalize comma spacing: remove spaces after commas for consistent comparison
  expr := replace(expr, ', ', ',');
  -- Lowercase
  expr := lower(btrim(expr));
  RETURN expr;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- Validation fixtures: deterministic tests proving normalization correctness.
-- Equivalent expressions MUST match; different roles/values MUST NOT.
-- ============================================================
DO $fixtures$
DECLARE
  src TEXT; pgstyle TEXT; wrong TEXT;
BEGIN
  -- Fixture 1: source vs pg_get_expr style (schema-qualified, casts, parens)
  src := 'is_organization_member(organization_id) AND has_organization_role(organization_id, ARRAY[''admin'',''owner''])';
  pgstyle := '(public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, (ARRAY[''admin''::text, ''owner''::text])::text[]))';
  IF pg_temp.normalize_expr(src) != pg_temp.normalize_expr(pgstyle) THEN
    RAISE EXCEPTION 'normalize_expr fixture 1 FAILED: equivalent expressions do not match';
  END IF;

  -- Fixture 2: different role array must NOT match
  wrong := 'is_organization_member(organization_id) AND has_organization_role(organization_id, ARRAY[''admin'',''dispatcher''])';
  IF pg_temp.normalize_expr(src) = pg_temp.normalize_expr(wrong) THEN
    RAISE EXCEPTION 'normalize_expr fixture 2 FAILED: different roles incorrectly matched';
  END IF;

  -- Fixture 3: different DELETE status condition must NOT match
  src := 'is_organization_member(organization_id) AND has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''pending''';
  wrong := 'is_organization_member(organization_id) AND has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''draft''';
  IF pg_temp.normalize_expr(src) = pg_temp.normalize_expr(wrong) THEN
    RAISE EXCEPTION 'normalize_expr fixture 3 FAILED: different status values incorrectly matched';
  END IF;

  -- Fixture 4: pg_get_expr style with cast and parens on status condition must match source
  src := 'is_organization_member(organization_id) AND has_organization_role(organization_id, ARRAY[''organization_owner'',''admin'']) AND status = ''pending''';
  pgstyle := '(public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, (ARRAY[''organization_owner''::text, ''admin''::text])::text[]) AND ((status)::text = ''pending''::text))';
  IF pg_temp.normalize_expr(src) != pg_temp.normalize_expr(pgstyle) THEN
    RAISE EXCEPTION 'normalize_expr fixture 4 FAILED: DELETE status condition with casts/parens does not match source';
  END IF;

  RAISE NOTICE 'normalize_expr: all 4 validation fixtures passed';
END $fixtures$;

WITH expected_policies(policy_name, tablename, cmd, expected_using, expected_check) AS (
  VALUES
${valuesRows}
),

installed_policies AS (
  SELECT
    pol.polname::text AS policy_name,
    c.relname::text AS tablename,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END AS cmd,
    CASE WHEN pol.polpermissive THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
    pol.polroles::regrole[]::text[] AS roles_arr,
    COALESCE(pg_get_expr(pol.polqual, pol.polrelid), '') AS actual_using,
    COALESCE(pg_get_expr(pol.polwithcheck, pol.polrelid), '') AS actual_check
  FROM pg_policy pol
  JOIN pg_class c ON c.oid = pol.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
${businessTablesValues}
    )
),

business_tables(t) AS (
  VALUES
${businessTablesValues}
)

-- C01: Missing policies
SELECT 'C01' AS check_id, 'missing_policies' AS check_name,
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' missing: ' || string_agg(ep.policy_name, ', ' ORDER BY ep.policy_name)
  END AS result
FROM expected_policies ep
LEFT JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
WHERE ip.policy_name IS NULL

UNION ALL

-- C02: Extra policies (any name, not just role_%)
SELECT 'C02', 'extra_policies',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' extra: ' || string_agg(ip.policy_name || ' ON ' || ip.tablename, ', ' ORDER BY ip.policy_name)
  END
FROM installed_policies ip
LEFT JOIN expected_policies ep ON ep.policy_name = ip.policy_name AND ep.tablename = ip.tablename
WHERE ep.policy_name IS NULL

UNION ALL

-- C03: All PERMISSIVE
SELECT 'C03', 'all_permissive',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' non-permissive: ' || string_agg(ip.policy_name, ', ')
  END
FROM installed_policies ip WHERE ip.permissive != 'PERMISSIVE'

UNION ALL

-- C04: Roles exactly {authenticated}
SELECT 'C04', 'roles_exactly_authenticated',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' wrong: ' || string_agg(ip.policy_name || '=' || array_to_string(ip.roles_arr,','), '; ')
  END
FROM installed_policies ip WHERE NOT (ip.roles_arr = ARRAY['authenticated']::text[])

UNION ALL

-- C05: Command types match
SELECT 'C05', 'command_type_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ': ' || string_agg(ep.policy_name || '(exp=' || ep.cmd || ',act=' || ip.cmd || ')', '; ')
  END
FROM expected_policies ep
JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
WHERE ip.cmd != ep.cmd

UNION ALL

-- C06: SELECT normalized expression match (USING matches, no WITH CHECK)
SELECT 'C06', 'select_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_check != '' THEN ep.policy_name || ': unexpected WITH CHECK'
      WHEN pg_temp.normalize_expr(ip.actual_using) != pg_temp.normalize_expr(ep.expected_using)
        THEN ep.policy_name || ': USING mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'SELECT'
) sub WHERE detail IS NOT NULL

UNION ALL

-- C07: INSERT normalized expression match (WITH CHECK matches, no USING)
SELECT 'C07', 'insert_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_using != '' THEN ep.policy_name || ': unexpected USING'
      WHEN pg_temp.normalize_expr(ip.actual_check) != pg_temp.normalize_expr(ep.expected_check)
        THEN ep.policy_name || ': WITH CHECK mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'INSERT'
) sub WHERE detail IS NOT NULL

UNION ALL

-- C08: UPDATE expression match (both USING and WITH CHECK validated)
-- NOTE: organization_id immutability is enforced by the BEFORE UPDATE trigger
-- (enforce_immutable_organization_id) and future column-level grants in Migration 013,
-- NOT by equal USING/WITH CHECK expressions alone. Equal expressions here verify
-- only that the same org-membership+role check applies to both old and new rows.
SELECT 'C08', 'update_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_using = '' THEN ep.policy_name || ': missing USING'
      WHEN ip.actual_check = '' THEN ep.policy_name || ': missing WITH CHECK'
      WHEN pg_temp.normalize_expr(ip.actual_using) != pg_temp.normalize_expr(ep.expected_using)
        THEN ep.policy_name || ': USING mismatch'
      WHEN pg_temp.normalize_expr(ip.actual_check) != pg_temp.normalize_expr(ep.expected_check)
        THEN ep.policy_name || ': WITH CHECK mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'UPDATE'
) sub WHERE detail IS NOT NULL

UNION ALL

-- C09: DELETE expression match (USING with exact role arrays and status conditions)
SELECT 'C09', 'delete_expression_match',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' mismatches: ' || string_agg(detail, '; ')
  END
FROM (
  SELECT ep.policy_name,
    CASE
      WHEN ip.actual_check != '' THEN ep.policy_name || ': unexpected WITH CHECK'
      WHEN pg_temp.normalize_expr(ip.actual_using) != pg_temp.normalize_expr(ep.expected_using)
        THEN ep.policy_name || ': USING mismatch'
      ELSE NULL
    END AS detail
  FROM expected_policies ep
  JOIN installed_policies ip ON ip.policy_name = ep.policy_name AND ip.tablename = ep.tablename
  WHERE ep.cmd = 'DELETE'
) sub WHERE detail IS NOT NULL

UNION ALL

-- C10: Immutable tables: no UPDATE/DELETE policies
SELECT 'C10', 'immutable_tables_protected',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' forbidden: ' || string_agg(ip.policy_name || '(' || ip.cmd || ' ON ' || ip.tablename || ')', ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN (${immutableTables.map(t => `'${t}'`).join(',')})
  AND ip.cmd IN ('UPDATE', 'DELETE')

UNION ALL

-- C11: Function-managed tables: no UPDATE/DELETE policies
SELECT 'C11', 'function_managed_protected',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' forbidden: ' || string_agg(ip.policy_name || '(' || ip.cmd || ' ON ' || ip.tablename || ')', ', ')
  END
FROM installed_policies ip
WHERE ip.tablename IN (${fnManagedTables.map(t => `'${t}'`).join(',')})
  AND ip.cmd IN ('UPDATE', 'DELETE')

UNION ALL

-- C12: No driver/customer role in expressions
SELECT 'C12', 'no_driver_customer_roles',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ': ' || string_agg(ip.policy_name, ', ')
  END
FROM installed_policies ip
WHERE (ip.actual_using LIKE '%''driver''%' OR ip.actual_using LIKE '%''customer''%'
  OR ip.actual_check LIKE '%''driver''%' OR ip.actual_check LIKE '%''customer''%')

UNION ALL

-- C13: No anon-targeted policies
SELECT 'C13', 'no_anon_business_policies',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' anon policies'
  END
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (SELECT t FROM business_tables)
  AND pol.polroles @> ARRAY[(SELECT oid FROM pg_roles WHERE rolname = 'anon')]::oid[]

UNION ALL

-- C14: Immutable org_id trigger on all 36 tables (enabled, BEFORE UPDATE, FOR EACH ROW,
-- references enforce_immutable_organization_id function, non-internal)
SELECT 'C14', 'immutable_org_id_triggers',
  CASE WHEN count(*) = 0 THEN 'PASS'
    ELSE 'FAIL: ' || count(*) || ' tables with trigger issues: ' || string_agg(detail, ', ')
  END
FROM (
  SELECT bt.t,
    CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM pg_trigger tr
        JOIN pg_class c ON c.oid = tr.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = bt.t
          AND tr.tgname = 'enforce_immutable_organization_id'
          AND tr.tgenabled = 'O'
          AND NOT tr.tgisinternal
          AND (tr.tgtype::int & 2) = 2   -- BEFORE
          AND (tr.tgtype::int & 16) = 16  -- UPDATE
          AND (tr.tgtype::int & 1) = 1    -- FOR EACH ROW
          AND tr.tgfoid = to_regprocedure('public.enforce_immutable_organization_id()')::oid
      ) THEN bt.t
      ELSE NULL
    END AS detail
  FROM (SELECT t FROM business_tables) bt
) sub WHERE detail IS NOT NULL

UNION ALL

-- C15: Total count = ${policyCount}
SELECT 'C15', 'total_count_${policyCount}',
  CASE WHEN count(*) = ${policyCount} THEN 'PASS'
    ELSE 'FAIL: expected ${policyCount}, got ' || count(*)
  END
FROM installed_policies ip

UNION ALL

-- C16: Platform policies intact (>= 10)
SELECT 'C16', 'platform_policies_intact',
  CASE WHEN count(*) >= 10 THEN 'PASS'
    ELSE 'FAIL: expected >= 10, got ' || count(*)
  END
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('organizations','organization_members','organization_settings',
                    'organization_invitations','user_profiles','platform_admins')

ORDER BY check_id;
`;

writeFileSync('supabase/staging/migration-003-C-validation.sql', sql);
console.log(`Generated: supabase/staging/migration-003-C-validation.sql`);
console.log(`  Checks: 16`);
console.log(`  Expected policies: ${policyCount}`);
console.log(`  Size: ${Buffer.byteLength(sql)} bytes`);
