import { useState, useEffect, useCallback } from 'react';
import type { Trip } from '../../../types';
import { useModuleData } from '../../../hooks/useModuleData';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { useStore } from '../../../store/useStore';
import { formatCurrency } from '../../../lib/utils';
import { generateTripReportPDF } from '../../../lib/pdf';
import {
  generateProfitAndLoss,
  generateReceivableAging,
  generateVehicleProfitability,
  generateCashFlow,
  type ProfitAndLoss,
  type CustomerAging,
  type VehicleProfitability,
  type CashFlowStatement,
} from '../../../lib/financialStatements';

type ReportTab = 'pnl' | 'aging' | 'vehicles' | 'cashflow';

export default function ReportsModule() {
  const { company } = useStore();
  const { organizationId } = useOrganization();
  const { data: trips } = useModuleData<Trip>('trips');

  const [activeTab, setActiveTab] = useState<ReportTab>('pnl');
  const [dateRange, setDateRange] = useState<'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Report data from financial statements engine (single source of truth)
  const [pnl, setPnl] = useState<ProfitAndLoss | null>(null);
  const [aging, setAging] = useState<CustomerAging[]>([]);
  const [vehicleProfit, setVehicleProfit] = useState<VehicleProfitability[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null);

  // Compute period dates
  const getDateRange = useCallback((): { from: string; to: string } => {
    const now = new Date();
    switch (dateRange) {
      case 'this_month': {
        const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        return { from, to };
      }
      case 'last_month': {
        const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        return { from, to };
      }
      case 'this_quarter': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        const from = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
        const to = new Date(now.getFullYear(), qMonth + 3, 0).toISOString().split('T')[0];
        return { from, to };
      }
      case 'this_year': {
        // Indian financial year: April to March
        const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const from = `${fyStart}-04-01`;
        const to = `${fyStart + 1}-03-31`;
        return { from, to };
      }
      case 'custom':
        return { from: startDate || '2020-01-01', to: endDate || now.toISOString().split('T')[0] };
      default:
        return { from: '2020-01-01', to: now.toISOString().split('T')[0] };
    }
  }, [dateRange, startDate, endDate]);

  // Fetch report data from financial statements engine
  const fetchReports = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      const [pnlData, agingData, vehicleData, cashFlowData] = await Promise.all([
        generateProfitAndLoss(organizationId, from, to),
        generateReceivableAging(organizationId),
        generateVehicleProfitability(organizationId, from, to),
        generateCashFlow(organizationId, from, to),
      ]);
      setPnl(pnlData);
      setAging(agingData);
      setVehicleProfit(vehicleData);
      setCashFlow(cashFlowData);
    } finally {
      setLoading(false);
    }
  }, [organizationId, getDateRange]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'pnl', label: 'Profit & Loss' },
    { key: 'aging', label: 'Receivable Aging' },
    { key: 'vehicles', label: 'Vehicle Profitability' },
    { key: 'cashflow', label: 'Cash Flow' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Financial Reports</h2>
        <button
          onClick={() => generateTripReportPDF(trips, company, 'Business Report')}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Export PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border-color)' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}
            style={activeTab !== tab.key ? { color: 'var(--text-secondary)' } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          className="px-3 py-2 border rounded-lg text-sm outline-none"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}
        >
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This FY</option>
          <option value="custom">Custom Range</option>
        </select>
        {dateRange === 'custom' && (
          <>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>to</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }} />
          </>
        )}
        {loading && <span className="text-xs text-blue-500 animate-pulse">Loading...</span>}
      </div>

      {/* P&L Tab */}
      {activeTab === 'pnl' && pnl && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p>
              <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pnl.revenue.totalRevenue)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(pnl.expenses.totalExpenses)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Net Profit</p>
              <p className={`text-2xl font-bold mt-1 ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(pnl.netProfit)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Profit Margin</p>
              <p className={`text-2xl font-bold mt-1 ${pnl.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pnl.profitMargin}%</p>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Revenue Breakdown</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Freight</p><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pnl.revenue.freight)}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Detention</p><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pnl.revenue.detention)}</p></div>
              <div><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Other</p><p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(pnl.revenue.other)}</p></div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Expense Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(pnl.expenses).filter(([k]) => k !== 'totalExpenses').map(([category, amount]) => (
                <div key={category}>
                  <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{category.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(amount as number)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aging Tab */}
      {activeTab === 'aging' && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Customer</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Current</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>1-30</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>31-60</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>61-90</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>90+</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {aging.map(row => (
                <tr key={row.customerId} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.customerName}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(row.aging.current)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(row.aging.days30)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(row.aging.days60)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(row.aging.days90)}</td>
                  <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(row.aging.days120 + row.aging.days120plus)}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(row.aging.total)}</td>
                </tr>
              ))}
              {aging.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--text-tertiary)' }}>No outstanding receivables</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Vehicle Profitability Tab */}
      {activeTab === 'vehicles' && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-secondary)' }}>Vehicle</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Trips</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Revenue</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Fuel</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Maint.</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Profit</th>
                <th className="px-4 py-3 text-right font-medium" style={{ color: 'var(--text-secondary)' }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {vehicleProfit.map(v => (
                <tr key={v.vehicleId} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{v.vehicleReg}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{v.totalTrips}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(v.totalRevenue)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(v.fuelCost)}</td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--text-secondary)' }}>{formatCurrency(v.maintenanceCost)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${v.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(v.profit)}</td>
                  <td className={`px-4 py-3 text-right ${v.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{v.profitMargin}%</td>
                </tr>
              ))}
              {vehicleProfit.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--text-tertiary)' }}>No vehicle data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Cash Flow Tab */}
      {activeTab === 'cashflow' && cashFlow && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Inflows</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(cashFlow.inflows.totalInflow)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Outflows</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(cashFlow.outflows.totalOutflow)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Net Cash Flow</p>
              <p className={`text-2xl font-bold mt-1 ${cashFlow.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(cashFlow.netCashFlow)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inflows Detail */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Inflows</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Customer Payments</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.inflows.customerPayments)}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Other Receipts</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.inflows.otherReceipts)}</span></div>
              </div>
            </div>
            {/* Outflows Detail */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Outflows</h3>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fuel</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.outflows.fuelExpenses)}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Driver Payments</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.outflows.driverPayments)}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Maintenance</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.outflows.maintenanceExpenses)}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Vendor Payments</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.outflows.vendorPayments)}</span></div>
                <div className="flex justify-between"><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Other</span><span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(cashFlow.outflows.otherExpenses)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
