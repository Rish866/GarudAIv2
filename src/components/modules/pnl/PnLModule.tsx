import React, { useState, useMemo } from 'react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, classNames } from '../../../lib/utils';
import { TrendingUp, TrendingDown, DollarSign, Download, Calendar, BarChart3, PieChart } from 'lucide-react';

type ViewMode = 'pnl' | 'balance_sheet';
type PeriodFilter = 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all';

export default function PnLModule() {
  const { invoices, expenses, payments, fuelEntries, maintenance } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('pnl');
  const [period, setPeriod] = useState<PeriodFilter>('this_month');

  // Period filter logic
  const getDateRange = (p: PeriodFilter): { start: Date; end: Date } => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;
    switch (p) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end.setDate(0); // last day of previous month
        break;
      case 'this_quarter':
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), qMonth, 1);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 3, 1); // Indian FY starts April
        if (now.getMonth() < 3) start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start = new Date(2020, 0, 1);
    }
    return { start, end };
  };

  const { start, end } = getDateRange(period);
  const inRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= start && d <= end;
  };

  // Revenue calculations
  const revenue = useMemo(() => {
    const freightRevenue = invoices.filter(i => inRange(i.invoice_date)).reduce((s, i) => s + i.freight_total, 0);
    const detentionRevenue = invoices.filter(i => inRange(i.invoice_date)).reduce((s, i) => s + i.detention_total, 0);
    const otherRevenue = invoices.filter(i => inRange(i.invoice_date)).reduce((s, i) => s + i.other_charges, 0);
    const gstCollected = invoices.filter(i => inRange(i.invoice_date)).reduce((s, i) => s + i.gst_amount, 0);
    return { freightRevenue, detentionRevenue, otherRevenue, gstCollected, total: freightRevenue + detentionRevenue + otherRevenue };
  }, [invoices, period]);

  // Expense calculations
  const expenseData = useMemo(() => {
    const diesel = expenses.filter(e => inRange(e.date) && e.category === 'diesel').reduce((s, e) => s + e.amount, 0)
      + fuelEntries.filter(f => inRange(f.date)).reduce((s, f) => s + f.amount, 0);
    const toll = expenses.filter(e => inRange(e.date) && e.category === 'toll').reduce((s, e) => s + e.amount, 0);
    const driverBata = expenses.filter(e => inRange(e.date) && e.category === 'driver_bata').reduce((s, e) => s + e.amount, 0);
    const repair = expenses.filter(e => inRange(e.date) && (e.category === 'repair' || e.category === 'tyre')).reduce((s, e) => s + e.amount, 0)
      + maintenance.filter(m => inRange(m.date)).reduce((s, m) => s + m.cost, 0);
    const loading = expenses.filter(e => inRange(e.date) && (e.category === 'loading' || e.category === 'unloading')).reduce((s, e) => s + e.amount, 0);
    const insurance = expenses.filter(e => inRange(e.date) && e.category === 'insurance').reduce((s, e) => s + e.amount, 0);
    const emi = expenses.filter(e => inRange(e.date) && e.category === 'emi').reduce((s, e) => s + e.amount, 0);
    const salary = expenses.filter(e => inRange(e.date) && e.category === 'salary').reduce((s, e) => s + e.amount, 0);
    const office = expenses.filter(e => inRange(e.date) && e.category === 'office').reduce((s, e) => s + e.amount, 0);
    const misc = expenses.filter(e => inRange(e.date) && e.category === 'misc').reduce((s, e) => s + e.amount, 0);
    const total = diesel + toll + driverBata + repair + loading + insurance + emi + salary + office + misc;
    return { diesel, toll, driverBata, repair, loading, insurance, emi, salary, office, misc, total };
  }, [expenses, fuelEntries, maintenance, period]);

  const netProfit = revenue.total - expenseData.total;
  const profitMargin = revenue.total > 0 ? (netProfit / revenue.total * 100).toFixed(1) : '0.0';

  // Balance Sheet calculations
  const balanceSheet = useMemo(() => {
    const totalReceivables = invoices.reduce((s, i) => s + i.balance_amount, 0);
    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0) + fuelEntries.reduce((s, f) => s + f.amount, 0) + maintenance.reduce((s, m) => s + m.cost, 0);
    const retainedEarnings = totalRevenue - totalExpenses;
    return { totalReceivables, totalReceived, totalRevenue, totalExpenses, retainedEarnings };
  }, [invoices, payments, expenses, fuelEntries, maintenance]);

  const exportCSV = () => {
    let csv = '';
    if (viewMode === 'pnl') {
      csv = 'Category,Amount\n';
      csv += `Freight Revenue,${revenue.freightRevenue}\n`;
      csv += `Detention Revenue,${revenue.detentionRevenue}\n`;
      csv += `Other Revenue,${revenue.otherRevenue}\n`;
      csv += `TOTAL REVENUE,${revenue.total}\n\n`;
      csv += `Diesel/Fuel,${expenseData.diesel}\n`;
      csv += `Toll,${expenseData.toll}\n`;
      csv += `Driver Bata,${expenseData.driverBata}\n`;
      csv += `Repair & Maintenance,${expenseData.repair}\n`;
      csv += `Loading/Unloading,${expenseData.loading}\n`;
      csv += `Insurance,${expenseData.insurance}\n`;
      csv += `EMI,${expenseData.emi}\n`;
      csv += `Salary,${expenseData.salary}\n`;
      csv += `Office,${expenseData.office}\n`;
      csv += `Miscellaneous,${expenseData.misc}\n`;
      csv += `TOTAL EXPENSES,${expenseData.total}\n\n`;
      csv += `NET PROFIT,${netProfit}\n`;
    } else {
      csv = 'Item,Amount\n';
      csv += `Accounts Receivable,${balanceSheet.totalReceivables}\n`;
      csv += `Cash Received,${balanceSheet.totalReceived}\n`;
      csv += `Total Revenue (All Time),${balanceSheet.totalRevenue}\n`;
      csv += `Total Expenses (All Time),${balanceSheet.totalExpenses}\n`;
      csv += `Retained Earnings,${balanceSheet.retainedEarnings}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewMode}-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Profit & Loss / Balance Sheet</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Auto-generated financial statements from your operations data</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Toggle & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
          <button onClick={() => setViewMode('pnl')} className={classNames('px-4 py-2 text-sm font-medium', viewMode === 'pnl' ? 'bg-blue-600 text-white' : '')} style={viewMode !== 'pnl' ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <TrendingUp className="w-4 h-4 inline mr-1" /> Profit & Loss
          </button>
          <button onClick={() => setViewMode('balance_sheet')} className={classNames('px-4 py-2 text-sm font-medium', viewMode === 'balance_sheet' ? 'bg-blue-600 text-white' : '')} style={viewMode !== 'balance_sheet' ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <BarChart3 className="w-4 h-4 inline mr-1" /> Balance Sheet
          </button>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value as PeriodFilter)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="this_quarter">This Quarter</option>
          <option value="this_year">This FY (Apr-Mar)</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {viewMode === 'pnl' ? (
        <>
          {/* P&L Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Revenue</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(revenue.total)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Expenses</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(expenseData.total)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Net Profit</p>
              </div>
              <p className={classNames('text-2xl font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(netProfit)}</p>
            </div>
            <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 mb-1">
                <PieChart className="w-4 h-4 text-purple-500" />
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Profit Margin</p>
              </div>
              <p className={classNames('text-2xl font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>{profitMargin}%</p>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Revenue
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Freight Revenue', amount: revenue.freightRevenue },
                  { label: 'Detention Charges', amount: revenue.detentionRevenue },
                  { label: 'Other Income', amount: revenue.otherRevenue },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span style={{ color: 'var(--text-primary)' }}>TOTAL REVENUE</span>
                  <span className="text-green-600">{formatCurrency(revenue.total)}</span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" /> Expenses
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Diesel / Fuel', amount: expenseData.diesel },
                  { label: 'Toll Charges', amount: expenseData.toll },
                  { label: 'Driver Bata / Allowance', amount: expenseData.driverBata },
                  { label: 'Repair & Maintenance', amount: expenseData.repair },
                  { label: 'Loading / Unloading', amount: expenseData.loading },
                  { label: 'Insurance', amount: expenseData.insurance },
                  { label: 'EMI / Finance', amount: expenseData.emi },
                  { label: 'Salary & Wages', amount: expenseData.salary },
                  { label: 'Office & Admin', amount: expenseData.office },
                  { label: 'Miscellaneous', amount: expenseData.misc },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-1.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span style={{ color: 'var(--text-primary)' }}>TOTAL EXPENSES</span>
                  <span className="text-red-600">{formatCurrency(expenseData.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Profit Bar */}
          <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>NET PROFIT / (LOSS)</h3>
              <p className={classNames('text-2xl font-bold', netProfit >= 0 ? 'text-green-600' : 'text-red-600')}>
                {netProfit >= 0 ? '' : '('}{formatCurrency(Math.abs(netProfit))}{netProfit < 0 ? ')' : ''}
              </p>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              GST Collected: {formatCurrency(revenue.gstCollected)} (not included in revenue — liability)
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Balance Sheet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold text-blue-700 mb-4">ASSETS</h3>
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Current Assets</div>
                {[
                  { label: 'Cash & Bank (Received)', amount: balanceSheet.totalReceived },
                  { label: 'Accounts Receivable (Outstanding)', amount: balanceSheet.totalReceivables },
                  { label: 'Fuel Card Balance (Estimated)', amount: 50000 },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 font-bold border-t-2" style={{ borderColor: 'var(--border-color)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>TOTAL ASSETS</span>
                  <span className="text-blue-600">{formatCurrency(balanceSheet.totalReceived + balanceSheet.totalReceivables + 50000)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities + Equity */}
            <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <h3 className="font-semibold text-orange-700 mb-4">LIABILITIES & EQUITY</h3>
              <div className="space-y-3">
                <div className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>Current Liabilities</div>
                {[
                  { label: 'GST Payable', amount: invoices.reduce((s, i) => s + i.gst_amount, 0) },
                  { label: 'TDS Payable', amount: invoices.reduce((s, i) => s + i.tds_amount, 0) },
                  { label: 'Driver Advances Outstanding', amount: 85000 },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                <div className="text-xs font-medium uppercase tracking-wider mt-4 mb-2" style={{ color: 'var(--text-tertiary)' }}>Owner's Equity</div>
                <div className="flex justify-between items-center py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Retained Earnings</span>
                  <span className={classNames('text-sm font-medium', balanceSheet.retainedEarnings >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(balanceSheet.retainedEarnings)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 font-bold border-t-2" style={{ borderColor: 'var(--border-color)' }}>
                  <span style={{ color: 'var(--text-primary)' }}>TOTAL LIABILITIES & EQUITY</span>
                  <span className="text-orange-600">{formatCurrency(invoices.reduce((s, i) => s + i.gst_amount + i.tds_amount, 0) + 85000 + balanceSheet.retainedEarnings)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
