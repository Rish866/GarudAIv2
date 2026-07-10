import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { CheckCircle, XCircle, Clock, Shield, AlertTriangle, User } from 'lucide-react';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';
type ApprovalType = 'expense' | 'rate_change' | 'credit_limit' | 'payment' | 'trip_cancellation';

interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  amount: number;
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  status: ApprovalStatus;
  entity_id: string;
  remarks?: string;
}

const APPROVAL_RULES = [
  { type: 'expense', threshold: 10000, label: 'Expenses above ₹10,000 need admin approval' },
  { type: 'rate_change', threshold: 0, label: 'All rate changes need admin approval' },
  { type: 'credit_limit', threshold: 500000, label: 'Credit limit above ₹5L needs super admin approval' },
  { type: 'payment', threshold: 100000, label: 'Payments above ₹1L need accounts head approval' },
  { type: 'trip_cancellation', threshold: 0, label: 'All trip cancellations need operations head approval' },
];

const seedApprovals: ApprovalRequest[] = [
  { id: 'apr_001', type: 'expense', title: 'Emergency Tyre Replacement', description: 'MH-12-AB-1234 — Front tyre burst on NH-44. Replaced at roadside', amount: 18500, requested_by: 'Vikram Singh (Driver)', requested_at: '2025-07-09T14:30:00Z', status: 'pending', entity_id: 'exp_101' },
  { id: 'apr_002', type: 'rate_change', title: 'Rate Increase: Pune → Delhi', description: 'Tata Motors requesting ₹1,35,000 (was ₹1,25,000). Fuel price increase justification.', amount: 135000, requested_by: 'Priya Mehta', requested_at: '2025-07-09T11:00:00Z', status: 'pending', entity_id: 'ctr_006' },
  { id: 'apr_003', type: 'credit_limit', title: 'UltraTech Cement — Credit Limit Increase', description: 'Current: ₹40L → Requested: ₹60L. Customer business growing.', amount: 6000000, requested_by: 'Amit Sharma', requested_at: '2025-07-08T16:00:00Z', status: 'pending', entity_id: 'cust_004' },
  { id: 'apr_004', type: 'payment', title: 'Vendor Payment: Mahesh Patel Transport', description: 'Pending hire payment for 3 trips. Overdue by 7 days.', amount: 225000, requested_by: 'Kavita Desai', requested_at: '2025-07-08T10:00:00Z', status: 'pending', entity_id: 'vnd_001' },
  { id: 'apr_005', type: 'expense', title: 'Office Rent — July 2025', description: 'Monthly rent for Pune HQ office. Regular recurring expense.', amount: 45000, requested_by: 'Rajesh Sharma', requested_at: '2025-07-01T09:00:00Z', approved_by: 'Rajesh Sharma', approved_at: '2025-07-01T09:05:00Z', status: 'approved', entity_id: 'exp_099' },
  { id: 'apr_006', type: 'trip_cancellation', title: 'Cancel Trip TRP-2025-0130', description: 'Customer cancelled order last minute. Vehicle already dispatched.', amount: 0, requested_by: 'Amit Sharma', requested_at: '2025-07-07T18:00:00Z', approved_by: 'Rajesh Sharma', approved_at: '2025-07-07T18:30:00Z', status: 'approved', entity_id: 'trip_099', remarks: 'Approved. Charge cancellation fee.' },
  { id: 'apr_007', type: 'rate_change', title: 'Discount for Asian Paints', description: 'Requested 10% discount on Ankleshwar→Ahmedabad route for 6-month commitment', amount: 32400, requested_by: 'Priya Mehta', requested_at: '2025-07-06T14:00:00Z', status: 'rejected', entity_id: 'ctr_003', remarks: 'Margin too low at discounted rate.' },
];

export default function ApprovalsModule() {
  const { user } = useStore();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(seedApprovals);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const filtered = filter === 'all' ? approvals : approvals.filter(a => a.status === filter);
  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const totalPendingValue = approvals.filter(a => a.status === 'pending').reduce((s, a) => s + a.amount, 0);

  const handleApprove = (id: string) => {
    setApprovals(approvals.map(a => a.id === id ? { ...a, status: 'approved', approved_by: user.name, approved_at: new Date().toISOString() } : a));
  };

  const handleReject = (id: string) => {
    setApprovals(approvals.map(a => a.id === id ? { ...a, status: 'rejected', approved_by: user.name, approved_at: new Date().toISOString(), remarks: rejectReason } : a));
    setRejectingId(null);
    setRejectReason('');
  };

  const typeColors: Record<ApprovalType, string> = {
    expense: 'bg-orange-100 text-orange-800',
    rate_change: 'bg-blue-100 text-blue-800',
    credit_limit: 'bg-purple-100 text-purple-800',
    payment: 'bg-green-100 text-green-800',
    trip_cancellation: 'bg-red-100 text-red-800',
  };

  const typeLabels: Record<ApprovalType, string> = {
    expense: 'Expense',
    rate_change: 'Rate Change',
    credit_limit: 'Credit Limit',
    payment: 'Payment',
    trip_cancellation: 'Trip Cancel',
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Approvals (Maker-Checker)</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Review and approve/reject requests that exceed thresholds</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-yellow-50 text-yellow-800 border border-yellow-200">
          <AlertTriangle className="w-4 h-4" /> {pendingCount} pending approvals
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Approved (This Week)</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{approvedCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pending Value</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalPendingValue)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Approval Rules</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{APPROVAL_RULES.length}</p>
        </div>
      </div>

      {/* Approval Rules */}
      <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <h3 className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>Approval Matrix</h3>
        <div className="flex flex-wrap gap-2">
          {APPROVAL_RULES.map((rule, i) => (
            <span key={i} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <Shield className="w-3 h-3 inline mr-1" />{rule.label}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={classNames('px-4 py-2 text-sm rounded-lg font-medium', filter === f ? 'bg-blue-600 text-white' : '')} style={filter !== f ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {f === 'all' ? `All (${approvals.length})` : f === 'pending' ? `Pending (${pendingCount})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Approval Cards */}
      <div className="space-y-4">
        {filtered.map(approval => (
          <div key={approval.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', typeColors[approval.type])}>{typeLabels[approval.type]}</span>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{approval.title}</h3>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{approval.description}</p>
              </div>
              {approval.amount > 0 && (
                <p className="text-lg font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>{formatCurrency(approval.amount)}</p>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span><User className="w-3 h-3 inline mr-1" />Requested by: {approval.requested_by}</span>
              <span><Clock className="w-3 h-3 inline mr-1" />{new Date(approval.requested_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {approval.approved_by && <span>Actioned by: {approval.approved_by}</span>}
            </div>
            {approval.remarks && (
              <p className="text-xs mt-2 italic" style={{ color: 'var(--text-tertiary)' }}>Remarks: {approval.remarks}</p>
            )}
            {/* Actions */}
            {approval.status === 'pending' && (
              <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => handleApprove(approval.id)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
                {rejectingId === approval.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." className="flex-1 px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                    <button onClick={() => handleReject(approval.id)} className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium">Reject</button>
                    <button onClick={() => setRejectingId(null)} className="px-3 py-2 border rounded-lg text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setRejectingId(approval.id)} className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                )}
              </div>
            )}
            {approval.status !== 'pending' && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
                {approval.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className={classNames('text-xs font-medium', approval.status === 'approved' ? 'text-green-700' : 'text-red-700')}>
                  {approval.status === 'approved' ? 'Approved' : 'Rejected'} by {approval.approved_by} on {approval.approved_at ? new Date(approval.approved_at).toLocaleDateString('en-IN') : ''}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
