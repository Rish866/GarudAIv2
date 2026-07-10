import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Package, Plus, X, Search, Download, Truck, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';

type IndentStatus = 'pending' | 'allocated' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface Indent {
  id: string;
  indent_number: string;
  customer_id: string;
  customer_name: string;
  origin: string;
  destination: string;
  material: string;
  weight_tons: number;
  vehicle_type: string;
  num_vehicles: number;
  loading_date: string;
  rate: number;
  allocated_vehicle_id?: string;
  allocated_vehicle_reg?: string;
  trip_id?: string;
  status: IndentStatus;
  remarks?: string;
  created_at: string;
}

const generateIndentId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);


const seedIndents: Indent[] = [
  { id: 'ind_001', indent_number: 'IND-2025-0045', customer_id: 'cust_001', customer_name: 'Tata Motors Ltd', origin: 'Pune, Maharashtra', destination: 'Chennai, Tamil Nadu', material: 'Auto Parts', weight_tons: 22, vehicle_type: 'trailer', num_vehicles: 2, loading_date: '2025-07-12', rate: 95000, allocated_vehicle_id: 'veh_001', allocated_vehicle_reg: 'MH-12-AB-1234', status: 'allocated', created_at: '2025-07-09T10:00:00Z' },
  { id: 'ind_002', indent_number: 'IND-2025-0044', customer_id: 'cust_002', customer_name: 'Reliance Industries', origin: 'Jamnagar, Gujarat', destination: 'Mumbai, Maharashtra', material: 'Polymer Granules', weight_tons: 20, vehicle_type: 'container', num_vehicles: 1, loading_date: '2025-07-11', rate: 65000, status: 'pending', created_at: '2025-07-09T08:30:00Z' },
  { id: 'ind_003', indent_number: 'IND-2025-0043', customer_id: 'cust_004', customer_name: 'UltraTech Cement', origin: 'Rajashree Nagar, Karnataka', destination: 'Hyderabad, Telangana', material: 'Cement 53 Grade', weight_tons: 25, vehicle_type: 'truck', num_vehicles: 3, loading_date: '2025-07-10', rate: 55000, allocated_vehicle_id: 'veh_003', allocated_vehicle_reg: 'MH-14-EF-9012', status: 'confirmed', created_at: '2025-07-08T15:00:00Z' },
  { id: 'ind_004', indent_number: 'IND-2025-0042', customer_id: 'cust_003', customer_name: 'Asian Paints Ltd', origin: 'Ankleshwar, Gujarat', destination: 'Pune, Maharashtra', material: 'Paint Drums', weight_tons: 18, vehicle_type: 'container', num_vehicles: 1, loading_date: '2025-07-09', rate: 42000, allocated_vehicle_id: 'veh_004', allocated_vehicle_reg: 'GJ-05-GH-3456', trip_id: 'trip_003', status: 'in_progress', created_at: '2025-07-07T12:00:00Z' },
  { id: 'ind_005', indent_number: 'IND-2025-0041', customer_id: 'cust_005', customer_name: 'Maruti Suzuki India', origin: 'Manesar, Haryana', destination: 'Bangalore, Karnataka', material: 'Car Components', weight_tons: 20, vehicle_type: 'trailer', num_vehicles: 2, loading_date: '2025-07-06', rate: 125000, allocated_vehicle_id: 'veh_007', allocated_vehicle_reg: 'MP-09-NP-6789', trip_id: 'trip_006', status: 'completed', created_at: '2025-07-05T09:00:00Z' },
];

