import React, { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { AlertTriangle, Plus, X, Search, Download, FileText, Shield, Clock, CheckCircle, Camera } from 'lucide-react';

type ClaimType = 'shortage' | 'damage' | 'theft' | 'accident' | 'breakdown' | 'delay_penalty';
type ClaimStatus = 'reported' | 'under_investigation' | 'evidence_collected' | 'claim_filed' | 'approved' | 'settled' | 'rejected';

interface Claim {
  id: string;
  claim_number: string;
  type: ClaimType;
  trip_id: string;
  trip_number: string;
  customer_name: string;
  vehicle_reg: string;
  driver_name: string;
  incident_date: string;
  location: string;
  description: string;
  claim_amount: number;
  approved_amount: number;
  liability: 'company' | 'driver' | 'customer' | 'insurer' | 'vendor';
  evidence: string[];
  status: ClaimStatus;
  filed_by: string;
  resolution?: string;
  created_at: string;
}



export default function ClaimsModule() {
  const { data: trips } = useModuleData<any>('trips');
  const { data: claims, create: createClaim, update: updateClaim } = useModuleData<Claim>('claims');
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | ClaimStatus>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ type: 'damage' as ClaimType, trip_id: '', incident_date: '', location: '', description: '', claim_amount: '', liability: 'company' as Claim['liability'] });

  const filtered = claims.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search && !c.claim_number.toLowerCase().includes(search.toLowerCase()) && !c.customer_name.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalClaimed = claims.reduce((s, c) => s + c.claim_amount, 0);
  const totalSettled = claims.filter(c => c.status === 'settled').reduce((s, c) => s + c.approved_amount, 0);
  const pendingCount = claims.filter(c => !['settled', 'rejected'].includes(c.status)).length;
  const openValue = claims.filter(c => !['settled', 'rejected'].includes(c.status)).reduce((s, c) => s + c.claim_amount, 0);

  const typeColors: Record<ClaimType, string> = { shortage: 'bg-orange-100 text-orange-800', damage: 'bg-red-100 text-red-800', theft: 'bg-purple-100 text-purple-800', accident: 'bg-red-100 text-red-800', breakdown: 'bg-yellow-100 text-yellow-800', delay_penalty: 'bg-blue-100 text-blue-800' };
  const statusColors: Record<ClaimStatus, string> = { reported: 'bg-yellow-100 text-yellow-800', under_investigation: 'bg-blue-100 text-blue-800', evidence_collected: 'bg-indigo-100 text-indigo-800', claim_filed: 'bg-purple-100 text-purple-800', approved: 'bg-green-100 text-green-800', settled: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800' };

  const handleAdd = () => {
    const trip = trips.find(t => t.id === form.trip_id);
    if (!form.description || !form.claim_amount) return;
    const newClaim: Claim = {
      id: 'clm_' + generateId(), claim_number: `CLM-2025-${String(claims.length + 13).padStart(4, '0')}`,
      type: form.type, trip_id: form.trip_id, trip_number: trip?.trip_number || '', customer_name: trip?.customer_name || '',
      vehicle_reg: trip?.vehicle_reg || '', driver_name: trip?.driver_name || '',
      incident_date: form.incident_date || new Date().toISOString().split('T')[0], location: form.location,
      description: form.description, claim_amount: parseFloat(form.claim_amount), approved_amount: 0,
      liability: form.liability, evidence: [], status: 'reported', filed_by: 'Current User', created_at: new Date().toISOString(),
    };
    createClaim(newClaim);
    setShowModal(false);
    setForm({ type: 'damage', trip_id: '', incident_date: '', location: '', description: '', claim_amount: '', liability: 'company' });
  };

  const updateStatus = (id: string, status: ClaimStatus) => setClaims(claims.map(c => c.id === id ? { ...c, status } : c));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Claims & Insurance</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Track shortage, damage, theft, accidents — from report to settlement</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> File Claim</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Open Claims</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Open Value</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(openValue)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Claimed</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalClaimed)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Settled</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalSettled)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search claims..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="all">All Status</option>
          <option value="reported">Reported</option>
          <option value="under_investigation">Under Investigation</option>
          <option value="claim_filed">Claim Filed</option>
          <option value="settled">Settled</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        {filtered.map(claim => (
          <div key={claim.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{claim.claim_number}</span>
                  <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', typeColors[claim.type])}>{claim.type.replace('_', ' ')}</span>
                  <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[claim.status])}>{claim.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{claim.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-red-600">{formatCurrency(claim.claim_amount)}</p>
                {claim.approved_amount > 0 && <p className="text-xs text-green-600">Approved: {formatCurrency(claim.approved_amount)}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>Trip: {claim.trip_number || '—'}</span>
              <span>Customer: {claim.customer_name}</span>
              <span>Vehicle: {claim.vehicle_reg}</span>
              <span>Driver: {claim.driver_name}</span>
              <span>Date: {formatDate(claim.incident_date)}</span>
              <span>Location: {claim.location}</span>
              <span>Liability: <b className="capitalize">{claim.liability}</b></span>
            </div>
            {claim.evidence.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {claim.evidence.map((e, i) => <span key={i} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}><Camera className="w-3 h-3 inline mr-1" />{e}</span>)}
              </div>
            )}
            {claim.resolution && <p className="text-xs mt-2 italic" style={{ color: 'var(--text-tertiary)' }}>Resolution: {claim.resolution}</p>}
            {/* Status Actions */}
            {!['settled', 'rejected'].includes(claim.status) && (
              <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap" style={{ borderColor: 'var(--border-color)' }}>
                {claim.status === 'reported' && <button onClick={() => updateStatus(claim.id, 'under_investigation')} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Start Investigation</button>}
                {claim.status === 'under_investigation' && <button onClick={() => updateStatus(claim.id, 'evidence_collected')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium">Evidence Collected</button>}
                {claim.status === 'evidence_collected' && <button onClick={() => updateStatus(claim.id, 'claim_filed')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium">File Claim</button>}
                {claim.status === 'claim_filed' && <button onClick={() => updateStatus(claim.id, 'settled')} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium">Mark Settled</button>}
                <button onClick={() => updateStatus(claim.id, 'rejected')} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium">Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* File Claim Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-lg p-6 m-4 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>File New Claim</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Claim Type</label>
                  <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value as ClaimType})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="shortage">Shortage</option><option value="damage">Damage</option><option value="theft">Theft</option><option value="accident">Accident</option><option value="breakdown">Breakdown</option><option value="delay_penalty">Delay Penalty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Liability</label>
                  <select value={form.liability} onChange={(e) => setForm({...form, liability: e.target.value as Claim['liability']})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="company">Company</option><option value="driver">Driver</option><option value="customer">Customer</option><option value="insurer">Insurer</option><option value="vendor">Vendor</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Related Trip</label>
                <select value={form.trip_id} onChange={(e) => setForm({...form, trip_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">Select trip</option>
                  {trips.map(t => <option key={t.id} value={t.id}>{t.trip_number} — {t.customer_name} ({t.origin}→{t.destination})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Incident Date</label>
                  <input type="date" value={form.incident_date} onChange={(e) => setForm({...form, incident_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Where it happened" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} placeholder="What happened..." className="w-full px-3 py-2 border rounded-lg text-sm resize-none" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Claim Amount (₹)</label>
                <input type="number" value={form.claim_amount} onChange={(e) => setForm({...form, claim_amount: e.target.value})} placeholder="Estimated loss value" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <button onClick={handleAdd} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">File Claim</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
