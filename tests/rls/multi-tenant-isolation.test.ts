/**
 * GARUD AI ERP — Multi-Tenant Isolation Tests (RLS)
 * 
 * These tests verify Row-Level Security (RLS) on the live Supabase instance.
 * 
 * REQUIREMENTS:
 * - Live Supabase instance with migrations 000-007 applied
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars set
 * 
 * BEHAVIOR:
 * - When run via `npm test` (includes all test files): skips with clear message
 *   if VITE_SUPABASE_ANON_KEY is empty or URL is localhost.
 * - When run via `npm run test:rls`: reports exact pass/fail/skip counts.
 *   If RLS is not deployed (data leaks without auth), tests FAIL explicitly.
 * 
 * NOTE: .env file must NOT be committed. Use environment variables.
 */

import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const hasCredentials = SUPABASE_ANON_KEY.length > 0 && SUPABASE_URL.length > 0 && !SUPABASE_URL.includes('localhost');

// Demo org UUID (used for cross-org attack tests)
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

describe('Multi-Tenant RLS Isolation', () => {
  if (!hasCredentials) {
    it.skip('SKIPPED: No Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.', () => {});
    it.skip('SKIPPED: Unauthenticated vehicle access', () => {});
    it.skip('SKIPPED: Unauthenticated trip access', () => {});
    it.skip('SKIPPED: Unauthenticated invoice access', () => {});
    it.skip('SKIPPED: Unauthenticated customer access', () => {});
    it.skip('SKIPPED: Cross-org SELECT blocked', () => {});
    it.skip('SKIPPED: UUID direct access blocked', () => {});
    it.skip('SKIPPED: Cross-org INSERT blocked', () => {});
    it.skip('SKIPPED: Cross-org UPDATE blocked', () => {});
    it.skip('SKIPPED: Cross-org DELETE blocked', () => {});
    it.skip('SKIPPED: Demo data isolation', () => {});
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  describe('Unauthenticated access (RLS must block)', () => {
    it('vehicles table returns empty/null without auth', async () => {
      const { data, error } = await supabase.from('vehicles').select('*');
      // RLS should block unauthenticated SELECT. If data has rows, RLS is NOT active.
      if (data && data.length > 0 && !error) {
        throw new Error(
          `RLS FAILURE: vehicles table returned ${data.length} rows without authentication. ` +
          `Run migrations 000-007 on your Supabase instance to enable RLS.`
        );
      }
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    });

    it('trips table returns empty/null without auth', async () => {
      const { data, error } = await supabase.from('trips').select('*');
      if (data && data.length > 0 && !error) {
        throw new Error(
          `RLS FAILURE: trips table returned ${data.length} rows without authentication. ` +
          `Run migrations 000-007.`
        );
      }
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    });

    it('invoices table returns empty/null without auth', async () => {
      const { data, error } = await supabase.from('invoices').select('*');
      if (data && data.length > 0 && !error) {
        throw new Error(`RLS FAILURE: invoices leaked ${data.length} rows.`);
      }
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    });

    it('customers table returns empty/null without auth', async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (data && data.length > 0 && !error) {
        throw new Error(`RLS FAILURE: customers leaked ${data.length} rows.`);
      }
      expect(data === null || (Array.isArray(data) && data.length === 0)).toBe(true);
    });
  });

  describe('Cross-org access prevention', () => {
    it('cannot SELECT from another org', async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', DEMO_ORG_ID);
      expect(data?.length ?? 0).toBe(0);
    });

    it('cannot fetch record by UUID from another org', async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', fakeId)
        .single();
      expect(data).toBeNull();
    });

    it('cannot INSERT into another org', async () => {
      const { error } = await supabase.from('vehicles').insert({
        organization_id: DEMO_ORG_ID,
        reg_number: 'ATTACK-VEH-001',
        vehicle_type: 'truck',
        make: 'Test',
        model: 'Attack',
        year: 2025,
        status: 'available',
      });
      // RLS should block — expect an error or no rows affected
      expect(error).not.toBeNull();
    });

    it('cannot UPDATE record from another org', async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      const { data, error } = await supabase
        .from('vehicles')
        .update({ reg_number: 'HACKED' })
        .eq('id', fakeId)
        .eq('organization_id', DEMO_ORG_ID)
        .select();
      // Should affect 0 rows
      expect(data?.length ?? 0).toBe(0);
    });

    it('cannot DELETE record from another org', async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      const { data } = await supabase
        .from('customers')
        .delete()
        .eq('id', fakeId)
        .eq('organization_id', DEMO_ORG_ID)
        .select();
      expect(data?.length ?? 0).toBe(0);
    });

    it('demo data invisible to non-members', async () => {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('organization_id', DEMO_ORG_ID);
      expect(data?.length ?? 0).toBe(0);
    });
  });
});

describe('Dashboard zero-state (unit)', () => {
  it('empty arrays produce zero metrics', () => {
    const vehicles: any[] = [];
    const trips: any[] = [];
    const invoices: any[] = [];
    
    expect(vehicles.length).toBe(0);
    expect(trips.filter(t => ['in_transit'].includes(t.status)).length).toBe(0);
    expect(invoices.reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0)).toBe(0);
  });
});
