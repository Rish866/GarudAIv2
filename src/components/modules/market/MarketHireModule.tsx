import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Truck, Plus, X, TrendingUp, IndianRupee, CreditCard } from 'lucide-react';

interface MarketHireRecord {
  id: string;
  trip_number: string;
  market_vehicle_reg: string;
  owner_name: string;
  owner_phone: string;
  hire_amount: number;
  advance_paid: number;
  balance_due: number;
  freight_charged: number;
  commission: number;
  payment_status: 'pending' | 'partial' | 'paid';
}

export default function MarketHireModule() {
  const [hires, setHires] = useState<MarketHireRecord[]>([
    { id: 'mh_001', trip_number: 'TRP-2025-0135', market_vehicle_reg: 'UP-78-AT-4521', owner_name: 'Rajan Transport', owner_phone: '+91 94155 67890', hire_amount: 72000, advance_paid: 25000, balance_due: 47000, freight_charged: 88000, commission: 16000, payment_status: 'partial' },
    { id: 'mh_002', trip_number: 'TRP-2025-0133', market_vehicle_reg: 'HR-55-BK-9012', owner_name: 'Sharma Carriers', owner_phone: '+91 98765 12340', hire_amount: 95000, advance_paid: 95000, balance_due: 0, freight_charged: 118000, commission: 23000, payment_status: 'paid' },
    { id: 'mh_003', trip_number: 'TRP-2025-0131', market_vehicle_reg: 'RJ-19-GA-3456', owner_name: 'Gupta Logistics', owner_phone: '+91 93145 78900', hire_amount: 55000, advance_paid: 20000, balance_due: 35000, freight_charged: 68000, commission: 13000, payment_status: 'partial' },
    { id: 'mh_004', trip_number: 'TRP-2025-0128', market_vehicle_reg: 'GJ-01-DP-7788', owner_name: 'Patel Brothers', owner_phone: '+91 97267 45612', hire_amount: 110000, advance_paid: 0, balance_due: 110000, freight_charged: 135000, commission: 25000, payment_status: 'pending' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    trip_number: '',
    market_vehicle_reg: '',
    owner_name: '',
    owner_phone: '',
    hire_amount: '',
    advance_paid: '',
    freight_charged: '',
  });

  const totalHireTrips = hires.length;
  const totalHireAmount = hires.reduce((sum, h) => sum + h.hire_amount, 0);
  const totalCommission = hires.reduce((sum, h) => sum + h.commission, 0);

  const handleAdd = () => {
    if (!form.trip_number || !form.market_vehicle_reg || !form.owner_name || !form.hire_amount || !form.freight_charged) return;

    const hireAmount = parseFloat(form.hire_amount);
    const advancePaid = parseFloat(form.advance_paid) || 0;
    const freightCharged = parseFloat(form.freight_charged);

    const newHire: MarketHireRecord = {
      id: 'mh_' + generateId(),
      trip_number: form.trip_number,
      market_vehicle_reg: form.market_vehicle_reg,
      owner_name: form.owner_name,
      owner_phone: form.owner_phone,
      hire_amount: hireAmount,
      advance_paid: advancePaid,
      balance_due: hireAmount - advancePaid,
      freight_charged: freightCharged,
      commission: freightCharged - hireAmount,
      payment_status: advancePaid >= hireAmount ? 'paid' : advancePaid > 0 ? 'partial' : 'pending',
    };

    setHires([...hires, newHire]);
    setShowModal(false);
    setForm({ trip_number: '', market_vehicle_reg: '', owner_name: '', owner_phone: '', hire_amount: '', advance_paid: '', freight_charged: '' });
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Market / Hire Vehicles</h1>
          <p className="mt-1" style={{ color: 'var(--text-tertiary)' }}>Manage externally hired vehicles and commissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Market Hire
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Total Hire Trips</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{totalHireTrips}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <IndianRupee className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Total Hire Amount</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalHireAmount)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Commission Earned</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(totalCommission)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Hire Records Table */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Trip No.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Vehicle Reg</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Owner</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Phone</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Hire Amount</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Advance Paid</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Balance Due</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Freight Charged</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Commission</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {hires.map((hire) => (
                <tr key={hire.id} className="hover:bg-[var(--bg-secondary)]">
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{hire.trip_number}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{hire.market_vehicle_reg}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{hire.owner_name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{hire.owner_phone}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{formatCurrency(hire.hire_amount)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{formatCurrency(hire.advance_paid)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium text-right">{formatCurrency(hire.balance_due)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{formatCurrency(hire.freight_charged)}</td>
                  <td className="px-4 py-3 text-sm text-green-700 font-medium text-right">{formatCurrency(hire.commission)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', getPaymentStatusBadge(hire.payment_status))}>
                      {hire.payment_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Market Hire Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Market Hire</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Trip Number</label>
                <input
                  type="text"
                  value={form.trip_number}
                  onChange={(e) => setForm({ ...form, trip_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="TRP-2025-XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Market Vehicle Reg</label>
                <input
                  type="text"
                  value={form.market_vehicle_reg}
                  onChange={(e) => setForm({ ...form, market_vehicle_reg: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., MH-12-XX-1234"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={form.owner_name}
                    onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Owner Phone</label>
                  <input
                    type="text"
                    value={form.owner_phone}
                    onChange={(e) => setForm({ ...form, owner_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Hire Amount (₹)</label>
                  <input
                    type="number"
                    value={form.hire_amount}
                    onChange={(e) => setForm({ ...form, hire_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={form.advance_paid}
                    onChange={(e) => setForm({ ...form, advance_paid: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Freight Charged to Customer (₹)</label>
                <input
                  type="number"
                  value={form.freight_charged}
                  onChange={(e) => setForm({ ...form, freight_charged: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Market Hire
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
