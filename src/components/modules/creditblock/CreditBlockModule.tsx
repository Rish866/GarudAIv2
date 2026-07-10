import React, { useState, useMemo } from 'react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { ShieldAlert, ShieldCheck, AlertTriangle, Lock, Unlock, Search, Ban } from 'lucide-react';

export default function CreditBlockModule() {
  const { customers, invoices, updateCustomer } = useStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'blocked' | 'at_risk' | 'clear'>('all');

  const customerCreditData = useMemo(() => {
    return customers.map(c => {
      const custInvoices = invoices.filter(i => i.customer_id === c.id);
      const totalOutstanding = custInvoices.reduce((s, i) => s + i.balance_amount, 0);
      const overdueInvoices = custInvoices.filter(i => {
        if (i.balance_amount <= 0) return false;
        const due = new Date(i.due_date);
        return due < new Date();
      });
      const totalOverdue = overdueInvoices.reduce((s, i) => s + i.balance_amount, 0);
      const oldestOverdueDays = overdueInvoices.length > 0
        ? Math.max(...overdueInvoices.map(i => Math.floor((Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24))))
        : 0;
      const creditUtilization = c.credit_limit > 0 ? (totalOutstanding / c.credit_limit * 100) : 0;
      const isOverLimit = totalOutstanding > c.credit_limit && c.credit_limit > 0;
      const isOverdue = oldestOverdueDays > c.credit_days;
      const shouldBlock = isOverLimit || isOverdue;
      const riskLevel: 'blocked' | 'at_risk' | 'clear' =
        c.status === 'blocked' ? 'blocked' :
        shouldBlock || creditUtilization > 80 ? 'at_risk' : 'clear';
      return { ...c, totalOutstanding, totalOverdue, overdueCount: overdueInvoices.length, oldestOverdueDays, creditUtilization, isOverLimit, isOverdue, shouldBlock, riskLevel };
    });
  }, [customers, invoices]);

  const filteredData = customerCreditData.filter(c => {
    if (filter !== 'all' && c.riskLevel !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const blockedCount = customerCreditData.filter(c => c.riskLevel === 'blocked').length;
  const atRiskCount = customerCreditData.filter(c => c.riskLevel === 'at_risk').length;
  const clearCount = customerCreditData.filter(c => c.riskLevel === 'clear').length;
  const totalOverdue = customerCreditData.reduce((s, c) => s + c.totalOverdue, 0);

  const toggleBlock = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    const newStatus = customer.status === 'blocked' ? 'active' : 'blocked';
    updateCustomer(customerId, { status: newStatus as any });
  };

  const riskBadge = (level: string) => {
    if (level === 'blocked') return 'bg-red-100 text-red-800';
    if (level === 'at_risk') return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Customer Credit Control</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Monitor credit limits, auto-block overdue customers, prevent bad debt</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
          <ShieldAlert className="w-4 h-4" /> Auto-block: When outstanding &gt; credit limit OR overdue &gt; credit days
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><Ban className="w-4 h-4 text-red-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Blocked</p></div>
          <p className="text-2xl font-bold mt-1 text-red-600">{blockedCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>At Risk</p></div>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{atRiskCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Clear</p></div>
          <p className="text-2xl font-bold mt-1 text-green-600">{clearCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Overdue</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatCurrency(totalOverdue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        {(['all', 'blocked', 'at_risk', 'clear'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={classNames('px-4 py-2 text-sm rounded-lg font-medium', filter === f ? 'bg-blue-600 text-white' : '')} style={filter !== f ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {f === 'all' ? 'All' : f === 'at_risk' ? 'At Risk' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Customer Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Customer</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Credit Limit</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Outstanding</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Overdue</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Utilization</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Overdue Days</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Risk</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(c => (
                <tr key={c.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{c.contact_person}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(c.credit_limit)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: c.isOverLimit ? 'red' : 'var(--text-primary)' }}>{formatCurrency(c.totalOutstanding)}</td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">{formatCurrency(c.totalOverdue)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={classNames('h-full rounded-full', c.creditUtilization > 90 ? 'bg-red-500' : c.creditUtilization > 70 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${Math.min(100, c.creditUtilization)}%` }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{c.creditUtilization.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-center" style={{ color: c.oldestOverdueDays > 0 ? 'red' : 'var(--text-secondary)' }}>{c.oldestOverdueDays > 0 ? `${c.oldestOverdueDays}d` : '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={classNames('px-2 py-1 rounded-full text-xs font-medium', riskBadge(c.riskLevel))}>{c.riskLevel === 'at_risk' ? 'At Risk' : c.riskLevel}</span></td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleBlock(c.id)} className={classNames('p-1.5 rounded-lg', c.status === 'blocked' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>
                      {c.status === 'blocked' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
