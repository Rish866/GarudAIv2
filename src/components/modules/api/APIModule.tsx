import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { Code, Key, Copy, Plus, X, Trash2, CheckCircle, Globe, Webhook, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface APIKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
  last_used?: string;
  status: 'active' | 'revoked';
  permissions: string[];
}

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  last_triggered?: string;
  success_count: number;
  fail_count: number;
}

interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: string;
}

const API_ENDPOINTS: APIEndpoint[] = [
  { method: 'GET', path: '/api/v1/vehicles', description: 'List all vehicles with GPS status', category: 'Fleet' },
  { method: 'GET', path: '/api/v1/vehicles/:id', description: 'Get vehicle details by ID', category: 'Fleet' },
  { method: 'POST', path: '/api/v1/vehicles', description: 'Create a new vehicle', category: 'Fleet' },
  { method: 'PUT', path: '/api/v1/vehicles/:id/location', description: 'Update vehicle GPS location', category: 'Fleet' },
  { method: 'GET', path: '/api/v1/trips', description: 'List all trips with filters', category: 'Trips' },
  { method: 'POST', path: '/api/v1/trips', description: 'Create a new trip/booking', category: 'Trips' },
  { method: 'PUT', path: '/api/v1/trips/:id/status', description: 'Update trip status', category: 'Trips' },
  { method: 'POST', path: '/api/v1/trips/:id/pod', description: 'Upload proof of delivery', category: 'Trips' },
  { method: 'GET', path: '/api/v1/drivers', description: 'List all drivers', category: 'Drivers' },
  { method: 'GET', path: '/api/v1/drivers/:id/location', description: 'Get driver current location', category: 'Drivers' },
  { method: 'PUT', path: '/api/v1/drivers/:id/status', description: 'Update driver availability', category: 'Drivers' },
  { method: 'GET', path: '/api/v1/customers', description: 'List all customers', category: 'Customers' },
  { method: 'GET', path: '/api/v1/customers/:id/outstanding', description: 'Get customer outstanding balance', category: 'Customers' },
  { method: 'GET', path: '/api/v1/invoices', description: 'List invoices with filters', category: 'Billing' },
  { method: 'POST', path: '/api/v1/invoices', description: 'Generate invoice for trips', category: 'Billing' },
  { method: 'POST', path: '/api/v1/payments', description: 'Record a payment', category: 'Billing' },
  { method: 'GET', path: '/api/v1/tracking/live', description: 'Get all vehicle live positions', category: 'GPS' },
  { method: 'POST', path: '/api/v1/tracking/geofence-event', description: 'Receive geofence entry/exit event', category: 'GPS' },
  { method: 'GET', path: '/api/v1/reports/revenue', description: 'Revenue report by period', category: 'Reports' },
  { method: 'GET', path: '/api/v1/reports/fleet-utilization', description: 'Fleet utilization metrics', category: 'Reports' },
  { method: 'POST', path: '/api/v1/eway-bill/generate', description: 'Generate e-way bill for consignment', category: 'Compliance' },
  { method: 'GET', path: '/api/v1/eway-bill/:number/status', description: 'Check e-way bill validity', category: 'Compliance' },
];


const WEBHOOK_EVENTS = [
  'trip.created', 'trip.status_changed', 'trip.completed',
  'vehicle.location_updated', 'vehicle.geofence_breach',
  'invoice.generated', 'payment.received',
  'document.expiring', 'maintenance.due',
  'driver.sos', 'eway_bill.expiring',
];

const generateKey = () => 'grd_' + Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const seedAPIKeys: APIKey[] = [
  { id: 'key_001', name: 'Production GPS Integration', key: 'grd_k8f2m9x1a7b3c4d5e6f7g8h9i0j1k2l3', created_at: '2025-06-15', last_used: '2025-07-09', status: 'active', permissions: ['read:vehicles', 'write:location', 'read:trips'] },
  { id: 'key_002', name: 'Customer Portal Widget', key: 'grd_p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9', created_at: '2025-07-01', last_used: '2025-07-09', status: 'active', permissions: ['read:trips', 'read:invoices', 'read:tracking'] },
  { id: 'key_003', name: 'Test Key (Staging)', key: 'grd_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', created_at: '2025-07-05', status: 'active', permissions: ['read:all', 'write:all'] },
];

