import React, { useState } from 'react';
import { UserCircle, Plus, Search, IndianRupee, Building2, Phone } from 'lucide-react';
import { Customer } from '../../../types';

interface CustomersModuleProps { customers: Customer[]; }

export default function CustomersModule({ customers }: CustomersModuleProps) {
  const [search, setSearch] = useState('');
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.contact_person.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-0.5">{customers.length} active customers</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Customer</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Contact</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Type</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Outstanding</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Total Business</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((cust) => (
              <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{cust.name}</p>
                      <p className="text-[11px] text-slate-400">GSTIN: {cust.gstin}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm text-slate-700">{cust.contact_person}</p>
                  <p className="text-[11px] text-slate-400">{cust.phone}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 capitalize">{cust.contract_type}</span>
                </td>
                <td className="px-5 py-4">
                  <p className={`text-sm font-semibold ${cust.outstanding_balance > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    ₹{(cust.outstanding_balance / 100000).toFixed(2)}L
                  </p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-slate-800">₹{(cust.total_business / 100000).toFixed(1)}L</p>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${cust.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {cust.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
