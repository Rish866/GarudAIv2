import React, { useState } from 'react';
import { Route, Plus, Search, Package, MapPin, Clock, IndianRupee, FileCheck, Truck } from 'lucide-react';
import { Trip } from '../../../types';

interface TripsModuleProps { trips: Trip[]; }

const STATUS_STYLES: Record<string, string> = {
  booked: 'bg-slate-100 text-slate-600', assigned: 'bg-blue-50 text-blue-700', loading: 'bg-purple-50 text-purple-700',
  in_transit: 'bg-emerald-50 text-emerald-700', reached: 'bg-teal-50 text-teal-700', unloading: 'bg-cyan-50 text-cyan-700',
  pod_pending: 'bg-amber-50 text-amber-700', pod_received: 'bg-lime-50 text-lime-700', completed: 'bg-green-50 text-green-700',
  billed: 'bg-indigo-50 text-indigo-700', settled: 'bg-emerald-100 text-emerald-800', cancelled: 'bg-red-50 text-red-600',
};

export default function TripsModule({ trips }: TripsModuleProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = trips.filter(t => {
    const matchSearch = t.trip_number.toLowerCase().includes(search.toLowerCase()) || t.customer_name.toLowerCase().includes(search.toLowerCase()) || t.vehicle_reg.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: trips.length,
    in_transit: trips.filter(t => t.status === 'in_transit').length,
    pod_pending: trips.filter(t => t.status === 'pod_pending').length,
    completed: trips.filter(t => ['completed', 'billed', 'settled'].includes(t.status)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{trips.length} total trips</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
          <Plus className="w-4 h-4" /> New Trip
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([key, count]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-all ${statusFilter === key ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {key === 'all' ? 'All' : key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} <span className="ml-1 opacity-60">({count})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search trip, customer, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      {/* Trip Cards */}
      <div className="space-y-3">
        {filtered.map((trip) => (
          <div key={trip.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all duration-200">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Left: Trip info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-bold text-slate-900">{trip.trip_number}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[trip.status] || 'bg-slate-100 text-slate-600'}`}>
                    {trip.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">LR: {trip.lr_number}</span>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-slate-700 font-medium">{trip.origin}</span>
                  </div>
                  <div className="flex-1 border-t border-dashed border-slate-300 mx-1" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-slate-700 font-medium">{trip.destination}</span>
                  </div>
                </div>

                {/* Details row */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><Truck className="w-3 h-3" />{trip.vehicle_reg}</span>
                  <span className="flex items-center gap-1"><Package className="w-3 h-3" />{trip.material}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{trip.distance_km} km</span>
                  <span>{trip.weight_tons}T</span>
                </div>
              </div>

              {/* Right: Financial */}
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">₹{trip.total_amount.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-slate-400">Freight amount</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-600">{trip.customer_name}</p>
                  <p className="text-[11px] text-slate-400">{trip.driver_name}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
