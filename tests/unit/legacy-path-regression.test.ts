// ============================================================
// LEGACY PATH REGRESSION TESTS
//
// These tests prevent reintroduction of legacy write patterns
// that bypass the authoritative workflow services.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC_DIR = join(__dirname, '../../src');

function readModule(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), 'utf-8');
}

describe('Legacy write-path regression guard', () => {
  describe('POD: trip.pod_url must not be used for business decisions', () => {
    it('TripsModule does not write pod_url to trip record', () => {
      const content = readModule('components/modules/trips/TripsModule.tsx');
      // Should not contain pod_url as a property value assignment (excluding undefined/null/'')
      const lines = content.split('\n');
      const activeWrites = lines.filter(line => {
        const trimmed = line.trim();
        // Match: pod_url: <value> where value is not undefined/null/''
        // Exclude comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return false;
        return /pod_url:\s*['"a-zA-Z]/.test(trimmed) && !trimmed.includes('undefined') && !trimmed.includes('null');
      });
      expect(activeWrites.length, `Active pod_url writes: ${activeWrites.join('; ')}`).toBe(0);
    });

    it('BillingModule does not check trip.pod_url for billing decisions', () => {
      const content = readModule('components/modules/billing/BillingModule.tsx');
      expect(content).not.toContain('trip.pod_url');
      expect(content).not.toContain('pod_url ?');
    });
  });

  describe('LR: frontend must not generate LR numbers', () => {
    it('TripsModule does not call generateLRNumber()', () => {
      const content = readModule('components/modules/trips/TripsModule.tsx');
      expect(content).not.toContain('generateLRNumber()');
    });

    it('IndentModule does not call generateLRNumber()', () => {
      const content = readModule('components/modules/indents/IndentModule.tsx');
      expect(content).not.toContain('generateLRNumber()');
    });
  });

  describe('Invoice: trip invoices must use invoice_trips', () => {
    it('TripsModule uses createInvoiceForTrip service', () => {
      const content = readModule('components/modules/trips/TripsModule.tsx');
      expect(content).toContain('createInvoiceForTrip');
      // Should NOT use addInvoice for trip invoices
      expect(content).not.toContain('addInvoice(');
    });

    it('BillingModule checks invoice_trips before creating trip invoice', () => {
      const content = readModule('components/modules/billing/BillingModule.tsx');
      expect(content).toContain('invoice_trips');
    });
  });

  describe('Profitability: must use authoritative service', () => {
    it('TripDetailModal uses calculateTripProfitability', () => {
      const content = readModule('components/modules/trips/TripsModule.tsx');
      expect(content).toContain('calculateTripProfitability');
      // Should NOT have inline fuel cost estimates
      expect(content).not.toContain('fuelCostEstimate');
      expect(content).not.toContain('tollEstimate');
    });
  });

  describe('Settlement: must use persistent entity', () => {
    it('DriverSettlementPanel uses tripEntities service', () => {
      const content = readModule('components/modules/trips/DriverSettlementPanel.tsx');
      expect(content).toContain('getOrCreateSettlement');
      expect(content).toContain('updateSettlement');
      expect(content).toContain('submitSettlement');
      expect(content).toContain('approveSettlement');
      expect(content).toContain('settleSettlement');
      expect(content).toContain('reverseSettlement');
    });
  });
});
