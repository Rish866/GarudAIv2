import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Shield, Star, Truck, MapPin } from 'lucide-react';
import { Driver } from '../../../types';

interface DriversModuleProps { drivers: Driver[]; }

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700', on_trip: 'bg-blue-50 text-blue-700',
  on_leave: 'bg-amber-50 text-amber-700', inactive: 'bg-slate-100 text-slate-500',
};

export default function DriversModule({ drivers }: DriversModuleProps) {
  const [search, setSearch] = useState('');

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search) || (d.assigned_vehicle_reg || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Driver Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{drivers.length} drivers registered</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
          <Plus className="w-4 h-4" /> Add Driver
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search by name, phone, vehicle..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((driver) => (
          <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0">
                {driver.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{driver.name}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3" /> {driver.phone}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${STATUS_STYLES[driver.status]}`}>
                {driver.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2.5">
              {driver.assigned_vehicle_reg && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Assigned: <strong>{driver.assigned_vehicle_reg}</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>License: {driver.license_number}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-semibold text-slate-700">{driver.safety_score}/100</span>
                </div>
                <span className="text-[11px] text-slate-400">{driver.total_trips} trips | {(driver.total_km / 1000).toFixed(0)}K km</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
