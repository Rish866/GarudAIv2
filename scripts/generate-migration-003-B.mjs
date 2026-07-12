#!/usr/bin/env node
/**
 * Deterministic Migration 003 Block B SQL Generator
 * Reads docs/authorization-manifest.json → writes supabase/staging/migration-003-B-migration.sql
 * Produces identical output on every run given the same manifest.
 * 
 * Usage: node scripts/generate-migration-003-B.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('docs/authorization-manifest.json', 'utf8'));
const policies = manifest.business_policies;

const policyCount = manifest.computed_totals.business_policy_count;
const businessTables = Object.keys(manifest.metadata ? {} : {});
// Get all 36 business table names from policies
const allTables = [...new Set(policies.map(p => p.table))].sort();

const header = [
  '-- migration-003-B-migration.sql',
  `-- Migration 003: ${policyCount} role-based business RLS policies + immutable organization_id trigger`,
  '-- Target: staging ybuhazlnjqjrshcvpuna',
  '-- ATOMIC: BEGIN/COMMIT',
  '-- Pattern: role_{command}_{table} TO authenticated',
  '-- Organization scope: is_organization_member + has_organization_role',
  '-- NO grants issued: policies dormant until Migration 013 activates privileges',
  '-- Activation: Migration 013 (single point for all client grants)',
  '-- organization_id: immutable via BEFORE UPDATE trigger (database-enforced)',
  '',
  'BEGIN;',
  '',
  '-- ============================================================',
  '-- PHASE 1: Immutable organization_id trigger',
  '-- Prevents tenant-column reassignment regardless of RLS/grants.',
  '-- This is a defense-in-depth measure: even if a future migration',
  '-- accidentally grants UPDATE on organization_id, the trigger rejects it.',
  '-- ============================================================',
  '',
  'CREATE OR REPLACE FUNCTION public.enforce_immutable_organization_id()',
  'RETURNS TRIGGER AS $fn$',
  'BEGIN',
  '  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN',
  "    RAISE EXCEPTION 'organization_id is immutable and cannot be changed';",
  '  END IF;',
  '  RETURN NEW;',
  'END;',
  '$fn$ LANGUAGE plpgsql;',
  '',
  ...allTables.map(t => 
    `CREATE TRIGGER enforce_immutable_organization_id BEFORE UPDATE ON public.${t}\n` +
    `  FOR EACH ROW EXECUTE FUNCTION public.enforce_immutable_organization_id();`
  ),
  '',
  '-- ============================================================',
  `-- PHASE 2: ${policyCount} RLS policies`,
  '-- ============================================================',
  '',
  '',
].join('\n');

const CMD_ORDER = { SELECT: 0, INSERT: 1, UPDATE: 2, DELETE: 3 };
const sorted = [...policies].sort((a, b) => {
  const tc = a.table.localeCompare(b.table);
  if (tc !== 0) return tc;
  return CMD_ORDER[a.command] - CMD_ORDER[b.command];
});

const body = [];
let currentTable = null;

for (const p of sorted) {
  if (p.table !== currentTable) {
    if (currentTable !== null) body.push('');
    currentTable = p.table;
    body.push(`-- ${p.table}`);
  }
  body.push(`DROP POLICY IF EXISTS "${p.policy_name}" ON public.${p.table};`);
  if (p.command === 'SELECT') {
    body.push(`CREATE POLICY "${p.policy_name}" ON public.${p.table} FOR SELECT TO authenticated`);
    body.push(`  USING (${p.using_sql});`);
  } else if (p.command === 'INSERT') {
    body.push(`CREATE POLICY "${p.policy_name}" ON public.${p.table} FOR INSERT TO authenticated`);
    body.push(`  WITH CHECK (${p.with_check_sql});`);
  } else if (p.command === 'UPDATE') {
    body.push(`CREATE POLICY "${p.policy_name}" ON public.${p.table} FOR UPDATE TO authenticated`);
    body.push(`  USING (${p.using_sql})`);
    body.push(`  WITH CHECK (${p.with_check_sql});`);
  } else if (p.command === 'DELETE') {
    body.push(`CREATE POLICY "${p.policy_name}" ON public.${p.table} FOR DELETE TO authenticated`);
    body.push(`  USING (${p.using_sql});`);
  }
}

const footer = '\n\nCOMMIT;\n';

const sql = header + body.join('\n') + footer;
writeFileSync('supabase/staging/migration-003-B-migration.sql', sql);

console.log(`Generated: supabase/staging/migration-003-B-migration.sql`);
console.log(`  Policies: ${sorted.length}`);
console.log(`  Size: ${Buffer.byteLength(sql)} bytes`);
