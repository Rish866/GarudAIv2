#!/usr/bin/env node
/**
 * Deterministic Authorization Manifest Generator (v3)
 * Reads security/authorization-source.yaml → writes docs/authorization-manifest.json
 * 
 * REJECTION RULES (Fix 7):
 * 1. UPDATE access on immutable tables → rejected
 * 2. organization_id in update_cols → rejected
 * 3. Unsupported driver/customer roles → rejected
 * 4. Wildcard '*' in UPDATE allowed_columns → rejected
 * 5. Policies missing membership or canonical-role checks → rejected (structural)
 */
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';

const src = parse(readFileSync('security/authorization-source.yaml', 'utf8'));
const bt = src.business_tables;
const errors = [];
const unsupported = src.canonical_roles.unsupported_blocked || ['driver', 'customer'];
const immutableTables = src.computed_totals.immutable_tables || [];

// ===== REJECTION RULE CHECKS =====

for (const [table, def] of Object.entries(bt)) {
  // Rule 1: UPDATE on immutable tables
  if (def.immutable && def.update) {
    errors.push(`REJECT: ${table} is immutable but has UPDATE roles defined`);
  }

  // Rule 2: organization_id in update_cols
  if (def.update_cols && def.update_cols.includes('organization_id')) {
    errors.push(`REJECT: ${table} has organization_id in update_cols (immutable tenant column)`);
  }

  // Rule 3: Unsupported roles in any access list
  for (const field of ['select', 'insert', 'update']) {
    const roles = def[field];
    if (roles && Array.isArray(roles)) {
      for (const role of roles) {
        if (unsupported.includes(role)) {
          errors.push(`REJECT: ${table}.${field} contains unsupported role '${role}'`);
        }
      }
    }
  }
  if (def.delete && def.delete.roles) {
    for (const role of def.delete.roles) {
      if (unsupported.includes(role)) {
        errors.push(`REJECT: ${table}.delete contains unsupported role '${role}'`);
      }
    }
  }

  // Rule 4: Wildcard '*' in UPDATE allowed_columns
  if (def.update && (!def.update_cols || def.update_cols.includes('*'))) {
    errors.push(`REJECT: ${table} has UPDATE but update_cols is missing or contains wildcard '*' (must be explicit column list)`);
  }

  // Rule 5: Structural - if update defined, roles must be non-empty array
  if (def.update && (!Array.isArray(def.update) || def.update.length === 0)) {
    errors.push(`REJECT: ${table}.update must be a non-empty role array`);
  }
  if (def.select && (!Array.isArray(def.select) || def.select.length === 0)) {
    errors.push(`REJECT: ${table}.select must be a non-empty role array`);
  }
  if (def.insert && (!Array.isArray(def.insert) || def.insert.length === 0)) {
    errors.push(`REJECT: ${table}.insert must be a non-empty role array`);
  }
}

// Also verify immutable_tables list includes tables with immutable: true
for (const [table, def] of Object.entries(bt)) {
  if (def.immutable && !immutableTables.includes(table)) {
    errors.push(`REJECT: ${table} has immutable: true but is not in computed_totals.immutable_tables`);
  }
}

if (errors.length > 0) {
  console.error('MANIFEST GENERATION FAILED — rejection rules violated:\n');
  errors.forEach(e => console.error(`  ${e}`));
  process.exit(1);
}

// ===== POLICY GENERATION =====

function rolesArray(roles) {
  return roles.map(r => `'${r}'`).join(',');
}
function usingExpr(roles) {
  return `public.is_organization_member(organization_id) AND public.has_organization_role(organization_id, ARRAY[${rolesArray(roles)}])`;
}

const policies = [];
const seen = new Set();

