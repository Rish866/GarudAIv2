import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
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
  const { activityLog } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Get unique entity types and users
  const entityTypes = useMemo(() => ['all', ...new Set(activityLog.map(l => l.entity_type))], [activityLog]);
  const users = useMemo(() => ['all', ...new Set(activityLog.map(l => l.user_name))], [activityLog]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return activityLog.filter(log => {
      if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false;
      if (userFilter !== 'all' && log.user_name !== userFilter) return false;
      if (dateFilter && !log.timestamp.startsWith(dateFilter)) return false;
      if (searchTerm && !log.details.toLowerCase().includes(searchTerm.toLowerCase()) && !log.user_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [activityLog, entityFilter, userFilter, dateFilter, searchTerm]);

  const todayLogs = activityLog.filter(l => l.timestamp.startsWith(new Date().toISOString().split('T')[0])).length;
  const uniqueUsers = new Set(activityLog.map(l => l.user_name)).size;

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
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{activityLog.length}</p>
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
          <p className="text-2xl font-bold mt-1 text-purple-600">{entityTypes.length - 1}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search activity..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {entityTypes.map(e => <option key={e} value={e}>{e === 'all' ? 'All Entities' : e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
        </select>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {users.map(u => <option key={u} value={u}>{u === 'all' ? 'All Users' : u}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
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
      </div>
    </div>
  );
}