export default function IndentModule() {
  const { customers, vehicles, trips, addTrip } = useStore();
  const [indents, setIndents] = useState<Indent[]>(seedIndents);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');


  const [form, setForm] = useState({
    customer_id: '', origin: '', destination: '', material: '', weight_tons: '',
    vehicle_type: 'truck', num_vehicles: '1', loading_date: '', rate: '', remarks: '',
  });

  const filteredIndents = indents.filter(ind => {
    if (statusFilter !== 'all' && ind.status !== statusFilter) return false;
    if (search && !ind.customer_name.toLowerCase().includes(search.toLowerCase()) && !ind.indent_number.toLowerCase().includes(search.toLowerCase()) && !ind.origin.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = indents.filter(i => i.status === 'pending').length;
  const allocatedCount = indents.filter(i => i.status === 'allocated' || i.status === 'confirmed').length;
  const completedCount = indents.filter(i => i.status === 'completed').length;
  const totalValue = indents.reduce((s, i) => s + (i.rate * i.num_vehicles), 0);

  const statusColors: Record<IndentStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    allocated: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-indigo-100 text-indigo-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const handleAdd = () => {
    if (!form.customer_id || !form.origin || !form.destination || !form.loading_date) return;
    const customer = customers.find(c => c.id === form.customer_id);
    const newIndent: Indent = {
      id: 'ind_' + generateIndentId(),
      indent_number: `IND-2025-${String(indents.length + 46).padStart(4, '0')}`,
      customer_id: form.customer_id,
      customer_name: customer?.name || '',
      origin: form.origin,
      destination: form.destination,
      material: form.material,
      weight_tons: parseFloat(form.weight_tons) || 0,
      vehicle_type: form.vehicle_type,
      num_vehicles: parseInt(form.num_vehicles) || 1,
      loading_date: form.loading_date,
      rate: parseFloat(form.rate) || 0,
      remarks: form.remarks,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setIndents([newIndent, ...indents]);
    setShowModal(false);
    setForm({ customer_id: '', origin: '', destination: '', material: '', weight_tons: '', vehicle_type: 'truck', num_vehicles: '1', loading_date: '', rate: '', remarks: '' });
  };

  const allocateVehicle = (indentId: string, vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return;
    setIndents(indents.map(i => i.id === indentId ? { ...i, allocated_vehicle_id: vehicleId, allocated_vehicle_reg: vehicle.reg_number, status: 'allocated' } : i));
  };

  const convertToTrip = (indent: Indent) => {
    if (!indent.allocated_vehicle_id) return;
    const vehicle = vehicles.find(v => v.id === indent.allocated_vehicle_id);
    const trip = {
      id: 'trip_' + generateId(),
      company_id: 'comp_garud_001',
      trip_number: `TRP-2025-${String(150 + Math.floor(Math.random() * 50)).padStart(4, '0')}`,
      lr_number: `LR-${7850 + Math.floor(Math.random() * 100)}`,
      customer_id: indent.customer_id,
      customer_name: indent.customer_name,
      vehicle_id: indent.allocated_vehicle_id || '',
      vehicle_reg: indent.allocated_vehicle_reg || '',
      driver_id: vehicle?.driver_id || '',
      driver_name: vehicle?.driver_name || '',
      driver_phone: '',
      origin: indent.origin,
      destination: indent.destination,
      distance_km: 0,
      material: indent.material,
      weight_tons: indent.weight_tons,
      booking_date: new Date().toISOString().split('T')[0],
      loading_date: indent.loading_date,
      freight_amount: indent.rate,
      advance_amount: 0,
      balance_amount: indent.rate,
      detention_charges: 0,
      other_charges: 0,
      total_amount: indent.rate,
      status: 'booked' as const,
      created_at: new Date().toISOString(),
    };
    addTrip(trip);
    setIndents(indents.map(i => i.id === indent.id ? { ...i, trip_id: trip.id, status: 'in_progress' } : i));
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Indent / Order Management</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Customer orders → Vehicle allocation → Trip creation</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkUpload(true)} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Bulk Upload</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> New Indent</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Pending</p></div>
          <p className="text-2xl font-bold mt-1 text-yellow-600">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><Truck className="w-4 h-4 text-blue-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Allocated</p></div>
          <p className="text-2xl font-bold mt-1 text-blue-600">{allocatedCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Completed</p></div>
          <p className="text-2xl font-bold mt-1 text-green-600">{completedCount}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Order Value</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search indents..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="allocated">Allocated</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>


      {/* Indent Cards */}
      <div className="space-y-4">
        {filteredIndents.map(indent => (
          <div key={indent.id} className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{indent.indent_number}</p>
                  <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[indent.status])}>{indent.status.replace('_', ' ')}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{indent.customer_name}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(indent.rate)}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{indent.num_vehicles} vehicle(s)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>{indent.origin}</span>
              <ArrowRight className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span>{indent.destination}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <span>Material: {indent.material}</span>
              <span>Weight: {indent.weight_tons}T</span>
              <span>Vehicle: {indent.vehicle_type}</span>
              <span>Loading: {formatDate(indent.loading_date)}</span>
              {indent.allocated_vehicle_reg && <span className="font-medium" style={{ color: 'var(--accent)' }}>Assigned: {indent.allocated_vehicle_reg}</span>}
            </div>
            {/* Action Buttons */}
            {indent.status === 'pending' && (
              <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <select onChange={(e) => { if (e.target.value) allocateVehicle(indent.id, e.target.value); }} className="px-3 py-1.5 border rounded-lg text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">Allocate Vehicle...</option>
                  {vehicles.filter(v => v.status === 'available').map(v => <option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type})</option>)}
                </select>
              </div>
            )}
            {indent.status === 'allocated' && (
              <div className="mt-3 pt-3 border-t flex gap-2" style={{ borderColor: 'var(--border-color)' }}>
                <button onClick={() => convertToTrip(indent)} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">Convert to Trip</button>
                <button onClick={() => setIndents(indents.map(i => i.id === indent.id ? { ...i, status: 'cancelled' } : i))} className="px-4 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-lg p-6 m-4 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>New Indent / Order</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Customer *</label>
                <select value={form.customer_id} onChange={(e) => setForm({...form, customer_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Origin *</label>
                  <input type="text" value={form.origin} onChange={(e) => setForm({...form, origin: e.target.value})} placeholder="City, State" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Destination *</label>
                  <input type="text" value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} placeholder="City, State" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Material</label>
                  <input type="text" value={form.material} onChange={(e) => setForm({...form, material: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Weight (Tons)</label>
                  <input type="number" value={form.weight_tons} onChange={(e) => setForm({...form, weight_tons: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vehicle Type</label>
                  <select value={form.vehicle_type} onChange={(e) => setForm({...form, vehicle_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="truck">Truck</option><option value="trailer">Trailer</option><option value="container">Container</option><option value="tanker">Tanker</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vehicles #</label>
                  <input type="number" value={form.num_vehicles} onChange={(e) => setForm({...form, num_vehicles: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Rate (₹)</label>
                  <input type="number" value={form.rate} onChange={(e) => setForm({...form, rate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Loading Date *</label>
                <input type="date" value={form.loading_date} onChange={(e) => setForm({...form, loading_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <button onClick={handleAdd} className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Indent</button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUpload title="Bulk Upload Indents" description="Import order indents from CSV" sampleFields={['customer_name', 'origin', 'destination', 'material', 'weight_tons', 'vehicle_type', 'loading_date', 'rate']} onUpload={(data) => { data.forEach(row => { const cust = customers.find(c => c.name === row.customer_name); setIndents(prev => [...prev, { id: 'ind_' + generateIndentId(), indent_number: `IND-2025-${String(prev.length + 46).padStart(4, '0')}`, customer_id: cust?.id || '', customer_name: row.customer_name || '', origin: row.origin || '', destination: row.destination || '', material: row.material || '', weight_tons: Number(row.weight_tons) || 0, vehicle_type: row.vehicle_type || 'truck', num_vehicles: 1, loading_date: row.loading_date || '', rate: Number(row.rate) || 0, status: 'pending', created_at: new Date().toISOString() }]); }); }} onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}
