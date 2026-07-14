import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import type { PaginationFilter } from '../../../hooks/usePaginatedData';
import Pagination from '../../ui/Pagination';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { Shield, Search, Filter, Download, User, Truck, Route, Receipt, FileText, Settings, Clock } from 'lucide-react';

const ENTITY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  vehicle: Truck,
  trip: Route,
  invoice: Receipt,
  payment: Receipt,
  driver: User,
  customer: User,
  maintenance: Settings,
  fuel: Settings,
  quotation: FileText,
  enquiry: FileText,
  system: Shield,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-800',
  updated: 'bg-blue-100 text-blue-800',
  deleted: 'bg-red-100 text-red-800',
  generated: 'bg-purple-100 text-purple-800',
  added: 'bg-teal-100 text-teal-800',
  recorded: 'bg-indigo-100 text-indigo-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  login: 'bg-gray-100 text-gray-800',
  exported: 'bg-orange-100 text-orange-800',
};


export default function AuditTrailModule() {
  const {
    data: activityLog,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    setFilters,
    setSort,
    sortBy,
    sortDirection,
    loading: activityLoading,
    refresh: refreshActivity,
    hasNextPage,
    hasPrevPage,
  } = usePaginatedData<any>('activity_log', { defaultSort: 'created_at', defaultSortDirection: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [auditSort, setAuditSort] = useState('created_at:desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Combined filter builder
  const buildFilters = useCallback(() => {
    const f: PaginationFilter = {};
    if (searchTerm.trim()) f.search = { columns: ['user_name', 'entity_type', 'action', 'details', 'entity_id'], query: searchTerm.trim() };
    const eq: Record<string, string> = {};
    if (entityTypeFilter !== 'all') eq.entity_type = entityTypeFilter;
    if (actionFilter !== 'all') eq.action = actionFilter;
    if (Object.keys(eq).length > 0) f.eq = eq;
    if (dateFrom || dateTo) f.dateRange = { column: 'created_at', from: dateFrom || undefined, to: dateTo || undefined };
    setFilters(f);
  }, [searchTerm, entityTypeFilter, actionFilter, dateFrom, dateTo, setFilters]);

  useEffect(() => { buildFilters(); }, [buildFilters]);

  // Sort handler
  const handleSortChange = useCallback((value: string) => {
    setAuditSort(value);
    const [col, dir] = value.split(':');
    setSort(col, dir as 'asc' | 'desc');
  }, [setSort]);

  // No client-side filtering — all done server-side via usePaginatedData
  const filteredLogs = activityLog;

  const todayLogs = activityLog.filter(l => l.timestamp?.startsWith(new Date().toISOString().split('T')[0])).length;
  const uniqueUsers = new Set(activityLog.map(l => l.user_name)).size;
  const entityTypesSet = new Set(activityLog.map(l => l.entity_type));

  const exportCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Entity', 'Details'];
    const rows = filteredLogs.map(l => [l.timestamp, l.user_name, l.action, l.entity_type, l.details]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Trail</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Complete activity log — who did what, when. Compliance-ready.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Entries</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Today's Activity</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{todayLogs}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active Users</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{uniqueUsers}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Entity Types</p>
          <p className="text-2xl font-bold mt-1 text-purple-600">{entityTypesSet.size}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search activity..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        <select value={entityTypeFilter} onChange={(e) => setEntityTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="all">All Entities</option>
          <option value="trip">Trip</option>
          <option value="vehicle">Vehicle</option>
          <option value="driver">Driver</option>
          <option value="customer">Customer</option>
          <option value="invoice">Invoice</option>
          <option value="payment">Payment</option>
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="all">All Actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="generated">Generated</option>
          <option value="added">Added</option>
          <option value="recorded">Recorded</option>
          <option value="cancelled">Cancelled</option>
          <option value="exported">Exported</option>
        </select>
        <select value={auditSort} onChange={(e) => handleSortChange(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="created_at:desc">Newest First</option>
          <option value="created_at:asc">Oldest First</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} title="From Date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} title="To Date" />
      </div>


      {/* Activity Timeline */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No activity found for the selected filters</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const IconComponent = ENTITY_ICONS[log.entity_type] || Shield;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:opacity-90 transition-opacity" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <IconComponent className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{log.user_name}</span>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800')}>{log.action}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>{log.entity_type}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{log.details}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(log.timestamp)}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {totalCount > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            loading={activityLoading}
          />
        )}
      </div>
    </div>
  );
}
