import React, { useState, useMemo } from 'react';
import type { Vehicle, Customer, Trip, Invoice, Expense, FuelEntry } from '../../../types';
import { useModuleData } from '../../../hooks/useModuleData';
import { useBranch } from '../../../contexts/BranchContext';
import { formatCurrency, classNames } from '../../../lib/utils';
import { TrendingUp, TrendingDown, Filter, Download, AlertTriangle, Info } from 'lucide-react';

type GroupBy = 'customer' | 'vehicle' | 'route' | 'branch' | 'month';
type DateRange = 'all' | 'this_month' | 'last_month' | 'this_quarter' | 'this_fy' | 'custom';

export default function ProfitabilityModule() {
  const { data: trips } = useModuleData<Trip>('trips');
  const { data: expenses } = useModuleData<Expense>('expenses');
  const { data: fuelEntries } = useModuleData<FuelEntry>('fuel_entries');
  const { data: invoices } = useModuleData<Invoice>('invoices');
  const { data: customers } = useModuleData<Customer>('customers');
  const { data: vehicles } = useModuleData<Vehicle>('vehicles');
  const { accessibleBranches } = useBranch();

  const [groupBy, setGroupBy] = useState<GroupBy>('customer');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');


  // ─── Build cost lookup maps from ACTUAL data ────────────────────────────────

  /** Expenses by trip_id — actual recorded costs */
  const expensesByTrip = useMemo(() => {
    const map: Record<string, { total: number; breakdown: Record<string, number> }> = {};
    expenses.forEach(exp => {
      if (!exp.trip_id) return;
      if (!map[exp.trip_id]) map[exp.trip_id] = { total: 0, breakdown: {} };
      map[exp.trip_id].total += exp.amount;
      const cat = exp.category || 'misc';
      map[exp.trip_id].breakdown[cat] = (map[exp.trip_id].breakdown[cat] || 0) + exp.amount;
    });
    return map;
  }, [expenses]);

  /** Fuel by trip_id — actual diesel costs */
  const fuelByTrip = useMemo(() => {
    const map: Record<string, number> = {};
    fuelEntries.forEach(entry => {
      if (!entry.trip_id) return;
      map[entry.trip_id] = (map[entry.trip_id] || 0) + entry.amount;
    });
    return map;
  }, [fuelEntries]);

  /** Fuel by vehicle_id — for vehicle-level analysis when trip_id not linked */
  const fuelByVehicle = useMemo(() => {
    const map: Record<string, number> = {};
    fuelEntries.forEach(entry => {
      if (!entry.vehicle_id) return;
      map[entry.vehicle_id] = (map[entry.vehicle_id] || 0) + entry.amount;
    });
    return map;
  }, [fuelEntries]);

  /** Expenses by vehicle_id — for unlinked expenses */
  const expensesByVehicle = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(exp => {
      if (!exp.vehicle_id) return;
      map[exp.vehicle_id] = (map[exp.vehicle_id] || 0) + exp.amount;
    });
    return map;
  }, [expenses]);

  // ─── Date filtering ──────────────────────────────────────────────────────────

  const filteredTrips = useMemo(() => {
    if (dateRange === 'all') return trips;
    const now = new Date();
    return trips.filter(t => {
      const d = new Date(t.booking_date);
      switch (dateRange) {
        case 'this_month':
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case 'last_month': {
          const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0);
          return d >= lm && d <= lmEnd;
        }
        case 'this_quarter': {
          const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          return d >= qStart && d <= now;
        }
        case 'this_fy': {
          // Indian financial year: April to March
          const fyStart = now.getMonth() >= 3
            ? new Date(now.getFullYear(), 3, 1)
            : new Date(now.getFullYear() - 1, 3, 1);
          return d >= fyStart && d <= now;
        }
        case 'custom':
          if (customFrom && d < new Date(customFrom)) return false;
          if (customTo && d > new Date(customTo)) return false;
          return true;
        default:
          return true;
      }
    });
  }, [trips, dateRange, customFrom, customTo]);


  // ─── Calculate trip profit using ACTUAL data ─────────────────────────────────

  const calcTripProfit = (trip: Trip) => {
    const revenue = (trip.freight_amount || 0) + (trip.detention_charges || 0) + (trip.other_charges || 0);

    // ACTUAL costs from expense/fuel records linked to this trip
    const actualFuel = fuelByTrip[trip.id] || 0;
    const actualExpenses = expensesByTrip[trip.id]?.total || 0;
    const hasActualData = actualFuel > 0 || actualExpenses > 0;

    // Total actual cost = fuel + all other expenses (toll, bata, loading, etc.)
    // Fuel entries are separate from expenses in the schema, so add both.
    // But avoid double-counting: expenses with category 'diesel' might overlap.
    const expenseBreakdown = expensesByTrip[trip.id]?.breakdown || {};
    const dieselFromExpenses = expenseBreakdown['diesel'] || 0;

    // If fuel is tracked separately AND also in expenses, use the larger value
    const fuelCost = Math.max(actualFuel, dieselFromExpenses);
    const nonFuelExpenses = actualExpenses - dieselFromExpenses;
    const totalCost = fuelCost + nonFuelExpenses;

    const profit = revenue - totalCost;
    const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

    return { revenue, totalCost, profit, margin, hasActualData };
  };

  // ─── Track data quality ──────────────────────────────────────────────────────

  const profitData = useMemo(() => {
    const grouped: Record<string, {
      label: string;
      trips: number;
      tripsWithData: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }> = {};

    filteredTrips.forEach(trip => {
      const { revenue, totalCost, profit, hasActualData } = calcTripProfit(trip);
      let key = '';
      let label = '';

      switch (groupBy) {
        case 'customer':
          key = trip.customer_id || 'unknown';
          label = trip.customer_name || 'Unknown Customer';
          break;
        case 'vehicle':
          key = trip.vehicle_id || 'unassigned';
          label = trip.vehicle_reg || 'Unassigned';
          break;
        case 'route':
          key = `${trip.origin || ''}-${trip.destination || ''}`;
          label = `${trip.origin || '?'} → ${trip.destination || '?'}`;
          break;
        case 'branch':
          key = trip.branch_id || 'all';
          label = accessibleBranches.find(b => b.id === trip.branch_id)?.name || 'All Branches';
          break;
        case 'month': {
          const d = new Date(trip.booking_date);
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          break;
        }
      }

      if (!key) return;
      if (!grouped[key]) grouped[key] = { label, trips: 0, tripsWithData: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
      grouped[key].trips += 1;
      if (hasActualData) grouped[key].tripsWithData += 1;
      grouped[key].revenue += revenue;
      grouped[key].cost += totalCost;
      grouped[key].profit += profit;
    });

    // Calculate margins
    Object.values(grouped).forEach(g => {
      g.margin = g.revenue > 0 ? Math.round(g.profit / g.revenue * 100) : 0;
    });

    return Object.values(grouped).sort((a, b) => b.profit - a.profit);
  }, [filteredTrips, groupBy, accessibleBranches, expensesByTrip, fuelByTrip]);

  // ─── Aggregates ──────────────────────────────────────────────────────────────

  const totalRevenue = profitData.reduce((s, d) => s + d.revenue, 0);
  const totalCost = profitData.reduce((s, d) => s + d.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0;
  const totalTrips = profitData.reduce((s, d) => s + d.trips, 0);
  const tripsWithData = profitData.reduce((s, d) => s + d.tripsWithData, 0);
  const dataQuality = totalTrips > 0 ? Math.round((tripsWithData / totalTrips) * 100) : 0;


  // ─── Export ────────────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const headers = ['Group', 'Trips', 'Trips with Cost Data', 'Revenue (₹)', 'Cost (₹)', 'Profit (₹)', 'Margin %'];
    const rows = profitData.map(d => [d.label, d.trips, d.tripsWithData, d.revenue, d.cost, d.profit, d.margin]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profitability-by-${groupBy}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Profitability Analysis</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Revenue vs actual costs • {filteredTrips.length} trips analyzed
          </p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:opacity-80 transition-opacity" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Data Quality Banner */}
      {totalTrips > 0 && dataQuality < 80 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {dataQuality}% of trips have linked expense/fuel data
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Trips without linked expenses show ₹0 cost. Link expenses to trips for accurate profitability.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{totalTrips} trips</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Total Cost</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalCost)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{tripsWithData} trips with data</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Net Profit</p>
          <p className={classNames('text-2xl font-bold mt-1', totalProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatCurrency(totalProfit)}
          </p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Avg Margin</p>
          <p className={classNames('text-2xl font-bold mt-1', avgMargin >= 20 ? 'text-green-600' : avgMargin >= 0 ? 'text-yellow-600' : 'text-red-600')}>
            {avgMargin}%
          </p>
        </div>
      </div>


      {/* Filters Row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Group By */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Group:</span>
          {(['customer', 'vehicle', 'route', 'branch', 'month'] as GroupBy[]).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={classNames('px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-colors', groupBy === g ? 'bg-blue-600 text-white' : '')}
              style={groupBy !== g ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Period:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="text-xs border rounded-lg px-2 py-1.5"
            style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_fy">This Financial Year</option>
            <option value="custom">Custom Range</option>
          </select>
          {dateRange === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="text-xs border rounded-lg px-2 py-1.5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </>
          )}
        </div>
      </div>

      {/* Profitability Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>{groupBy}</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Trips</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Data %</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Actual Cost</th>
                <th className="text-right px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Profit</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Margin</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase" style={{ color: 'var(--text-tertiary)' }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {profitData.map((row, idx) => {
                const dataPercent = row.trips > 0 ? Math.round((row.tripsWithData / row.trips) * 100) : 0;
                return (
                  <tr key={idx} className="border-t hover:bg-[var(--bg-secondary)] transition-colors" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.label || '—'}</td>
                    <td className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{row.trips}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={classNames('px-2 py-0.5 rounded text-xs font-medium', dataPercent >= 80 ? 'bg-green-100 text-green-700' : dataPercent >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')}>
                        {dataPercent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(row.cost)}</td>
                    <td className="px-4 py-3 text-sm text-right font-bold" style={{ color: row.profit >= 0 ? '#16a34a' : '#dc2626' }}>
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={classNames('px-2 py-1 rounded-full text-xs font-bold', row.margin >= 25 ? 'bg-green-100 text-green-800' : row.margin >= 10 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>
                        {row.margin}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.margin >= 15 ? <TrendingUp className="w-4 h-4 text-green-500 mx-auto" /> : <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {profitData.length === 0 && (
          <div className="p-12 text-center">
            <Info className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No trip data available</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Create trips and record expenses to see profitability analysis</p>
          </div>
        )}
      </div>

      {/* Methodology Note */}
      <div className="flex items-start gap-2 p-4 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>How costs are calculated</p>
          <p className="mt-1">
            Revenue = Freight + Detention + Other Charges (from trip record).
            Cost = Fuel entries + Expenses (diesel, toll, bata, loading, unloading, repairs) linked to this trip.
            Trips without linked expenses show ₹0 cost — link expenses via the trip reference when recording them.
          </p>
        </div>
      </div>
    </div>
  );
}
