import React, { useState } from 'react';
import { isDemoTenant } from '../../../lib/tenant';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Plus, X, ShoppingCart, Banknote, CreditCard } from 'lucide-react';

interface PurchaseEntry {
  id: string;
  date: string;
  invoice_number: string;
  supplier_name: string;
  items: string;
  amount: number;
  type: 'cash' | 'credit' | 'bank';
  status: 'paid' | 'pending';
  narration: string;
}


export default function PurchaseModule() {
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(isDemoTenant() ? [
    { id: 'pur_001', date: '2025-07-01', invoice_number: 'IOCL-7845', supplier_name: 'Indian Oil Corporation (IOCL)', items: 'Diesel - 500 litres', amount: 12000, type: 'cash', status: 'paid', narration: 'Diesel for fleet vehicles' },
    { id: 'pur_002', date: '2025-07-02', invoice_number: 'MRF-INV-2234', supplier_name: 'MRF Tyre Dealer - Pune', items: 'Tyres 295/80 R22.5 x 2', amount: 42000, type: 'credit', status: 'pending', narration: 'Replacement tyres for MH-12-CD-5678' },
    { id: 'pur_003', date: '2025-07-03', invoice_number: 'AZ-8891', supplier_name: 'Auto Zone Spare Parts', items: 'Brake pads, air filters, fan belts', amount: 8500, type: 'credit', status: 'pending', narration: 'Spare parts for workshop inventory' },
    { id: 'pur_004', date: '2025-07-04', invoice_number: 'OS-1123', supplier_name: 'Office Mart Pune', items: 'Printer cartridges, A4 paper, files', amount: 3200, type: 'cash', status: 'paid', narration: 'Monthly office supplies' },
    { id: 'pur_005', date: '2025-07-05', invoice_number: 'NIA-POL-9922', supplier_name: 'New India Assurance', items: 'Vehicle insurance - RJ-14-JK-7890', amount: 45000, type: 'bank', status: 'paid', narration: 'Annual comprehensive insurance' },
    { id: 'pur_006', date: '2025-07-07', invoice_number: 'SAW-4456', supplier_name: 'Sharma Auto Works', items: 'Engine overhaul + clutch plate', amount: 35000, type: 'credit', status: 'pending', narration: 'Major repair for RJ-14-JK-7890' },
  ] : []);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ date: '', supplier_name: '', invoice_number: '', items: '', amount: '', type: 'cash' as PurchaseEntry['type'], narration: '' });

  const totalPurchases = purchases.reduce((sum, p) => sum + p.amount, 0);
  const cashPurchases = purchases.filter((p) => p.type === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const creditPurchases = purchases.filter((p) => p.type === 'credit').reduce((sum, p) => sum + p.amount, 0);
  const pendingPayments = purchases.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);


  const handleAdd = () => {
    if (!form.date || !form.supplier_name || !form.amount) return;
    const newEntry: PurchaseEntry = {
      id: 'pur_' + Date.now().toString(36),
      date: form.date,
      invoice_number: form.invoice_number || `PUR-${Date.now().toString(36).toUpperCase()}`,
      supplier_name: form.supplier_name,
      items: form.items,
      amount: parseFloat(form.amount),
      type: form.type,
      status: form.type === 'credit' ? 'pending' : 'paid',
      narration: form.narration,
    };
    setPurchases([...purchases, newEntry]);
    setShowModal(false);
    setForm({ date: '', supplier_name: '', invoice_number: '', items: '', amount: '', type: 'cash', narration: '' });
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      credit: 'bg-orange-100 text-orange-800',
      bank: 'bg-blue-100 text-blue-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Management</h1>
          <p className="text-slate-500 mt-1">Track all purchase vouchers and supplier payments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Purchase
        </button>
      </div>


      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Purchases</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <Banknote className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cash Purchases</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(cashPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Credit Purchases</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(creditPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pending Payments</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(pendingPayments)}</p>
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
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Items</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-700">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{entry.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{entry.supplier_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{entry.items}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-red-600">{formatCurrency(entry.amount)}</td>
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


      {/* New Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">New Purchase</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name</label>
                <input type="text" value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. MRF Tyre Dealer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                <input type="text" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Supplier invoice#" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Items</label>
                <input type="text" value={form.items} onChange={(e) => setForm({ ...form, items: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Description of items purchased" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PurchaseEntry['type'] })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="bank">Bank</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Narration</label>
                <input type="text" value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Additional notes" />
              </div>
              <button onClick={handleAdd} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Add Purchase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
