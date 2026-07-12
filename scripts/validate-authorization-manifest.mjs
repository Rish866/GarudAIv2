#!/usr/bin/env node
/**
 * Authorization Manifest Validator
 * Validates docs/authorization-manifest.json against invariants.
 */
import { readFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('docs/authorization-manifest.json', 'utf8'));
const errors = [];
const unsupported = ['driver', 'customer'];

function fail(msg) { errors.push(msg); }

const policies = manifest.business_policies;
const totals = manifest.computed_totals;

// 1. Computed totals match actual counts
const actualSel = policies.filter(p => p.command === 'SELECT').length;
const actualIns = policies.filter(p => p.command === 'INSERT').length;
const actualUpd = policies.filter(p => p.command === 'UPDATE').length;
const actualDel = policies.filter(p => p.command === 'DELETE').length;
if (totals.business_policy_count !== policies.length) fail(`Total mismatch: declared ${totals.business_policy_count}, actual ${policies.length}`);
if (totals.select_count !== actualSel) fail(`SELECT mismatch: declared ${totals.select_count}, actual ${actualSel}`);
if (totals.insert_count !== actualIns) fail(`INSERT mismatch: declared ${totals.insert_count}, actual ${actualIns}`);
if (totals.update_count !== actualUpd) fail(`UPDATE mismatch: declared ${totals.update_count}, actual ${actualUpd}`);
if (totals.delete_count !== actualDel) fail(`DELETE mismatch: declared ${totals.delete_count}, actual ${actualDel}`);

// 2. No duplicate policy names
const names = new Set();
for (const p of policies) {
  if (names.has(p.policy_name)) fail(`Duplicate policy: ${p.policy_name}`);
  names.add(p.policy_name);
}

// 3. Command semantics
for (const p of policies) {
  if (['SELECT','UPDATE','DELETE'].includes(p.command) && (!p.using_sql || p.using_sql.length === 0))
    fail(`${p.policy_name}: ${p.command} missing using_sql`);
  if (['INSERT','UPDATE'].includes(p.command) && (!p.with_check_sql || p.with_check_sql.length === 0))
    fail(`${p.policy_name}: ${p.command} missing with_check_sql`);
  if (p.command === 'SELECT' && p.with_check_sql !== null)
    fail(`${p.policy_name}: SELECT must have null with_check_sql`);
  if (p.command === 'INSERT' && p.using_sql !== null)
    fail(`${p.policy_name}: INSERT must have null using_sql`);
  if (p.command === 'DELETE' && p.with_check_sql !== null)
    fail(`${p.policy_name}: DELETE must have null with_check_sql`);
}

// 4. No unsupported roles
for (const p of policies) {
  for (const role of p.canonical_roles) {
    if (unsupported.includes(role))
      fail(`${p.policy_name}: unsupported role '${role}'`);
  }
}

// 5. No anon policies
for (const p of policies) {
  if (p.postgres_role !== 'authenticated')
    fail(`${p.policy_name}: postgres_role must be authenticated, got ${p.postgres_role}`);
}

// 6. All business policies have organization scope
for (const p of policies) {
  if (p.table_category === 'business' && p.organization_scope_column !== 'organization_id')
    fail(`${p.policy_name}: business table missing organization_id scope`);
}

// 7. No NONE policy names
for (const p of policies) {
  if (p.policy_name.startsWith('NONE'))
    fail(`${p.policy_name}: fake NONE policy`);
}

// 8. No placeholder SQL
for (const p of policies) {
  for (const field of ['using_sql', 'with_check_sql']) {
    const val = p[field];
    if (val && (val.includes('...') || val.includes('TODO') || val.includes('placeholder')))
      fail(`${p.policy_name}: placeholder in ${field}`);
  }
}

// 9. Activation migration
for (const p of policies) {
  if (p.activation_migration !== '013')
    fail(`${p.policy_name}: activation must be 013, got ${p.activation_migration}`);
}

// 10. Allowed/prohibited overlap
for (const p of policies) {
  if (p.allowed_columns && p.prohibited_columns) {
    const overlap = p.allowed_columns.filter(c => p.prohibited_columns.includes(c));
    if (overlap.length > 0)
      fail(`${p.policy_name}: allowed/prohibited overlap: ${overlap.join(',')}`);
  }
}

// 11. Sensitive strategy with '*'
for (const p of policies) {
  if (p.allowed_columns && p.allowed_columns.includes('*') && p.sensitive_data_strategy !== 'reviewed_all_safe' && p.sensitive_data_strategy !== 'none')
    fail(`${p.policy_name}: '*' columns requires reviewed_all_safe or none strategy`);
}

// 12. DELETE conditions include role check
for (const p of policies) {
  if (p.command === 'DELETE' && p.using_sql && !p.using_sql.includes('has_organization_role'))
    fail(`${p.policy_name}: DELETE missing role check in using_sql`);
}

// Report
console.log(`Authorization Manifest Validation`);
console.log(`  Policies validated: ${policies.length}`);
console.log(`  Errors found: ${errors.length}`);
if (errors.length > 0) {
  console.log(`\nFAILURES:`);
  errors.forEach(e => console.log(`  - ${e}`));
  process.exit(1);
} else {
  console.log(`  Status: ALL INVARIANTS PASS`);
  console.log(`  Totals: ${actualSel}S + ${actualIns}I + ${actualUpd}U + ${actualDel}D = ${policies.length}`);
  process.exit(0);
}
