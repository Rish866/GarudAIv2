import { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { FileWarning, IndianRupee, Clock, Plus, X, Filter } from 'lucide-react';

type PaymentStatus = 'paid' | 'pending' | 'disputed';
type ViolationType = 'overspeeding' | 'signal_jump' | 'overloading' | 'lane_violation' | 'no_helmet' | 'expired_docs' | 'parking' | 'other';

interface Challan {
  id: string;
  date: string;
  challan_number: string;
  vehicle_reg: string;
  driver_name: string;
  violation_type: ViolationType;
  location: string;
  fine_amount: number;
  payment_status: PaymentStatus;
}

const VIOLATION_LABELS: Record<ViolationType, string> = {
  overspeeding: 'Overspeeding',
  signal_jump: 'Signal Jump',
  overloading: 'Overloading',
  lane_violation: 'Lane Violation',
  no_helmet: 'No Helmet',
  expired_docs: 'Expired Documents',
  parking: 'Parking Violation',
  other: 'Other',
};

const STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  disputed: 'bg-red-100 text-red-800',
};


export default function ChallanModule() {
  const { vehicles } = useStore();
  const { data: challans, create: createChallan, remove: removeChallan, loading: challansLoading } = useModuleData<Challan>('challans');
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all');

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    challan_number: '',
    vehicle_reg: '',
    driver_name: '',
    violation_type: 'overspeeding' as ViolationType,
    location: '',
    fine_amount: 0,
  });

  // Filtered challans
  const filteredChallans = filter === 'all' ? challans : challans.filter((c) => c.payment_status === filter);

  // Summary calculations
  const totalChallans = challans.length;
  const totalFineAmount = challans.reduce((sum, c) => sum + c.fine_amount, 0);
  const pendingPayment = challans
    .filter((c) => c.payment_status === 'pending' || c.payment_status === 'disputed')
    .reduce((sum, c) => sum + c.fine_amount, 0);

  // Vehicle-wise fine totals
  const vehicleFines = challans.reduce<Record<string, number>>((acc, c) => {
    acc[c.vehicle_reg] = (acc[c.vehicle_reg] || 0) + c.fine_amount;
    return acc;
  }, {});

  const handleSubmit = () => {
    if (!form.challan_number || !form.vehicle_reg || !form.fine_amount) return;
    const newChallan: Challan = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      date: form.date,
      challan_number: form.challan_number,
      vehicle_reg: form.vehicle_reg,
      driver_name: form.driver_name,
      violation_type: form.violation_type,
      location: form.location,
      fine_amount: form.fine_amount,
      payment_status: 'pending',
    };
    setChallans([newChallan, ...challans]);
    setShowModal(false);
    setForm({
      date: new Date().toISOString().split('T')[0],
      challan_number: '',
      vehicle_reg: '',
      driver_name: '',
      violation_type: 'overspeeding',
      location: '',
      fine_amount: 0,
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Challan &amp; Fine Management</h2>
          <p className="text-sm text-slate-500 mt-1">Track traffic challans, RTO fines and violations</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Challan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileWarning size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Challans</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{totalChallans}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <IndianRupee size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Fine Amount</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{formatCurrency(totalFineAmount)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Clock size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Payment</p>
              <p className="text-2xl font-bold text-red-600 mt-0.5">{formatCurrency(pendingPayment)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-slate-400" />
        {(['all', 'pending', 'paid', 'disputed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Challan Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Challan No.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Vehicle</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Driver</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Violation</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Fine</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChallans.map((challan) => (
                <tr key={challan.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-700">{formatDate(challan.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-800">{challan.challan_number}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{challan.vehicle_reg}</td>
                  <td className="px-4 py-3 text-slate-700">{challan.driver_name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      {VIOLATION_LABELS[challan.violation_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate">{challan.location}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(challan.fine_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('px-2.5 py-1 rounded-full text-xs font-medium', STATUS_COLORS[challan.payment_status])}>
                      {challan.payment_status.charAt(0).toUpperCase() + challan.payment_status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle-wise Fine Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Total Fines Per Vehicle</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(vehicleFines).map(([reg, amount]) => (
            <div key={reg} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
              <span className="font-semibold text-slate-800 text-sm">{reg}</span>
              <span className="text-sm font-medium text-red-600">{formatCurrency(amount as number)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Challan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900">Add Challan</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Challan Number</label>
                  <input
                    type="text"
                    value={form.challan_number}
                    onChange={(e) => setForm({ ...form, challan_number: e.target.value })}
                    placeholder="CH-XX-2025-XXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
                  <select
                    value={form.vehicle_reg}
                    onChange={(e) => setForm({ ...form, vehicle_reg: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.reg_number}>
                        {v.reg_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={form.driver_name}
                    onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                    placeholder="Driver name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Violation Type</label>
                  <select
                    value={form.violation_type}
                    onChange={(e) => setForm({ ...form, violation_type: e.target.value as ViolationType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(VIOLATION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fine Amount</label>
                  <input
                    type="number"
                    value={form.fine_amount || ''}
                    onChange={(e) => setForm({ ...form, fine_amount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Enter location of violation"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Challan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
