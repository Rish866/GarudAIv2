import React from 'react';
import { Fuel, Plus, TrendingDown, Gauge } from 'lucide-react';
import { FuelEntry, MaintenanceRecord } from '../../../types';

interface FuelModuleProps { fuelEntries: FuelEntry[]; maintenanceRecords: MaintenanceRecord[]; }

export default function FuelModule({ fuelEntries, maintenanceRecords }: FuelModuleProps) {
  const totalFuel = fuelEntries.reduce((s, f) => s + f.amount, 0);
  const totalLitres = fuelEntries.reduce((s, f) => s + f.litres, 0);
  const avgMileage = fuelEntries.filter(f => f.mileage).reduce((s, f) => s + (f.mileage || 0), 0) / (fuelEntries.filter(f => f.mileage).length || 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fuel & Maintenance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track fuel consumption and vehicle maintenance</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-600/20 transition-all">
          <Plus className="w-4 h-4" /> Log Fuel Entry
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center"><Fuel className="w-4 h-4 text-orange-600" /></div>
            <span className="text-xs font-medium text-slate-500">Total Fuel Spend</span>
          </div>
          <p className="text-xl font-bold text-slate-900">₹{totalFuel.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-1">{totalLitres.toLocaleString()} litres consumed</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><Gauge className="w-4 h-4 text-emerald-600" /></div>
            <span className="text-xs font-medium text-slate-500">Avg Mileage</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{avgMileage.toFixed(1)} km/l</p>
          <p className="text-[11px] text-slate-400 mt-1">Fleet average</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center"><TrendingDown className="w-4 h-4 text-purple-600" /></div>
            <span className="text-xs font-medium text-slate-500">Maintenance Cost</span>
          </div>
          <p className="text-xl font-bold text-slate-900">₹{maintenanceRecords.reduce((s, m) => s + m.cost, 0).toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-slate-400 mt-1">{maintenanceRecords.length} service records</p>
        </div>
      </div>

      {/* Fuel Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Recent Fuel Entries</h2>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Vehicle</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Driver</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Litres</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Amount</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Mileage</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-slate-500 uppercase">Station</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fuelEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-3.5 text-xs text-slate-500">{entry.date}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{entry.vehicle_reg}</td>
                <td className="px-5 py-3.5 text-sm text-slate-700">{entry.driver_name}</td>
                <td className="px-5 py-3.5 text-sm text-slate-700">{entry.litres}L</td>
                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">₹{entry.amount.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 text-sm font-medium text-emerald-700">{entry.mileage ? `${entry.mileage} km/l` : '—'}</td>
                <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[150px] truncate">{entry.fuel_station}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Maintenance Records */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Maintenance Records</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {maintenanceRecords.map((rec) => (
            <div key={rec.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${rec.status === 'completed' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                <span className="text-lg">{rec.service_type === 'repair' ? '🔧' : rec.service_type === 'tyre' ? '🛞' : '🛠️'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{rec.description}</p>
                <p className="text-xs text-slate-500 mt-0.5">{rec.vehicle_reg} • {rec.vendor_name} • {rec.date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-800">₹{rec.cost.toLocaleString('en-IN')}</p>
                <span className={`text-[10px] font-medium ${rec.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>{rec.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
