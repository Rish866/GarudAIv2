import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { AlertTriangle, CheckCircle, Clock, Shield, FileText, Bell, Download, Filter } from 'lucide-react';

interface ExpiryItem {
  id: string;
  entity_type: 'vehicle' | 'driver';
  entity_name: string;
  entity_id: string;
  document_type: string;
  expiry_date: string;
  days_remaining: number;
  urgency: 'expired' | 'critical' | 'warning' | 'ok';
}

export default function ExpiryDashboardModule() {
  const { vehicles, drivers } = useStore();
  const [filter, setFilter] = useState<'all' | 'expired' | 'critical' | 'warning' | 'ok'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'vehicle' | 'driver'>('all');

  const today = new Date();

  const getDaysRemaining = (dateStr: string): number => {
    if (!dateStr) return 999;
    const expDate = new Date(dateStr);
    return Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getUrgency = (days: number): ExpiryItem['urgency'] => {
    if (days < 0) return 'expired';
    if (days <= 7) return 'critical';
    if (days <= 30) return 'warning';
    return 'ok';
  };

  // Build expiry items from vehicles and drivers
  const expiryItems: ExpiryItem[] = useMemo(() => {
    const items: ExpiryItem[] = [];

    vehicles.forEach(v => {
      const docs = [
        { type: 'Insurance', date: v.insurance_expiry },
        { type: 'Fitness Certificate', date: v.fitness_expiry },
        { type: 'PUC/Pollution', date: v.puc_expiry },
        { type: 'Permit', date: v.permit_expiry },
      ];
      docs.forEach(doc => {
        if (doc.date) {
          const days = getDaysRemaining(doc.date);
          items.push({
            id: `${v.id}_${doc.type}`,
            entity_type: 'vehicle',
            entity_name: v.reg_number,
            entity_id: v.id,
            document_type: doc.type,
            expiry_date: doc.date,
            days_remaining: days,
            urgency: getUrgency(days),
          });
        }
      });
    });

    drivers.forEach(d => {
      if (d.license_expiry) {
        const days = getDaysRemaining(d.license_expiry);
        items.push({
          id: `${d.id}_license`,
          entity_type: 'driver',
          entity_name: d.name,
          entity_id: d.id,
          document_type: 'Driving License',
          expiry_date: d.license_expiry,
          days_remaining: days,
          urgency: getUrgency(days),
        });
      }
    });

    return items.sort((a, b) => a.days_remaining - b.days_remaining);
  }, [vehicles, drivers]);

  const filteredItems = expiryItems.filter(item => {
    if (filter !== 'all' && item.urgency !== filter) return false;
    if (typeFilter !== 'all' && item.entity_type !== typeFilter) return false;
    return true;
  });

  const expiredCount = expiryItems.filter(i => i.urgency === 'expired').length;
  const criticalCount = expiryItems.filter(i => i.urgency === 'critical').length;
  const warningCount = expiryItems.filter(i => i.urgency === 'warning').length;
  const okCount = expiryItems.filter(i => i.urgency === 'ok').length;

  const urgencyColors = {
    expired: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: '🔴' },
    critical: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: '🟠' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: '🟡' },
    ok: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '🟢' },
  };

  const exportCSV = () => {
    const headers = ['Entity', 'Type', 'Document', 'Expiry Date', 'Days Remaining', 'Status'];
    const rows = filteredItems.map(i => [i.entity_name, i.entity_type, i.document_type, i.expiry_date, i.days_remaining, i.urgency]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'document-expiry-report.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Document Expiry Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Auto-alerts for insurance, fitness, PUC, permit, and license expiry</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setFilter('expired')} className={classNames('rounded-2xl border p-5 text-left transition-all', filter === 'expired' ? 'ring-2 ring-red-500' : '')} style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><span className="text-lg">🔴</span><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Expired</p></div>
          <p className="text-2xl font-bold mt-1 text-red-600">{expiredCount}</p>
          <p className="text-xs text-red-500">Immediate action needed</p>
        </button>
        <button onClick={() => setFilter('critical')} className={classNames('rounded-2xl border p-5 text-left transition-all', filter === 'critical' ? 'ring-2 ring-orange-500' : '')} style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><span className="text-lg">🟠</span><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Within 7 Days</p></div>
          <p className="text-2xl font-bold mt-1 text-orange-600">{criticalCount}</p>
          <p className="text-xs text-orange-500">Renew this week</p>
        </button>
        <button onClick={() => setFilter('warning')} className={classNames('rounded-2xl border p-5 text-left transition-all', filter === 'warning' ? 'ring-2 ring-yellow-500' : '')} style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><span className="text-lg">🟡</span><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Within 30 Days</p></div>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{warningCount}</p>
          <p className="text-xs text-yellow-500">Plan renewal</p>
        </button>
        <button onClick={() => setFilter('ok')} className={classNames('rounded-2xl border p-5 text-left transition-all', filter === 'ok' ? 'ring-2 ring-green-500' : '')} style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><span className="text-lg">🟢</span><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Valid (30+ days)</p></div>
          <p className="text-2xl font-bold mt-1 text-green-600">{okCount}</p>
          <p className="text-xs text-green-500">All clear</p>
        </button>
      </div>

      {/* Type Filter */}
      <div className="flex gap-2 items-center">
        <Filter className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        {(['all', 'vehicle', 'driver'] as const).map(f => (
          <button key={f} onClick={() => setTypeFilter(f)} className={classNames('px-3 py-1.5 text-xs rounded-lg font-medium', typeFilter === f ? 'bg-blue-600 text-white' : '')} style={typeFilter !== f ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {f === 'all' ? 'All Documents' : f === 'vehicle' ? 'Vehicles' : 'Drivers'}
          </button>
        ))}
        <button onClick={() => setFilter('all')} className="ml-auto px-3 py-1.5 text-xs rounded-lg" style={{ color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)' }}>
          Clear Filters
        </button>
      </div>

      {/* Expiry Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-center px-3 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Vehicle / Driver</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Document</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Expiry Date</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Days Left</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const colors = urgencyColors[item.urgency];
                return (
                  <tr key={item.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-3 py-3 text-center text-lg">{colors.icon}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.entity_name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--text-tertiary)' }}>{item.entity_type}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.document_type}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(item.expiry_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={classNames('px-2 py-1 rounded-full text-xs font-bold', colors.bg, colors.text)}>
                        {item.days_remaining < 0 ? `${Math.abs(item.days_remaining)}d overdue` : item.days_remaining === 0 ? 'Today!' : `${item.days_remaining}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                        {item.urgency === 'expired' || item.urgency === 'critical' ? 'Renew Now' : 'Set Reminder'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredItems.length === 0 && (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
            <p style={{ color: 'var(--text-tertiary)' }}>No documents matching this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
