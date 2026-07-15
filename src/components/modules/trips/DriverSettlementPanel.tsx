import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../../lib/utils';
import { showToast } from '../../ui/Toast';
import { getOrCreateSettlement, updateSettlement, submitSettlement, approveSettlement } from '../../../lib/tripEntities';
import type { DriverSettlementRecord } from '../../../lib/tripEntities';

interface Props {
  tripId: string;
  driverId: string;
  driverName: string;
  organizationId: string;
}

export default function DriverSettlementPanel({ tripId, driverId, driverName, organizationId }: Props) {
  const [settlement, setSettlement] = useState<DriverSettlementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    opening_advance: 0,
    additional_advance: 0,
    diesel_cash: 0,
    toll_cash: 0,
    loading_cash: 0,
    unloading_cash: 0,
    bata: 0,
    parking: 0,
    repair_cash: 0,
    miscellaneous: 0,
  });

  useEffect(() => {
    if (!organizationId || !tripId || !driverId) { setLoading(false); return; }
    loadSettlement();
  }, [organizationId, tripId, driverId]);

  const loadSettlement = async () => {
    setLoading(true);
    const result = await getOrCreateSettlement(organizationId, tripId, driverId);
    if (result.success && result.settlement) {
      setSettlement(result.settlement);
      setForm({
        opening_advance: result.settlement.opening_advance || 0,
        additional_advance: result.settlement.additional_advance || 0,
        diesel_cash: result.settlement.diesel_cash || 0,
        toll_cash: result.settlement.toll_cash || 0,
        loading_cash: result.settlement.loading_cash || 0,
        unloading_cash: result.settlement.unloading_cash || 0,
        bata: result.settlement.bata || 0,
        parking: result.settlement.parking || 0,
        repair_cash: result.settlement.repair_cash || 0,
        miscellaneous: result.settlement.miscellaneous || 0,
      });
    }
    setLoading(false);
  };

  const totalExpenses = form.diesel_cash + form.toll_cash + form.loading_cash + form.unloading_cash + form.bata + form.parking + form.repair_cash + form.miscellaneous;
  const totalAdvance = form.opening_advance + form.additional_advance;
  const netPayable = totalExpenses - totalAdvance;

  const handleSave = async () => {
    if (!settlement) return;
    setSaving(true);
    const result = await updateSettlement(organizationId, settlement.id, form);
    if (result.success) {
      showToast('success', 'Settlement saved');
      await loadSettlement();
    } else {
      showToast('error', result.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!settlement) return;
    await handleSave();
    const result = await submitSettlement(organizationId, settlement.id);
    if (result.success) {
      showToast('success', 'Settlement submitted for approval');
      await loadSettlement();
    } else {
      showToast('error', result.error || 'Failed to submit');
    }
  };

  const handleApprove = async () => {
    if (!settlement) return;
    const result = await approveSettlement(organizationId, settlement.id, 'current_user');
    if (result.success) {
      showToast('success', 'Settlement approved');
      await loadSettlement();
    } else {
      showToast('error', result.error || 'Failed to approve');
    }
  };

  if (loading) return <p className="text-xs text-amber-700">Loading settlement...</p>;
  if (!driverId) return <p className="text-xs text-amber-700">No driver assigned</p>;

  const isEditable = !settlement || ['draft', 'submitted'].includes(settlement.status);
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    settled: 'bg-emerald-100 text-emerald-800',
    reversed: 'bg-red-100 text-red-700',
    waived: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-amber-700">Driver: <span className="font-medium">{driverName}</span></p>
        {settlement && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[settlement.status] || 'bg-slate-100'}`}>
            {settlement.status.toUpperCase()}
          </span>
        )}
      </div>

      {/* Amount fields */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'opening_advance', label: 'Opening Advance' },
          { key: 'additional_advance', label: 'Additional Advance' },
          { key: 'diesel_cash', label: 'Diesel Cash' },
          { key: 'toll_cash', label: 'Toll' },
          { key: 'loading_cash', label: 'Loading' },
          { key: 'unloading_cash', label: 'Unloading' },
          { key: 'bata', label: 'Bata/DA' },
          { key: 'parking', label: 'Parking' },
          { key: 'repair_cash', label: 'Repairs' },
          { key: 'miscellaneous', label: 'Miscellaneous' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-[10px] text-amber-700">{label}</label>
            <input
              type="number"
              value={(form as any)[key]}
              onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) || 0 })}
              disabled={!isEditable}
              className="w-full px-2 py-1 border rounded text-xs disabled:opacity-50 disabled:bg-slate-50"
              style={{ borderColor: '#fbbf24' }}
            />
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-amber-200 pt-2 space-y-1 text-xs">
        <div className="flex justify-between"><span>Total Expenses:</span><span className="font-medium">{formatCurrency(totalExpenses)}</span></div>
        <div className="flex justify-between"><span>Total Advance:</span><span className="font-medium">{formatCurrency(totalAdvance)}</span></div>
        <div className="flex justify-between font-semibold">
          <span>{netPayable >= 0 ? 'Payable to Driver:' : 'Recoverable from Driver:'}</span>
          <span className={netPayable >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(Math.abs(netPayable))}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {isEditable && (
          <>
            <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            {settlement?.status === 'draft' && (
              <button onClick={handleSubmit} className="px-3 py-1.5 border border-blue-300 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-50">
                Submit
              </button>
            )}
          </>
        )}
        {settlement?.status === 'submitted' && (
          <button onClick={handleApprove} className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700">
            Approve
          </button>
        )}
      </div>
    </div>
  );
}
