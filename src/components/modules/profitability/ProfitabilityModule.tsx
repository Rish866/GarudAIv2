import React, { useState, useMemo } from 'react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, classNames } from '../../../lib/utils';
import { TrendingUp, TrendingDown, BarChart3, Filter, Download } from 'lucide-react';

type GroupBy = 'customer' | 'vehicle' | 'route' | 'branch' | 'month';

export default function ProfitabilityModule() {
  const { trips, expenses, fuelEntries, invoices, customers, vehicles, branches } = useStore();
  const [groupBy, setGroupBy] = useState<GroupBy>('customer');

  const calcTripProfit = (trip: typeof trips[0]) => {
    const revenue = trip.freight_amount + trip.detention_charges + trip.other_charges;
    const fuelCost = trip.distance_km > 0 ? Math.round(trip.distance_km * 3.5 * 95 / 4.5) : 0;
    const tollCost = Math.round(trip.distance_km * 2.8);
    const driverBata = Math.round(trip.distance_km * 1.5);
    const otherCosts = 2000;
    const totalCost = fuelCost + tollCost + driverBata + otherCosts;
    return { revenue, totalCost, profit: revenue - totalCost, margin: revenue > 0 ? Math.round((revenue - totalCost) / revenue * 100) : 0 };
  };

  const profitData = useMemo(() => {
    const grouped: Record<string, { label: string; trips: number; revenue: number; cost: number; profit: number; margin: number }> = {};

    trips.forEach(trip => {
      const { revenue, totalCost, profit } = calcTripProfit(trip);
      let key = '';
      let label = '';

      switch (groupBy) {
        case 'customer': key = trip.customer_id; label = trip.customer_name; break;
        case 'vehicle': key = trip.vehicle_id; label = trip.vehicle_reg || 'Unassigned'; break;
        case 'route': key = `${trip.origin}-${trip.destination}`; label = `${trip.origin} → ${trip.destination}`; break;
        case 'branch': key = trip.branch_id || 'all'; label = branches.find(b => b.id === trip.branch_id)?.name || 'All Branches'; break;
        case 'month': const d = new Date(trip.booking_date); key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }); break;
      }

      if (!grouped[key]) grouped[key] = { label, trips: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
      grouped[key].trips += 1;
      grouped[key].revenue += revenue;
      grouped[key].cost += totalCost;
      grouped[key].profit += profit;
    });

    // Calculate margins
    Object.values(grouped).forEach(g => { g.margin = g.revenue > 0 ? Math.round(g.profit / g.revenue * 100) : 0; });

    return Object.values(grouped).sort((a, b) => b.profit - a.profit);
  }, [trips, groupBy, branches]);

  const totalRevenue = profitData.reduce((s, d) => s + d.revenue, 0);
  const totalCost = profitData.reduce((s, d) => s + d.cost, 0);
  const totalProfit = profitData.reduce((s, d) => s + d.profit, 0);
  const avgMargin = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0;

  const exportCSV = () => {
    const headers = ['Group', 'Trips', 'Revenue', 'Cost', 'Profit', 'Margin %'];
    const rows = profitData.map(d => [d.label, d.trips, d.revenue, d.cost, d.profit, d.margin]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `profitability-by-${groupBy}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Profitability Analysis</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Revenue vs Cost breakdown by customer, vehicle, route, branch, or month</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Cost</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalCost)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Net Profit</p>
          <p className={classNames('text-2xl font-bold mt-1', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(totalProfit)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Avg Margin</p>
          <p className={classNames('text-2xl font-bold mt-1', avgMargin >= 20 ? 'text-green-600' : avgMargin >= 0 ? 'text-yellow-600' : 'text-red-600')}>{avgMargin}%</p>
        </div>
      </div>

      {/* Group By Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Group by:</span>
        {(['customer', 'vehicle', 'route', 'branch', 'month'] as GroupBy[]).map(g => (
          <button key={g} onClick={() => setGroupBy(g)} className={classNames('px-4 py-2 text-sm rounded-lg font-medium capitalize', groupBy === g ? 'bg-blue-600 text-white' : '')} style={groupBy !== g ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {g}
          </button>
        ))}
      </div>

      {/* Profitability Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>{groupBy}</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Trips</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Profit</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Margin</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {profitData.map((row, idx) => (
                <tr key={idx} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.label}</td>
                  <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{row.trips}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(row.cost)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold" style={{ color: row.profit >= 0 ? '#16a34a' : '#dc2626' }}>{formatCurrency(row.profit)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={classNames('px-2 py-1 rounded-full text-xs font-bold', row.margin >= 25 ? 'bg-green-100 text-green-800' : row.margin >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>{row.margin}%</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.margin >= 20 ? <TrendingUp className="w-4 h-4 text-green-500 mx-auto" /> : <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {profitData.length === 0 && <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>No trip data available</div>}
      </div>
    </div>
  );
}
