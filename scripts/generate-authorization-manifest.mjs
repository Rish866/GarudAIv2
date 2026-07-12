#!/usr/bin/env node
/**
 * Deterministic Authorization Manifest Generator
 * Reads security/authorization-source.yaml → writes docs/authorization-manifest.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';

const src = parse(readFileSync('security/authorization-source.yaml', 'utf8'));
const bt = src.business_tables;

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
  // UPDATE
  if (def.update) {
    const name = `role_update_${table}`;
    if (seen.has(name)) throw new Error(`Duplicate: ${name}`);
    seen.add(name);
    policies.push({
      schema: 'public', table, table_category: 'business',
      policy_name: name, policy_mode: 'PERMISSIVE',
      postgres_role: 'authenticated', expected_to_roles: 'authenticated',
      command: 'UPDATE', using_sql: usingExpr(def.update), with_check_sql: usingExpr(def.update),
      authorization_basis: 'organization_role', canonical_roles: def.update,
      organization_scope_column: 'organization_id', status_condition: null,
      grant_scope: 'columns',
      allowed_columns: def.update_cols || ['*'],
      prohibited_columns: def.prohibited_update || [],
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
console.log(`  Size: ${Buffer.byteLength(json)} bytes`);
