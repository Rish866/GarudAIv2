import React, { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore, generateId } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';
import { ArrowLeftRight, Plus, X, Truck, Package, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

type TransferType = 'vehicle' | 'driver' | 'inventory';
type TransferStatus = 'initiated' | 'in_transit' | 'received' | 'cancelled';

interface Transfer {
  id: string;
  transfer_number: string;
  type: TransferType;
  item_name: string;
  item_id: string;
  from_branch: string;
  from_branch_name: string;
  to_branch: string;
  to_branch_name: string;
  initiated_by: string;
  initiated_date: string;
  received_date?: string;
  status: TransferStatus;
  remarks?: string;
}



export default function TransferModule() {
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');
  const branches: any[] = []; // branches loaded from org context
  const { data: transfers, create: createTransfer, update: updateTransfer } = useModuleData<Transfer>('transfers');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState({ type: 'vehicle' as TransferType, item_id: '', from_branch: '', to_branch: '', remarks: '' });

  const filteredTransfers = transfers.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search && !t.item_name.toLowerCase().includes(search.toLowerCase()) && !t.transfer_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColors: Record<TransferStatus, string> = {
    initiated: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const typeIcons: Record<TransferType, React.ComponentType<{className?: string}>> = {
    vehicle: Truck,
    driver: AlertTriangle,
    inventory: Package,
  };

  const handleCreate = () => {
    if (!form.item_id || !form.from_branch || !form.to_branch || form.from_branch === form.to_branch) return;
    let itemName = '';
    if (form.type === 'vehicle') {
      const v = vehicles.find(x => x.id === form.item_id);
      itemName = v ? `${v.reg_number} (${v.make} ${v.model})` : form.item_id;
    } else if (form.type === 'driver') {
      const d = drivers.find(x => x.id === form.item_id);
      itemName = d?.name || form.item_id;
    } else {
      itemName = form.item_id;
    }
    const fromBranch = branches.find(b => b.id === form.from_branch);
    const toBranch = branches.find(b => b.id === form.to_branch);
    const newTransfer: Transfer = {
      id: 'tf_' + generateId(),
      transfer_number: `TF-2025-${String(transfers.length + 4).padStart(3, '0')}`,
      type: form.type,
      item_name: itemName,
      item_id: form.item_id,
      from_branch: form.from_branch,
      from_branch_name: fromBranch?.name || '',
      to_branch: form.to_branch,
      to_branch_name: toBranch?.name || '',
      initiated_by: 'Current User',
      initiated_date: new Date().toISOString().split('T')[0],
      status: 'initiated',
      remarks: form.remarks,
    };
    createTransfer(newTransfer);
    setShowModal(false);
    setForm({ type: 'vehicle', item_id: '', from_branch: '', to_branch: '', remarks: '' });
  };

  const markReceived = (id: string) => {
    updateTransfer(id, { status: 'received', received_date: new Date().toISOString().split('T')[0] });
  };

  const markInTransit = (id: string) => {
    updateTransfer(id, { status: 'in_transit' });
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inter-Branch Transfers</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Move vehicles, drivers & inventory between branches with tracking</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Transfer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Transfers</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{transfers.length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>In Transit</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{transfers.filter(t => t.status === 'in_transit').length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pending</p>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{transfers.filter(t => t.status === 'initiated').length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Completed</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{transfers.filter(t => t.status === 'received').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search transfers..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        {(['all', 'initiated', 'in_transit', 'received'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className={classNames('px-3 py-2 text-sm rounded-lg font-medium', statusFilter === f ? 'bg-blue-600 text-white' : '')} style={statusFilter !== f ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {f === 'all' ? 'All' : f === 'in_transit' ? 'In Transit' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Transfer Cards */}
      <div className="space-y-4">
        {filteredTransfers.map(transfer => {
          const TypeIcon = typeIcons[transfer.type];
          return (
            <div key={transfer.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}><TypeIcon className="w-5 h-5" style={{ color: 'var(--accent)' }} /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{transfer.transfer_number}</p>
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[transfer.status])}>{transfer.status.replace('_', ' ')}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{transfer.type}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{transfer.item_name}</p>
                  </div>
                </div>
                <div className="text-right text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  <p>Initiated: {formatDate(transfer.initiated_date)}</p>
                  {transfer.received_date && <p>Received: {formatDate(transfer.received_date)}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-medium">{transfer.from_branch_name}</span>
                <ArrowLeftRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="font-medium">{transfer.to_branch_name}</span>
              </div>
              {transfer.remarks && <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>Remarks: {transfer.remarks}</p>}
              {/* Actions */}
              <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                {transfer.status === 'initiated' && (
                  <button onClick={() => markInTransit(transfer.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Mark In Transit</button>
                )}
                {transfer.status === 'in_transit' && (
                  <button onClick={() => markReceived(transfer.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium">Mark Received</button>
                )}
                {(transfer.status === 'initiated' || transfer.status === 'in_transit') && (
                  <button onClick={() => updateTransfer(transfer.id, { status: 'cancelled' })} className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium">Cancel</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>New Transfer</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Transfer Type</label>
                <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value as TransferType, item_id: ''})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="vehicle">Vehicle</option>
                  <option value="driver">Driver</option>
                  <option value="inventory">Inventory</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Select Item</label>
                {form.type === 'vehicle' ? (
                  <select value={form.item_id} onChange={(e) => setForm({...form, item_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number} ({v.make} {v.model})</option>)}
                  </select>
                ) : form.type === 'driver' ? (
                  <select value={form.item_id} onChange={(e) => setForm({...form, item_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="">Select Driver</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                ) : (
                  <input type="text" value={form.item_id} onChange={(e) => setForm({...form, item_id: e.target.value})} placeholder="e.g., 10x MRF Tyres" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>From Branch</label>
                  <select value={form.from_branch} onChange={(e) => setForm({...form, from_branch: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="">Select</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>To Branch</label>
                  <select value={form.to_branch} onChange={(e) => setForm({...form, to_branch: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="">Select</option>
                    {branches.filter(b => b.id !== form.from_branch).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Remarks</label>
                <input type="text" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} placeholder="Optional remarks" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <button onClick={handleCreate} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
