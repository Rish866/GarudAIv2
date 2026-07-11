import React, { useState, useMemo } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { useStore } from '../../../store/useStore';
import { formatCurrency, classNames } from '../../../lib/utils';
import { MapPin, Plus, X, Search, Download, TrendingUp, Clock, Fuel } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';

interface RouteRecord {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance_km: number;
  standard_hours: number;
  toll_points: number;
  toll_cost: number;
  fuel_estimate: number;
  trips_completed: number;
  total_revenue: number;
  total_cost: number;
  status: 'active' | 'inactive';
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);



export default function RouteModule() {
  const { trips } = useStore();
  const { data: routes, create: createRoute, remove: removeRoute, loading: routesLoading } = useModuleData<RouteRecord>('routes');
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [search, setSearch] = useState('');


  const [form, setForm] = useState({
    name: '', origin: '', destination: '', distance_km: '', standard_hours: '', toll_points: '', toll_cost: '', fuel_estimate: '',
  });

  const filteredRoutes = routes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.origin.toLowerCase().includes(search.toLowerCase()) ||
    r.destination.toLowerCase().includes(search.toLowerCase())
  );

  const totalRouteKm = routes.reduce((s, r) => s + r.distance_km, 0);
  const totalTripsOnRoutes = routes.reduce((s, r) => s + r.trips_completed, 0);
  const totalRouteRevenue = routes.reduce((s, r) => s + r.total_revenue, 0);
  const avgProfit = routes.length > 0 ? routes.reduce((s, r) => s + (r.total_revenue - r.total_cost), 0) / routes.length : 0;

  const getProfitability = (r: RouteRecord) => {
    if (r.total_revenue === 0) return 0;
    return ((r.total_revenue - r.total_cost) / r.total_revenue * 100);
  };

  const handleAdd = () => {
    if (!form.name || !form.origin || !form.destination || !form.distance_km) return;
    const newRoute: RouteRecord = {
      id: 'rt_' + generateId(),
      name: form.name,
      origin: form.origin,
      destination: form.destination,
      distance_km: parseInt(form.distance_km),
      standard_hours: parseInt(form.standard_hours) || 0,
      toll_points: parseInt(form.toll_points) || 0,
      toll_cost: parseInt(form.toll_cost) || 0,
      fuel_estimate: parseInt(form.fuel_estimate) || 0,
      trips_completed: 0,
      total_revenue: 0,
      total_cost: 0,
      status: 'active',
    };
    createRoute(newRoute);
    setShowModal(false);
    setForm({ name: '', origin: '', destination: '', distance_km: '', standard_hours: '', toll_points: '', toll_cost: '', fuel_estimate: '' });
  };

  const exportCSV = () => {
    const headers = ['Route', 'Origin', 'Destination', 'Distance (km)', 'Std Hours', 'Tolls', 'Toll Cost', 'Fuel Est', 'Trips', 'Revenue', 'Cost', 'Profit %'];
    const rows = routes.map(r => [r.name, r.origin, r.destination, r.distance_km, r.standard_hours, r.toll_points, r.toll_cost, r.fuel_estimate, r.trips_completed, r.total_revenue, r.total_cost, getProfitability(r).toFixed(1)]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'route-master.csv'; a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Route Master</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Pre-defined routes with standard KM, transit time, tolls & profitability analysis</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}><Download className="w-4 h-4 inline mr-1" /> Export</button>
          <button onClick={() => setShowBulkUpload(true)} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Bulk Upload</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="w-4 h-4" /> Add Route</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Routes</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{routes.length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Network KM</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{totalRouteKm.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Trips on Routes</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{totalTripsOnRoutes}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Route Revenue</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalRouteRevenue)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search routes..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
      </div>

      {/* Route Table */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Route</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>KM</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Hours</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Tolls</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Toll Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Fuel Est.</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Trips</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Revenue</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Profit %</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map(route => {
                const profit = getProfitability(route);
                return (
                  <tr key={route.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{route.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{route.origin} → {route.destination}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{route.distance_km}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-secondary)' }}>{route.standard_hours}h</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-secondary)' }}>{route.toll_points}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(route.toll_cost)}</td>
                    <td className="px-4 py-3 text-sm text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(route.fuel_estimate)}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--accent)' }}>{route.trips_completed}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(route.total_revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={classNames('px-2 py-0.5 rounded-full text-xs font-medium', profit > 30 ? 'bg-green-100 text-green-800' : profit > 15 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}>{profit.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Add Route Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-lg p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Route</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Route Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="e.g., Pune - Mumbai" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Origin</label>
                  <input type="text" value={form.origin} onChange={(e) => setForm({...form, origin: e.target.value})} placeholder="City, State" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Destination</label>
                  <input type="text" value={form.destination} onChange={(e) => setForm({...form, destination: e.target.value})} placeholder="City, State" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Distance (km)</label>
                  <input type="number" value={form.distance_km} onChange={(e) => setForm({...form, distance_km: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Standard Hours</label>
                  <input type="number" value={form.standard_hours} onChange={(e) => setForm({...form, standard_hours: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Toll Points</label>
                  <input type="number" value={form.toll_points} onChange={(e) => setForm({...form, toll_points: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Toll Cost (₹)</label>
                  <input type="number" value={form.toll_cost} onChange={(e) => setForm({...form, toll_cost: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fuel Est. (₹)</label>
                  <input type="number" value={form.fuel_estimate} onChange={(e) => setForm({...form, fuel_estimate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <button onClick={handleAdd} className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add Route</button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUpload title="Bulk Upload Routes" description="Import route records from CSV" sampleFields={['name', 'origin', 'destination', 'distance_km', 'standard_hours', 'toll_points', 'toll_cost', 'fuel_estimate']} onUpload={(data) => { data.forEach(row => { createRoute( { id: 'rt_' + generateId(), name: row.name || '', origin: row.origin || '', destination: row.destination || '', distance_km: Number(row.distance_km) || 0, standard_hours: Number(row.standard_hours) || 0, toll_points: Number(row.toll_points) || 0, toll_cost: Number(row.toll_cost) || 0, fuel_estimate: Number(row.fuel_estimate) || 0, trips_completed: 0, total_revenue: 0, total_cost: 0, status: 'active' }); }); }} onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}
