import React, { useState } from 'react';
import { Truck, Plus, Search, Filter, MapPin, Gauge, Calendar, Shield, MoreVertical } from 'lucide-react';
import { Vehicle } from '../../../types';

interface FleetModuleProps {
  vehicles: Vehicle[];
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_trip: 'bg-blue-50 text-blue-700 border-blue-200',
  maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
  breakdown: 'bg-red-50 text-red-700 border-red-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  trailer: 'Trailer', container: 'Container', hywa: 'Hywa', tipper: 'Tipper',
  reefer: 'Reefer', truck: 'Truck', tanker: 'Tanker', bus: 'Bus', tempo: 'Tempo', lcv: 'LCV',
};

export default function FleetModule({ vehicles }: FleetModuleProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'table'>('grid');

  const filtered = vehicles.filter(v => {
    const matchSearch = v.reg_number.toLowerCase().includes(search.toLowerCase()) || v.driver_name?.toLowerCase().includes(search.toLowerCase()) || '';
    const matchStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function getDaysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{vehicles.length} vehicles registered</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reg number or driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'available', 'on_trip', 'maintenance'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                statusFilter === s
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((vehicle) => {
          const insuranceDays = getDaysUntil(vehicle.insurance_expiry);
          const fitnessDays = getDaysUntil(vehicle.fitness_expiry);
          const expiringSoon = insuranceDays < 30 || fitnessDays < 30;

          return (
            <div key={vehicle.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 group">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{vehicle.reg_number}</h3>
                    {expiringSoon && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Document expiring soon" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{vehicle.make} {vehicle.model}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{TYPE_LABELS[vehicle.vehicle_type] || vehicle.vehicle_type}</span>
                  </div>
                </div>
                <span className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border ${STATUS_COLORS[vehicle.status]}`}>
                  {vehicle.status.replace('_', ' ')}
                </span>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">{vehicle.capacity_tons}T capacity</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-600">{vehicle.odometer.toLocaleString()} km</span>
                </div>
                {vehicle.driver_name && (
                  <div className="flex items-center gap-2 col-span-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-blue-600">{vehicle.driver_name[0]}</span>
                    </div>
                    <span className="text-xs text-slate-600">{vehicle.driver_name}</span>
                  </div>
                )}
                {vehicle.last_location && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 truncate">{vehicle.last_location}</span>
                  </div>
                )}
              </div>

              {/* Speed indicator for moving vehicles */}
              {vehicle.status === 'on_trip' && vehicle.current_speed !== undefined && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg mb-3">
                  <span className="text-[11px] font-medium text-emerald-700">Live Speed</span>
                  <span className="text-sm font-bold text-emerald-700">{vehicle.current_speed} km/h</span>
                </div>
              )}

              {/* Document status */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <Shield className={`w-3.5 h-3.5 ${expiringSoon ? 'text-amber-500' : 'text-emerald-500'}`} />
                <span className={`text-[11px] font-medium ${expiringSoon ? 'text-amber-600' : 'text-slate-400'}`}>
                  {expiringSoon ? `Insurance: ${insuranceDays}d left` : 'Documents valid'}
                </span>
                <span className="text-[11px] text-slate-300 ml-auto">{vehicle.ownership_type}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
