import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { FileText, Plus, X, AlertTriangle } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';

interface ContractRate {
  id: string;
  customer_id: string;
  customer_name: string;
  origin: string;
  destination: string;
  vehicle_type: string;
  rate_type: 'per_trip' | 'per_ton' | 'per_km';
  rate: number;
  effective_from: string;
  effective_to: string;
  status: 'active' | 'expired';
}

export default function ContractRateModule() {
  const { customers, trips } = useStore();

  const [contracts, setContracts] = useState<ContractRate[]>([
    { id: 'ctr_001', customer_id: 'cust_001', customer_name: 'Tata Motors Ltd', origin: 'Pune', destination: 'Mumbai', vehicle_type: 'trailer', rate_type: 'per_trip', rate: 45000, effective_from: '2025-01-01', effective_to: '2025-12-31', status: 'active' },
    { id: 'ctr_002', customer_id: 'cust_002', customer_name: 'Reliance Industries', origin: 'Mumbai', destination: 'Hyderabad', vehicle_type: 'container', rate_type: 'per_trip', rate: 85000, effective_from: '2025-01-01', effective_to: '2025-12-31', status: 'active' },
    { id: 'ctr_003', customer_id: 'cust_003', customer_name: 'Asian Paints Ltd', origin: 'Ankleshwar', destination: 'Ahmedabad', vehicle_type: 'tanker', rate_type: 'per_ton', rate: 1600, effective_from: '2025-03-01', effective_to: '2025-09-30', status: 'active' },
    { id: 'ctr_004', customer_id: 'cust_004', customer_name: 'UltraTech Cement', origin: 'Bangalore', destination: 'Goa', vehicle_type: 'truck', rate_type: 'per_trip', rate: 62000, effective_from: '2025-04-01', effective_to: '2025-10-31', status: 'active' },
    { id: 'ctr_005', customer_id: 'cust_005', customer_name: 'Maruti Suzuki India', origin: 'Manesar', destination: 'Chennai', vehicle_type: 'truck', rate_type: 'per_km', rate: 82, effective_from: '2024-06-01', effective_to: '2025-05-31', status: 'expired' },
    { id: 'ctr_006', customer_id: 'cust_001', customer_name: 'Tata Motors Ltd', origin: 'Pune', destination: 'Delhi', vehicle_type: 'trailer', rate_type: 'per_trip', rate: 125000, effective_from: '2025-01-01', effective_to: '2025-12-31', status: 'active' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [form, setForm] = useState({
    customer_id: '',
    origin: '',
    destination: '',
    vehicle_type: 'truck',
    rate_type: 'per_trip' as ContractRate['rate_type'],
    rate: '',
    effective_from: '',
    effective_to: '',
  });

  const getTripsForContract = (contract: ContractRate) => {
    return trips.filter(
      (t) =>
        t.customer_id === contract.customer_id &&
        t.origin.toLowerCase().includes(contract.origin.toLowerCase()) &&
        t.destination.toLowerCase().includes(contract.destination.toLowerCase())
    ).length;
  };

  const getRateTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      per_trip: 'Per Trip',
      per_ton: 'Per Ton',
      per_km: 'Per KM',
    };
    return labels[type] || type;
  };

  const handleAdd = () => {
    const customer = customers.find((c) => c.id === form.customer_id);
    if (!customer || !form.origin || !form.destination || !form.rate || !form.effective_from || !form.effective_to) return;

    const today = new Date().toISOString().split('T')[0];
    const isExpired = form.effective_to < today;

    const newContract: ContractRate = {
      id: 'ctr_' + generateId(),
      customer_id: form.customer_id,
      customer_name: customer.name,
      origin: form.origin,
      destination: form.destination,
      vehicle_type: form.vehicle_type,
      rate_type: form.rate_type,
      rate: parseFloat(form.rate),
      effective_from: form.effective_from,
      effective_to: form.effective_to,
      status: isExpired ? 'expired' : 'active',
    };

    setContracts([...contracts, newContract]);
    setShowModal(false);
    setForm({ customer_id: '', origin: '', destination: '', vehicle_type: 'truck', rate_type: 'per_trip', rate: '', effective_from: '', effective_to: '' });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Contract Rate Master</h1>
          <p className="mt-1" style={{ color: 'var(--text-tertiary)' }}>Fixed rates per customer per route</p>
        </div>
        <button
          onClick={() => setShowBulkUpload(true)}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:opacity-80 transition-colors"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
        >
          Bulk Upload
        </button>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contract
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Total Contracts</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{contracts.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Active Contracts</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{contracts.filter((c) => c.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-tertiary)]">Expired Contracts</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{contracts.filter((c) => c.status === 'expired').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Table */}
      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-secondary)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Origin</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Destination</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Vehicle Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Rate Type</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Rate</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Effective From</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Effective To</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Trips Done</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  className={classNames(
                    'hover:bg-[var(--bg-secondary)]',
                    contract.status === 'expired' ? 'bg-red-50' : ''
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{contract.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{contract.origin}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{contract.destination}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] capitalize">{contract.vehicle_type}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{getRateTypeLabel(contract.rate_type)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">
                    {contract.rate_type === 'per_km' ? `₹${contract.rate}/km` : formatCurrency(contract.rate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDate(contract.effective_from)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatDate(contract.effective_to)}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)] text-right">{getTripsForContract(contract)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium', contract.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                      {contract.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showBulkUpload && (
        <BulkUpload
          title="Bulk Upload Contracts"
          description="Import contract rates from a CSV file"
          sampleFields={['customer_name', 'origin', 'destination', 'vehicle_type', 'rate_type', 'rate', 'effective_from', 'effective_to']}
          onUpload={(data) => {
            data.forEach(row => {
              const today = new Date().toISOString().split('T')[0];
              const isExpired = (row.effective_to || '') < today;
              setContracts(prev => [...prev, {
                id: 'ctr_' + generateId(),
                customer_id: '',
                customer_name: row.customer_name || '',
                origin: row.origin || '',
                destination: row.destination || '',
                vehicle_type: row.vehicle_type || 'truck',
                rate_type: (row.rate_type as any) || 'per_trip',
                rate: Number(row.rate) || 0,
                effective_from: row.effective_from || today,
                effective_to: row.effective_to || '',
                status: isExpired ? 'expired' : 'active',
              }]);
            });
          }}
          onClose={() => setShowBulkUpload(false)}
        />
      )}

      {/* Add Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[var(--bg-primary)] rounded-2xl shadow-xl w-full max-w-lg p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Contract Rate</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-[var(--text-tertiary)]" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Customer</label>
                <select
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Origin</label>
                  <input
                    type="text"
                    value={form.origin}
                    onChange={(e) => setForm({ ...form, origin: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Pune"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Destination</label>
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Mumbai"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Vehicle Type</label>
                  <select
                    value={form.vehicle_type}
                    onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="truck">Truck</option>
                    <option value="trailer">Trailer</option>
                    <option value="container">Container</option>
                    <option value="tanker">Tanker</option>
                    <option value="tipper">Tipper</option>
                    <option value="reefer">Reefer</option>
                    <option value="lcv">LCV</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Rate Type</label>
                  <select
                    value={form.rate_type}
                    onChange={(e) => setForm({ ...form, rate_type: e.target.value as ContractRate['rate_type'] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="per_trip">Per Trip</option>
                    <option value="per_ton">Per Ton</option>
                    <option value="per_km">Per KM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Rate (₹)</label>
                <input
                  type="number"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="45000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Effective From</label>
                  <input
                    type="date"
                    value={form.effective_from}
                    onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Effective To</label>
                  <input
                    type="date"
                    value={form.effective_to}
                    onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
