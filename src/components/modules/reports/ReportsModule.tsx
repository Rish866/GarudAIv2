import React from 'react';
import { BarChart3, TrendingUp, IndianRupee, Truck, Route } from 'lucide-react';
import { Trip, Invoice, Expense, Vehicle } from '../../../types';

interface ReportsModuleProps { trips: Trip[]; invoices: Invoice[]; expenses: Expense[]; vehicles: Vehicle[]; }

export default function ReportsModule({ trips, invoices, expenses, vehicles }: ReportsModuleProps) {
  const totalRevenue = trips.reduce((s, t) => s + t.total_amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(1) : '0';
  const avgFreightPerTrip = trips.length > 0 ? totalRevenue / trips.length : 0;
  const totalKm = trips.reduce((s, t) => s + t.distance_km, 0);
  const revenuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;

  // Top customers by revenue
  const customerRevenue: Record<string, number> = {};
  trips.forEach(t => { customerRevenue[t.customer_name] = (customerRevenue[t.customer_name] || 0) + t.total_amount; });
  const topCustomers = Object.entries(customerRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Expense breakdown
  const expenseByCategory: Record<string, number> = {};
  expenses.forEach(e => { expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount; });
  const topExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Business performance overview</p>
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900">₹{(totalRevenue / 100000).toFixed(1)}L</p>
          <p className="text-[11px] text-emerald-600 mt-1 font-medium">From {trips.length} trips</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900">₹{(totalExpenses / 100000).toFixed(1)}L</p>
          <p className="text-[11px] text-red-500 mt-1 font-medium">{expenses.length} transactions</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Net Profit</p>
          <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>₹{(profit / 100000).toFixed(1)}L</p>
          <p className="text-[11px] text-slate-500 mt-1">{profitMargin}% margin</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-medium text-slate-500 mb-1">Revenue per KM</p>
          <p className="text-2xl font-bold text-slate-900">₹{revenuePerKm.toFixed(1)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{totalKm.toLocaleString()} km total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Top Customers by Revenue</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {topCustomers.map(([name, revenue], idx) => (
              <div key={name} className="px-5 py-3.5 flex items-center gap-4">
                <span className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] font-bold text-blue-600">{idx + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{name}</p>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(revenue / (topCustomers[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-slate-800">₹{(revenue / 100000).toFixed(1)}L</span>
              </div>
            ))}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Expense Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {topExpenses.map(([category, amount]) => (
              <div key={category} className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium px-2 py-1 rounded bg-slate-100 text-slate-600 capitalize min-w-[80px] text-center">{category.replace('_', ' ')}</span>
                  <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${(amount / (topExpenses[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-800">₹{amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
