import React, { useState } from 'react';
import { Receipt, Plus, Search, IndianRupee, Clock, CheckCircle, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Invoice, Payment, Expense } from '../../../types';

interface BillingModuleProps { invoices: Invoice[]; payments: Payment[]; expenses: Expense[]; }

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-50 text-blue-700', partial: 'bg-amber-50 text-amber-700',
  paid: 'bg-emerald-50 text-emerald-700', overdue: 'bg-red-50 text-red-700', cancelled: 'bg-slate-100 text-slate-400',
};

export default function BillingModule({ invoices, payments, expenses }: BillingModuleProps) {
  const [tab, setTab] = useState<'invoices' | 'payments' | 'expenses'>('invoices');
  const totalOutstanding = invoices.reduce((sum, i) => sum + i.balance_amount, 0);
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing & Finance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage invoices, payments and expenses</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Clock className="w-4 h-4 text-amber-600" /></div>
            <span className="text-xs font-medium text-slate-500">Outstanding</span>
          </div>
          <p className="text-xl font-bold text-slate-900">₹{(totalOutstanding / 100000).toFixed(2)}L</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
            <span className="text-xs font-medium text-slate-500">Received (This Month)</span>
          </div>
          <p className="text-xl font-bold text-slate-900">₹{(totalReceived / 100000).toFixed(2)}L</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-red-600" /></div>
            <span className="text-xs font-medium text-slate-500">Expenses (This Month)</span>
          </div>
          <p className="text-xl font-bold text-slate-900">₹{(totalExpenses / 100000).toFixed(2)}L</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['invoices', 'payments', 'expenses'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Invoice #</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Balance</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-blue-600">{inv.invoice_number}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{inv.customer_name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{inv.invoice_date}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-800">₹{inv.total_amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-800">₹{inv.balance_amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${STATUS_STYLES[inv.status]}`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Reference</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-mono text-slate-600">{pay.reference_number}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-700">{pay.customer_name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{pay.payment_date}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-emerald-700">₹{pay.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 capitalize">{pay.payment_mode.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Date</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Category</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Description</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Vehicle</th>
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-slate-500">{exp.date}</td>
                  <td className="px-5 py-3.5"><span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">{exp.category.replace('_', ' ')}</span></td>
                  <td className="px-5 py-3.5 text-sm text-slate-700 max-w-[200px] truncate">{exp.description}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{exp.vehicle_reg || '—'}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-red-600">₹{exp.amount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
