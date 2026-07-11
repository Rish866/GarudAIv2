import React, { useState } from 'react';
import { isDemoTenant } from '../../../lib/tenant';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Users, Truck, FileText, CheckCircle, Clock, Star, Download, Package, CreditCard } from 'lucide-react';

type PortalView = 'indents' | 'payments' | 'scorecard' | 'documents';

interface VendorIndent { id: string; indent_number: string; origin: string; destination: string; material: string; weight: number; rate: number; loading_date: string; status: 'offered' | 'accepted' | 'rejected' | 'completed'; }
interface VendorPayment { id: string; trip_number: string; amount: number; date: string; status: 'pending' | 'processed' | 'paid'; reference?: string; }

const seedVendorIndents: VendorIndent[] = [
  { id: 'vi_001', indent_number: 'IND-2025-0050', origin: 'Pune', destination: 'Mumbai', material: 'Steel Bars', weight: 22, rate: 38000, loading_date: '2025-07-12', status: 'offered' },
  { id: 'vi_002', indent_number: 'IND-2025-0048', origin: 'Mumbai', destination: 'Ahmedabad', material: 'FMCG Goods', weight: 18, rate: 52000, loading_date: '2025-07-11', status: 'offered' },
  { id: 'vi_003', indent_number: 'IND-2025-0045', origin: 'Pune', destination: 'Chennai', material: 'Auto Parts', weight: 22, rate: 95000, loading_date: '2025-07-10', status: 'accepted' },
  { id: 'vi_004', indent_number: 'IND-2025-0040', origin: 'Delhi', destination: 'Jaipur', material: 'Textiles', weight: 15, rate: 28000, loading_date: '2025-07-05', status: 'completed' },
];

const seedVendorPayments: VendorPayment[] = [
  { id: 'vp_001', trip_number: 'TRP-2025-0135', amount: 72000, date: '2025-07-08', status: 'pending' },
  { id: 'vp_002', trip_number: 'TRP-2025-0133', amount: 95000, date: '2025-07-05', status: 'paid', reference: 'NEFT-789012' },
  { id: 'vp_003', trip_number: 'TRP-2025-0131', amount: 55000, date: '2025-07-02', status: 'paid', reference: 'NEFT-789010' },
];

export default function VendorPortalModule() {
  const [view, setView] = useState<PortalView>('indents');
  const [indents, setIndents] = useState(isDemoTenant() ? seedVendorIndents : []);

  const acceptIndent = (id: string) => setIndents(indents.map(i => i.id === id ? { ...i, status: 'accepted' } : i));
  const rejectIndent = (id: string) => setIndents(indents.map(i => i.id === id ? { ...i, status: 'rejected' } : i));

  const pendingIndents = indents.filter(i => i.status === 'offered').length;
  const totalEarnings = seedVendorPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = seedVendorPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Vendor Portal</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Accept loads, track payments, upload documents, view scorecard</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-blue-50 text-blue-700 border border-blue-200">
          <Package className="w-4 h-4" /> {pendingIndents} loads waiting for your response
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Open Offers</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{pendingIndents}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Earnings</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totalEarnings)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pending Payments</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(pendingPayments)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Vendor Score</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>4.2 / 5 ⭐</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([{ id: 'indents', label: 'Load Offers', icon: Package }, { id: 'payments', label: 'Payments', icon: CreditCard }, { id: 'scorecard', label: 'Scorecard', icon: Star }, { id: 'documents', label: 'Documents', icon: FileText }] as { id: PortalView; label: string; icon: React.ComponentType<{className?: string}> }[]).map(t => (
          <button key={t.id} onClick={() => setView(t.id)} className={classNames('flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium', view === t.id ? 'bg-blue-600 text-white' : '')} style={view !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Load Offers */}
      {view === 'indents' && (
        <div className="space-y-3">
          {indents.map(indent => (
            <div key={indent.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{indent.indent_number}</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{indent.origin} → {indent.destination} • {indent.material} • {indent.weight}T</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Loading: {formatDate(indent.loading_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(indent.rate)}</p>
                  <span className={classNames('text-xs px-2 py-0.5 rounded-full font-medium', indent.status === 'offered' ? 'bg-yellow-100 text-yellow-800' : indent.status === 'accepted' ? 'bg-green-100 text-green-800' : indent.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800')}>{indent.status}</span>
                </div>
              </div>
              {indent.status === 'offered' && (
                <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
                  <button onClick={() => acceptIndent(indent.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Accept Load</button>
                  <button onClick={() => rejectIndent(indent.id)} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payments */}
      {view === 'payments' && (
        <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Trip</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Amount</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Reference</th>
                <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {seedVendorPayments.map(p => (
                <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.trip_number}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>{p.reference || '—'}</td>
                  <td className="px-4 py-3 text-center"><span className={classNames('px-2 py-1 rounded-full text-xs font-medium', p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Scorecard */}
      {view === 'scorecard' && (
        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Vendor Performance Scorecard</h3>
          <div className="space-y-4">
            {[{ label: 'On-Time Placement', score: 88, desc: '22 out of 25 loads placed on time' }, { label: 'Load Acceptance Rate', score: 76, desc: '19 out of 25 offers accepted' }, { label: 'POD Submission', score: 95, desc: 'PODs uploaded within 24 hours' }, { label: 'Vehicle Condition', score: 82, desc: 'No damage complaints from customers' }, { label: 'Document Compliance', score: 70, desc: '3 documents expiring soon' }].map(item => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
                    <span className={classNames('text-sm font-bold', item.score >= 80 ? 'text-green-600' : item.score >= 60 ? 'text-yellow-600' : 'text-red-600')}>{item.score}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-200"><div className={classNames('h-full rounded-full', item.score >= 80 ? 'bg-green-500' : item.score >= 60 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${item.score}%` }} /></div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {view === 'documents' && (
        <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Compliance Documents</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Upload and manage your compliance documents. Keep them updated to maintain your vendor score.</p>
          <div className="space-y-3">
            {['RC Book', 'Insurance Certificate', 'Fitness Certificate', 'PAN Card', 'GST Certificate', 'Bank Details'].map(doc => (
              <div key={doc} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{doc}</span>
                </div>
                <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg">Upload</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
