import { describe, expect, it } from 'vitest';
import {
  archiveStatusForTable,
  fromDatabaseRecord,
  immutableDeleteMessage,
  resolveTableName,
  shouldHideArchivedRecord,
  toDatabaseRecord,
} from '../../src/lib/legacyTableAdapter';

describe('legacy table compatibility adapter', () => {
  it('routes the legacy maintenance module to maintenance_records', () => {
    expect(resolveTableName('maintenance')).toBe('maintenance_records');
  });

  it('maps challan fields and status to canonical columns', () => {
    expect(toDatabaseRecord('challans', {
      violation_type: 'overspeeding',
      fine_amount: 500,
      payment_status: 'pending',
    })).toEqual({
      offence: 'overspeeding',
      amount: 500,
      payment_status: 'unpaid',
    });
  });

  it('maps geofence radius and removes computed alert counts', () => {
    expect(toDatabaseRecord('geofences', {
      radius: 1000,
      alerts_count: 0,
    })).toEqual({ radius_meters: 1000 });
  });

  it('maps work order and tyre aliases to canonical columns', () => {
    expect(toDatabaseRecord('work_orders', {
      job_type: 'repair',
      assigned_mechanic: 'Workshop',
      actual_completion: null,
      parts_used: '',
    })).toEqual({
      type: 'repair',
      assigned_to: 'Workshop',
      completed_at: null,
    });

    expect(toDatabaseRecord('tyres', {
      make: 'MRF',
      km_run: 0,
      status: 'active',
      purchase_date: '2026-07-13',
      cost: 1000,
    })).toEqual({
      brand: 'MRF',
      current_odometer: 0,
      status: 'fitted',
    });
  });

  it('maps canonical rows back to the legacy UI shape', () => {
    expect(fromDatabaseRecord('challans', {
      offence: 'parking',
      amount: 100,
      payment_status: 'unpaid',
    })).toEqual(expect.objectContaining({
      violation_type: 'parking',
      fine_amount: 100,
      payment_status: 'pending',
    }));
  });

  it('nulls legacy GSTIN transporter values instead of sending invalid UUIDs', () => {
    expect(toDatabaseRecord('eway_bills', {
      transporter_id: '27ABCDE1234F1Z5',
    }).transporter_id).toBeNull();
  });

  it('soft-archives operational master data and protects audit records', () => {
    expect(archiveStatusForTable('vehicles')).toBe('inactive');
    expect(archiveStatusForTable('vendors')).toBe('inactive');
    expect(shouldHideArchivedRecord('vehicles', { status: 'inactive' })).toBe(true);
    expect(immutableDeleteMessage('cash_entries')).toContain('protected');
    expect(immutableDeleteMessage('routes')).toBeNull();
  });
});
