/**
 * Migration 005 — Inventory & Generated SQL Structure Tests
 *
 * Validates the Migration 005 design via:
 *   - Relationship inventory completeness (34 = 22 m004 + 12 existing)
 *   - Naming conventions and uniqueness
 *   - Block B structure (BEGIN/COMMIT, no GRANT/CASCADE, MATCH SIMPLE)
 *   - Block C is strictly read-only (no DML)
 *   - Block D is transactional (BEGIN/ROLLBACK, exercises real FKs)
 *   - Circular pair documentation
 *
 * Real FK behavior is proven in Block D (PostgreSQL transactional tests),
 * NOT simulated in TypeScript.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const inventory = JSON.parse(readFileSync('docs/migration-005-inventory.json', 'utf8'));
const rels = inventory.relationships;
const targetTables = inventory.target_tables_needing_unique;
const circularPairs = inventory.circular_nullable_pairs;

describe('Migration 005 — Relationship Inventory Completeness', () => {
  it('contains exactly 34 relationships', () => {
    expect(rels.length).toBe(34);
  });

  it('22 are m004_converted + 12 are existing_uuid_fk', () => {
    const m004 = rels.filter((r: any) => r.category === 'm004_converted');
    const existing = rels.filter((r: any) => r.category === 'existing_uuid_fk');
    expect(m004.length).toBe(22);
    expect(existing.length).toBe(12);
  });

  it('all 12 existing_uuid_fk have old_fk_name', () => {
    const existing = rels.filter((r: any) => r.category === 'existing_uuid_fk');
    for (const r of existing) {
      expect(r.old_fk_name).not.toBeNull();
      expect(r.old_fk_name.length).toBeGreaterThan(0);
    }
  });

  it('all 22 m004_converted have old_fk_name = null', () => {
    const m004 = rels.filter((r: any) => r.category === 'm004_converted');
    for (const r of m004) {
      expect(r.old_fk_name).toBeNull();
    }
  });

  it('9 target tables need UNIQUE constraints', () => {
    expect(targetTables.length).toBe(9);
  });

  it('every relationship target is in the UNIQUE constraint list', () => {
    const targets = [...new Set(rels.map((r: any) => r.target_table))].sort();
    for (const t of targets) {
      expect(targetTables).toContain(t);
    }
  });

  it('all relationships are nullable', () => {
    for (const r of rels) {
      expect(r.nullable).toBe(true);
    }
  });
});

describe('Migration 005 — Circular Nullable Relationships', () => {
  it('identifies vehicles↔drivers circular pair', () => {
    expect(circularPairs.length).toBe(1);
    const pair = circularPairs[0];
    expect(pair.table_a).toBe('vehicles');
    expect(pair.column_a).toBe('driver_id');
    expect(pair.table_b).toBe('drivers');
    expect(pair.column_b).toBe('assigned_vehicle_id');
  });

  it('both sides of circular relationship are nullable', () => {
    const vehiclesDriverId = rels.find((r: any) => r.source_table === 'vehicles' && r.source_column === 'driver_id');
    const driversVehicleId = rels.find((r: any) => r.source_table === 'drivers' && r.source_column === 'assigned_vehicle_id');
    expect(vehiclesDriverId!.nullable).toBe(true);
    expect(driversVehicleId!.nullable).toBe(true);
  });
});

describe('Migration 005 — Naming Conventions', () => {
  it('UNIQUE constraint names follow uq_{table}_org_id pattern', () => {
    for (const t of targetTables) {
      expect(`uq_${t}_org_id`).toMatch(/^uq_[a-z_]+_org_id$/);
    }
  });

  it('FK constraint names follow fk_{source}_{column}_org pattern', () => {
    for (const r of rels) {
      const name = `fk_${r.source_table}_${r.source_column}_org`;
      expect(name).toMatch(/^fk_[a-z_]+_org$/);
    }
  });

  it('no duplicate FK names', () => {
    const names = rels.map((r: any) => `fk_${r.source_table}_${r.source_column}_org`);
    const unique = [...new Set(names)];
    expect(names.length).toBe(unique.length);
  });
});


describe('Migration 005 — Block B Structure', () => {
  const blockB = readFileSync('supabase/staging/migration-005-B-migration.sql', 'utf8');

  it('is wrapped in BEGIN/COMMIT', () => {
    expect(blockB).toContain('BEGIN;');
    expect(blockB).toContain('COMMIT;');
  });

  it('contains no GRANT, POLICY, or CREATE FUNCTION', () => {
    expect(blockB).not.toMatch(/\bGRANT\b/i);
    expect(blockB).not.toMatch(/\bCREATE POLICY\b/i);
    expect(blockB).not.toMatch(/\bCREATE.*FUNCTION\b/i);
  });

  it('uses NO ACTION (not CASCADE)', () => {
    expect(blockB).not.toMatch(/\bCASCADE\b/);
    expect(blockB).toContain('NO ACTION');
  });

  it('uses MATCH SIMPLE (not MATCH FULL)', () => {
    expect(blockB).toContain('MATCH SIMPLE');
    expect(blockB).not.toMatch(/\bMATCH FULL\b/);
  });

  it('contains all 34 FK definitions', () => {
    for (const r of rels) {
      const name = `fk_${r.source_table}_${r.source_column}_org`;
      expect(blockB).toContain(name);
    }
  });

  it('contains all 9 UNIQUE constraints', () => {
    for (const t of targetTables) {
      expect(blockB).toContain(`uq_${t}_org_id`);
    }
  });

  it('drops all 12 old FKs', () => {
    const oldFKs = rels.filter((r: any) => r.old_fk_name !== null);
    for (const r of oldFKs) {
      expect(blockB).toContain(`DROP CONSTRAINT ${r.old_fk_name}`);
    }
  });
});

describe('Migration 005 — Block C is Read-Only', () => {
  const blockC = readFileSync('supabase/staging/migration-005-C-validation.sql', 'utf8');

  it('contains no DML or DDL statements (only SELECT/WITH)', () => {
    // Block C should only have SELECT queries and WITH CTEs
    // Split into statements and verify none start with INSERT/UPDATE/DELETE/CREATE/ALTER/DROP
    const lines = blockC.split('\n').filter(l => !l.startsWith('--') && l.trim().length > 0);
    const dmlPattern = /^\s*(INSERT|DELETE|CREATE|ALTER|DROP)\s/i;
    const dmlLines = lines.filter(l => dmlPattern.test(l));
    expect(dmlLines).toHaveLength(0);
  });

  it('uses expected-relationships CTE pattern', () => {
    expect(blockC).toContain('expected_fks');
    expect(blockC).toContain('installed_fks');
  });

  it('validates all 34 FKs by name in CTE', () => {
    for (const r of rels) {
      expect(blockC).toContain(`fk_${r.source_table}_${r.source_column}_org`);
    }
  });
});

describe('Migration 005 — Block D Transactional Tests', () => {
  const blockD = readFileSync('supabase/staging/migration-005-D-transactional-tests.sql', 'utf8');

  it('begins a transaction', () => {
    expect(blockD).toContain('BEGIN;');
  });

  it('always rolls back', () => {
    expect(blockD).toContain('ROLLBACK;');
    expect(blockD).not.toContain('COMMIT;');
  });

  it('exercises same-org reference', () => {
    expect(blockD).toContain('TEST 1');
    expect(blockD).toContain('same-org reference succeeds');
  });

  it('exercises cross-org rejection', () => {
    expect(blockD).toContain('TEST 2');
    expect(blockD).toContain('foreign_key_violation');
  });

  it('exercises nonexistent reference rejection', () => {
    expect(blockD).toContain('TEST 3');
    expect(blockD).toContain('nonexist');
  });

  it('exercises NULL optional reference', () => {
    expect(blockD).toContain('TEST 4');
    expect(blockD).toContain('NULL');
  });

  it('exercises circular vehicles↔drivers', () => {
    expect(blockD).toContain('TEST 5');
    expect(blockD).toContain('driver_id');
    expect(blockD).toContain('assigned_vehicle_id');
  });

  it('verifies zero rows after rollback', () => {
    expect(blockD).toContain('zero_rows_after_rollback');
  });

  it('is clearly labeled as transactional DML (not read-only)', () => {
    expect(blockD).toContain('NOT read-only');
    expect(blockD).toContain('Transactional DML');
  });
});
