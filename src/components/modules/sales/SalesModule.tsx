import React, { useState } from 'react';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Plus, X, TrendingUp, Banknote, CreditCard } from 'lucide-react';

interface SalesEntry {
  id: string;
  date: string;
  invoice_number: string;
  customer_name: string;
  description: string;
  amount: number;
  type: 'cash' | 'credit';
  status: 'received' | 'pending';
  narration: string;
}


export default function SalesModule() {
  const [sales, setSales] = useState<SalesEntry[]>([
    { id: 'sal_001', date: '2025-07-01', invoice_number: 'INV-2025-0090', customer_name: 'Tata Motors Ltd', description: 'Freight - Pune to Mumbai (Auto Parts)', amount: 47000, type: 'credit', status: 'pending', narration: 'Trip TRP-2025-0142' },
    { id: 'sal_002', date: '2025-07-02', invoice_number: 'INV-2025-0091', customer_name: 'Reliance Industries', description: 'Freight - Mumbai to Hyderabad (Chemicals)', amount: 88500, type: 'credit', status: 'pending', narration: 'Trip TRP-2025-0141' },
    { id: 'sal_003', date: '2025-07-03', invoice_number: 'INV-2025-0092', customer_name: 'Ganesh Traders', description: 'Local delivery service - Pune city', amount: 15000, type: 'cash', status: 'received', narration: 'Same-day local delivery' },
    { id: 'sal_004', date: '2025-07-05', invoice_number: 'INV-2025-0093', customer_name: 'Mahindra Logistics', description: 'Warehouse rental - July month', amount: 25000, type: 'credit', status: 'pending', narration: 'Godown space rental at Transport Nagar' },
    { id: 'sal_005', date: '2025-07-06', invoice_number: 'INV-2025-0094', customer_name: 'APM Terminals', description: 'Container handling at JNPT', amount: 8000, type: 'cash', status: 'received', narration: 'Container stuffing/destuffing' },
    { id: 'sal_006', date: '2025-07-08', invoice_number: 'INV-2025-0095', customer_name: 'UltraTech Cement', description: 'Freight - Bangalore to Goa (Cement)', amount: 66500, type: 'credit', status: 'pending', narration: 'Trip TRP-2025-0139' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: '', customer_name: '', invoice_number: '', description: '', amount: '', type: 'credit' as SalesEntry['type'], narration: '' });

  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const cashSales = sales.filter((s) => s.type === 'cash').reduce((sum, s) => sum + s.amount, 0);
  const creditSales = sales.filter((s) => s.type === 'credit').reduce((sum, s) => sum + s.amount, 0);
  const outstandingCredit = sales.filter((s) => s.type === 'credit' && s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);


  const handleAdd = () => {
    if (!form.date || !form.customer_name || !form.amount) return;
    const newEntry: SalesEntry = {
      id: 'sal_' + Date.now().toString(36),
      date: form.date,
      invoice_number: form.invoice_number || `INV-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      customer_name: form.customer_name,
      description: form.description,
      amount: parseFloat(form.amount),
      type: form.type,
      status: form.type === 'cash' ? 'received' : 'pending',
      narration: form.narration,
    };
    setSales([...sales, newEntry]);
    setShowModal(false);
    setForm({ date: '', customer_name: '', invoice_number: '', description: '', amount: '', type: 'credit', narration: '' });
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      credit: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      received: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Management</h1>
          <p className="text-slate-500 mt-1">Track freight sales, invoices & receivables</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Sale
        </button>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Sales</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cash Sales</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(cashSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Credit Sales</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(creditSales)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Outstanding Credit</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(outstandingCredit)}</p>
            </div>
          </div>
        </div>
      </div>


      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Invoice#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Description</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{entry.customer_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{entry.description}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatCurrency(entry.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium capitalize', getTypeBadge(entry.type))}>{entry.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-medium capitalize', getStatusBadge(entry.status))}>{entry.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">New Sale</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
                <input type="text" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Tata Motors Ltd" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                <input type="text" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Auto-generated if empty" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Freight / Service description" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SalesEntry['type'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Narration</label>
                <input type="text" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Additional notes" />
              </div>
              <button onClick={handleAdd} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