for (const [table, def] of Object.entries(bt).sort((a, b) => a[0].localeCompare(b[0]))) {
  // SELECT
  if (def.select) {
    const name = `role_select_${table}`;
    if (seen.has(name)) throw new Error(`Duplicate: ${name}`);
    seen.add(name);
    policies.push({
      schema: 'public', table, table_category: 'business',
      policy_name: name, policy_mode: 'PERMISSIVE',
      postgres_role: 'authenticated', expected_to_roles: 'authenticated',
      command: 'SELECT', using_sql: usingExpr(def.select), with_check_sql: null,
      authorization_basis: 'organization_role', canonical_roles: def.select,
      organization_scope_column: 'organization_id', status_condition: null,
      grant_scope: def.scope || 'columns',
      allowed_columns: def.select_cols || ['*'],
      prohibited_columns: def.prohibited_select || [],
      sensitive_data_strategy: def.sensitive || 'none',
      direct_table_privileges: ['SELECT'],
      audit_mechanism: 'none',
      migration_created: '003', activation_migration: '013'
    });
  }
  // INSERT
  if (def.insert) {
    const name = `role_insert_${table}`;
    if (seen.has(name)) throw new Error(`Duplicate: ${name}`);
    seen.add(name);
    policies.push({
      schema: 'public', table, table_category: 'business',
      policy_name: name, policy_mode: 'PERMISSIVE',
      postgres_role: 'authenticated', expected_to_roles: 'authenticated',
      command: 'INSERT', using_sql: null, with_check_sql: usingExpr(def.insert),
      authorization_basis: 'organization_role', canonical_roles: def.insert,
      organization_scope_column: 'organization_id', status_condition: null,
      grant_scope: def.scope || 'columns',
      allowed_columns: def.select_cols || ['*'],
      prohibited_columns: [],
      sensitive_data_strategy: def.sensitive || 'none',
      direct_table_privileges: ['INSERT'],
      audit_mechanism: def.audit_insert ? 'trigger_after_insert' : 'none',
      migration_created: '003', activation_migration: '013'
    });
  }
  // UPDATE — explicitly excluded columns include organization_id (never granted)
  if (def.update) {
    const name = `role_update_${table}`;
    if (seen.has(name)) throw new Error(`Duplicate: ${name}`);
    seen.add(name);
    const prohibitedUpdate = [...(def.prohibited_update || [])];
    if (!prohibitedUpdate.includes('organization_id')) {
      prohibitedUpdate.push('organization_id');
    }
    if (!prohibitedUpdate.includes('id')) {
      prohibitedUpdate.push('id');
    }
    if (!prohibitedUpdate.includes('created_at')) {
      prohibitedUpdate.push('created_at');
    }
    policies.push({
      schema: 'public', table, table_category: 'business',
      policy_name: name, policy_mode: 'PERMISSIVE',
      postgres_role: 'authenticated', expected_to_roles: 'authenticated',
      command: 'UPDATE', using_sql: usingExpr(def.update), with_check_sql: usingExpr(def.update),
      authorization_basis: 'organization_role', canonical_roles: def.update,
      organization_scope_column: 'organization_id', status_condition: null,
      grant_scope: 'columns',
      allowed_columns: def.update_cols,
      prohibited_columns: prohibitedUpdate,
      sensitive_data_strategy: def.sensitive || 'none',
      direct_table_privileges: ['UPDATE'],
      audit_mechanism: def.audit_update ? 'trigger_after_update' : 'none',
      migration_created: '003', activation_migration: '013'
    });
  }
  // DELETE
  if (def.delete) {
    const d = def.delete;
    const name = `role_delete_${table}`;
    if (seen.has(name)) throw new Error(`Duplicate: ${name}`);
    seen.add(name);
    let usingSql = usingExpr(d.roles);
    if (d.cond) usingSql += ` AND ${d.cond}`;
    policies.push({
      schema: 'public', table, table_category: 'business',
      policy_name: name, policy_mode: 'PERMISSIVE',
      postgres_role: 'authenticated', expected_to_roles: 'authenticated',
      command: 'DELETE', using_sql: usingSql, with_check_sql: null,
      authorization_basis: 'organization_role', canonical_roles: d.roles,
      organization_scope_column: 'organization_id', status_condition: d.cond || null,
      grant_scope: 'columns',
      allowed_columns: [],
      prohibited_columns: [],
      sensitive_data_strategy: 'none',
      direct_table_privileges: ['DELETE'],
      audit_mechanism: 'none',
      migration_created: '003', activation_migration: '013'
    });
  }
}

const manifest = {
  metadata: src.metadata,
  canonical_roles: src.canonical_roles,
  business_policies: policies,
  computed_totals: {
    business_policy_count: policies.length,
    select_count: policies.filter(p => p.command === 'SELECT').length,
    insert_count: policies.filter(p => p.command === 'INSERT').length,
    update_count: policies.filter(p => p.command === 'UPDATE').length,
    delete_count: policies.filter(p => p.command === 'DELETE').length,
    tables: Object.keys(bt).length,
    platform_policy_count: 10,
    storage_policy_count: 4,
    function_operation_count: 22,
    total_rls: policies.length + 10 + 4,
  }
};

const json = JSON.stringify(manifest, null, 2);
writeFileSync('docs/authorization-manifest.json', json);
console.log(`Generated: docs/authorization-manifest.json`);
console.log(`  Policies: ${policies.length} (${manifest.computed_totals.select_count}S + ${manifest.computed_totals.insert_count}I + ${manifest.computed_totals.update_count}U + ${manifest.computed_totals.delete_count}D)`);
console.log(`  Rejection rules: 5 checked, 0 violations`);
console.log(`  Size: ${Buffer.byteLength(json)} bytes`);
