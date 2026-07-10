import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { useBranchData } from '../../../hooks/useBranchData';
import { formatCurrency } from '../../../lib/utils';
import { generateTripReportPDF } from '../../../lib/pdf';

export default function ReportsModule() {
  const { company } = useStore();
  const { invoices, expenses, trips } = useBranchData();

  const [dateRange, setDateRange] = useState<'all' | 'this_month' | 'last_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter trips by date range
  const filteredTrips = trips.filter(t => {
    if (dateRange === 'all') return true;
    const tripDate = new Date(t.booking_date);
    const now = new Date();
    if (dateRange === 'this_month') {
      return tripDate.getMonth() === now.getMonth() && tripDate.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return tripDate >= lastMonth && tripDate <= lastMonthEnd;
    }
    if (dateRange === 'custom' && startDate && endDate) {
      return tripDate >= new Date(startDate) && tripDate <= new Date(endDate);
    }
    return true;
  });

  const filteredExpenses = expenses.filter(e => {
    if (dateRange === 'all') return true;
    const expDate = new Date(e.date);
    const now = new Date();
    if (dateRange === 'this_month') {
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    }
    if (dateRange === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return expDate >= lastMonth && expDate <= lastMonthEnd;
    }
    if (dateRange === 'custom' && startDate && endDate) {
      return expDate >= new Date(startDate) && expDate <= new Date(endDate);
    }
    return true;
  });

  // P&L Summary
  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Top Customers by Revenue (from trips grouped by customer_name)
  const customerRevenue: Record<string, number> = {};
  filteredTrips.forEach((trip) => {
    customerRevenue[trip.customer_name] = (customerRevenue[trip.customer_name] || 0) + trip.total_amount;
  });
  const topCustomers = Object.entries(customerRevenue)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCustomerRevenue = topCustomers.length > 0 ? topCustomers[0][1] : 1;

  // Expense Breakdown by category
  const categoryExpenses: Record<string, number> = {};
  filteredExpenses.forEach((exp) => {
    categoryExpenses[exp.category] = (categoryExpenses[exp.category] || 0) + exp.amount;
  });
  const expenseBreakdown = Object.entries(categoryExpenses).sort((a, b) => b[1] - a[1]);
  const maxCategoryExpense = expenseBreakdown.length > 0 ? expenseBreakdown[0][1] : 1;

  // Monthly Trip Stats
  const totalTrips = filteredTrips.length;
  const totalFreight = filteredTrips.reduce((sum, t) => sum + t.freight_amount, 0);
  const avgFreightPerTrip = totalTrips > 0 ? totalFreight / totalTrips : 0;
  const totalKm = filteredTrips.reduce((sum, t) => sum + t.distance_km, 0);
  const revenuePerKm = totalKm > 0 ? totalRevenue / totalKm : 0;


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Reports & Analytics</h2>
        <button
          onClick={() => generateTripReportPDF(filteredTrips, company, 'Business Report')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateRange === 'custom' && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-sm text-slate-500">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </>
        )}
      </div>

      {/* P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Net Profit</p>
          <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Profit Margin</p>
          <p className={`text-2xl font-bold mt-1 ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Customers by Revenue</h3>
          <div className="space-y-3">
            {topCustomers.map(([name, revenue]) => (
              <div key={name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-700">{name}</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(revenue)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${(revenue / maxCustomerRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="text-sm text-slate-400">No trip data available</p>
            )}
          </div>
        </div>


        {/* Expense Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Expense Breakdown</h3>
          <div className="space-y-3">
            {expenseBreakdown.map(([category, amount]) => (
              <div key={category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-slate-700 capitalize">{category.replace('_', ' ')}</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(amount)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${(amount / maxCategoryExpense) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {expenseBreakdown.length === 0 && (
              <p className="text-sm text-slate-400">No expense data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Trip Stats */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Trip Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Total Trips</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{totalTrips}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Avg Freight / Trip</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(avgFreightPerTrip)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Total KM</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{totalKm.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Revenue / KM</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(revenuePerKm)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