const seedWebhooks: WebhookConfig[] = [
  { id: 'wh_001', url: 'https://erp.customer.com/webhooks/garud', events: ['trip.completed', 'invoice.generated', 'payment.received'], status: 'active', last_triggered: '2025-07-09T10:30:00Z', success_count: 142, fail_count: 3 },
  { id: 'wh_002', url: 'https://gps-provider.com/api/events', events: ['vehicle.geofence_breach', 'vehicle.location_updated'], status: 'active', last_triggered: '2025-07-09T10:25:00Z', success_count: 8934, fail_count: 12 },
];

export default function APIModule() {
  const { company } = useStore();
  const [tab, setTab] = useState<'endpoints' | 'keys' | 'webhooks'>('endpoints');
  const [apiKeys, setApiKeys] = useState<APIKey[]>(seedAPIKeys);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(seedWebhooks);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [keyForm, setKeyForm] = useState({ name: '', permissions: ['read:all'] as string[] });
  const [webhookForm, setWebhookForm] = useState({ url: '', events: [] as string[] });
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = ['all', ...new Set(API_ENDPOINTS.map(e => e.category))];
  const filteredEndpoints = categoryFilter === 'all' ? API_ENDPOINTS : API_ENDPOINTS.filter(e => e.category === categoryFilter);

  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const createAPIKey = () => {
    if (!keyForm.name) return;
    const newKey: APIKey = {
      id: 'key_' + generateId(),
      name: keyForm.name,
      key: generateKey(),
      created_at: new Date().toISOString().split('T')[0],
      status: 'active',
      permissions: keyForm.permissions,
    };
    setApiKeys([newKey, ...apiKeys]);
    setShowKeyModal(false);
    setKeyForm({ name: '', permissions: ['read:all'] });
  };

  const revokeKey = (id: string) => setApiKeys(apiKeys.map(k => k.id === id ? { ...k, status: 'revoked' } : k));

  const createWebhook = () => {
    if (!webhookForm.url || webhookForm.events.length === 0) return;
    const newWh: WebhookConfig = {
      id: 'wh_' + generateId(),
      url: webhookForm.url,
      events: webhookForm.events,
      status: 'active',
      success_count: 0,
      fail_count: 0,
    };
    setWebhooks([newWh, ...webhooks]);
    setShowWebhookModal(false);
    setWebhookForm({ url: '', events: [] });
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }));
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>REST API & Integrations</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>API documentation, key management & webhook configuration</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
          <Globe className="w-4 h-4" /> Base URL: <code className="font-mono font-medium" style={{ color: 'var(--accent)' }}>https://api.garudai.in/v1</code>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'endpoints', label: 'API Endpoints', icon: Code },
          { id: 'keys', label: 'API Keys', icon: Key },
          { id: 'webhooks', label: 'Webhooks', icon: Webhook },
        ] as { id: 'endpoints' | 'keys' | 'webhooks'; label: string; icon: React.ComponentType<{className?: string; size?: number}> }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={classNames('flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium', tab === t.id ? 'bg-blue-600 text-white' : '')} style={tab !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Endpoints Tab */}
      {tab === 'endpoints' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)} className={classNames('px-3 py-1.5 text-xs rounded-lg font-medium', categoryFilter === c ? 'bg-blue-600 text-white' : '')} style={categoryFilter !== c ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {filteredEndpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 hover:opacity-80">
                  <span className={classNames('px-2 py-0.5 rounded text-xs font-bold min-w-[50px] text-center', methodColors[ep.method])}>{ep.method}</span>
                  <code className="text-sm font-mono flex-1" style={{ color: 'var(--text-primary)' }}>{ep.path}</code>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{ep.description}</span>
                  <button onClick={() => copyToClipboard(ep.path, `ep_${i}`)} className="p-1.5 rounded hover:opacity-70">
                    {copied === `ep_${i}` ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
            <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Authentication</p>
            <p>All requests require header: <code className="px-1 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--bg-primary)' }}>Authorization: Bearer YOUR_API_KEY</code></p>
            <p className="mt-1">Rate limit: 1000 requests/minute per key. Responses in JSON format.</p>
          </div>
        </div>
      )}


      {/* API Keys Tab */}
      {tab === 'keys' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowKeyModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Generate Key</button>
          </div>
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{key.name}</p>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', key.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>{key.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        {visibleKeys.has(key.id) ? key.key : key.key.slice(0, 8) + '••••••••••••••••••••••••'}
                      </code>
                      <button onClick={() => setVisibleKeys(v => { const n = new Set(v); n.has(key.id) ? n.delete(key.id) : n.add(key.id); return n; })} className="p-1 rounded hover:opacity-70">
                        {visibleKeys.has(key.id) ? <EyeOff className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} /> : <Eye className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />}
                      </button>
                      <button onClick={() => copyToClipboard(key.key, key.id)} className="p-1 rounded hover:opacity-70">
                        {copied === key.id ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />}
                      </button>
                    </div>
                  </div>
                  {key.status === 'active' && (
                    <button onClick={() => revokeKey(key.id)} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">Revoke</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span>Created: {formatDate(key.created_at)}</span>
                  {key.last_used && <span>Last used: {formatDate(key.last_used)}</span>}
                  <span>Permissions: {key.permissions.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {tab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowWebhookModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Add Webhook</button>
          </div>
          <div className="space-y-3">
            {webhooks.map(wh => (
              <div key={wh.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                      <code className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{wh.url}</code>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', wh.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')}>{wh.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {wh.events.map(ev => <span key={ev} className="px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{ev}</span>)}
                    </div>
                  </div>
                  <button className="p-1.5 rounded hover:opacity-70"><RefreshCw className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} /></button>
                </div>
                <div className="flex gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <span className="text-green-600">✓ {wh.success_count} delivered</span>
                  {wh.fail_count > 0 && <span className="text-red-600">✗ {wh.fail_count} failed</span>}
                  {wh.last_triggered && <span>Last triggered: {new Date(wh.last_triggered).toLocaleString('en-IN')}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowKeyModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Generate API Key</h2>
              <button onClick={() => setShowKeyModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Key Name</label>
                <input type="text" value={keyForm.name} onChange={(e) => setKeyForm({...keyForm, name: e.target.value})} placeholder="e.g., GPS Integration" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Permissions</label>
                <select value={keyForm.permissions[0]} onChange={(e) => setKeyForm({...keyForm, permissions: [e.target.value]})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="read:all">Read All</option>
                  <option value="read:all,write:all">Read + Write All</option>
                  <option value="read:vehicles,write:location">GPS Only (Read vehicles + Write location)</option>
                  <option value="read:trips,read:invoices">Customer Portal (Read trips + invoices)</option>
                </select>
              </div>
              <button onClick={createAPIKey} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Generate Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Webhook Modal */}
      {showWebhookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowWebhookModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Webhook</h2>
              <button onClick={() => setShowWebhookModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Endpoint URL</label>
                <input type="url" value={webhookForm.url} onChange={(e) => setWebhookForm({...webhookForm, url: e.target.value})} placeholder="https://your-server.com/webhook" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Events to Subscribe</label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                  {WEBHOOK_EVENTS.map(ev => (
                    <label key={ev} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs" style={{ backgroundColor: webhookForm.events.includes(ev) ? 'var(--accent-light)' : 'var(--bg-secondary)' }}>
                      <input type="checkbox" checked={webhookForm.events.includes(ev)} onChange={() => toggleWebhookEvent(ev)} className="w-3 h-3" />
                      <span style={{ color: 'var(--text-secondary)' }}>{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
              <button onClick={createWebhook} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Webhook</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
