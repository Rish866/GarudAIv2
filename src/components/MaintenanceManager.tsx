import React, { useState } from 'react';
import { MaintenanceLog, FuelLog, TyreLog, Vehicle, Driver } from '../types';
import {
  Wrench,
  Plus,
  Search,
  Droplet,
  Settings,
  Calendar,
  Compass,
  ArrowRight,
  Activity,
  Calculator,
  CheckCircle,
  Clock,
  XCircle,
  Truck
} from 'lucide-react';

interface MaintenanceManagerProps {
  companyId: string;
  maintenance: MaintenanceLog[];
  fuelLogs: FuelLog[];
  tyreLogs: TyreLog[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onUpdateMaintenance: (items: MaintenanceLog[]) => void;
  onUpdateFuelLogs: (items: FuelLog[]) => void;
  onUpdateTyreLogs: (items: TyreLog[]) => void;
}

export default function MaintenanceManager({
  companyId,
  maintenance,
  fuelLogs,
  tyreLogs,
  vehicles,
  drivers,
  onUpdateMaintenance,
  onUpdateFuelLogs,
  onUpdateTyreLogs
}: MaintenanceManagerProps) {
  const [activeTab, setActiveTab] = useState<'maintenance' | 'fuel' | 'tyres'>('maintenance');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showTyreModal, setShowTyreModal] = useState(false);

  // Form states
  const [newMaint, setNewMaint] = useState<Partial<MaintenanceLog>>({
    vehicle_id: '', service_type: 'repair', odometer: 100000, cost: 0, workshop_name: '', next_service_due_date: '', notes: ''
  });
  const [newFuel, setNewFuel] = useState<Partial<FuelLog>>({
    vehicle_id: '', driver_id: '', litres: 0, amount: 0, fuel_station: '', odometer: 100000, mileage_calculated: 3.5
  });
  const [newTyre, setNewTyre] = useState<Partial<TyreLog>>({
    vehicle_id: '', tyre_number: '', position: 'front_left', cost: 15000, running_km: 0, retread_status: 'original', purchase_date: '', replacement_date: ''
  });

  const handleCreateMaint = (e: React.FormEvent) => {
    e.preventDefault();
    const vObj = vehicles.find(v => v.id === newMaint.vehicle_id);
    const created: MaintenanceLog = {
      id: 'maint-' + Date.now(),
      company_id: companyId,
      vehicle_id: newMaint.vehicle_id || '',
      vehicle_reg: vObj ? vObj.reg_number : 'Unknown Vehicle',
      service_date: new Date().toISOString().split('T')[0],
      service_type: newMaint.service_type as any,
      odometer: Number(newMaint.odometer) || 120000,
      cost: Number(newMaint.cost) || 0,
      workshop_name: newMaint.workshop_name || 'Workshop Shed 1',
      next_service_due_date: newMaint.next_service_due_date || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
      notes: newMaint.notes || ''
    };

    onUpdateMaintenance([created, ...maintenance]);
    setShowMaintModal(false);
    setNewMaint({ vehicle_id: '', service_type: 'repair', odometer: 100000, cost: 0, workshop_name: '' });
  };

  const handleCreateFuel = (e: React.FormEvent) => {
    e.preventDefault();
    const vObj = vehicles.find(v => v.id === newFuel.vehicle_id);
    const dObj = drivers.find(d => d.id === newFuel.driver_id);
    
    const liters = Number(newFuel.litres) || 100;
    const amount = Number(newFuel.amount) || 9000;
    // Simple mock calculation for fuel mileage based on standard heavy vehicle patterns
    const mockMileage = parseFloat((3.5 + Math.random() * 1.2).toFixed(2));

    const created: FuelLog = {
      id: 'fuel-' + Date.now(),
      company_id: companyId,
      vehicle_id: newFuel.vehicle_id || '',
      vehicle_reg: vObj ? vObj.reg_number : 'Unknown Vehicle',
      driver_id: newFuel.driver_id || '',
      driver_name: dObj ? dObj.name : 'Spot Driver',
      litres: liters,
      amount: amount,
      fuel_station: newFuel.fuel_station || 'Indian Oil station',
      odometer: Number(newFuel.odometer) || 85000,
      mileage_calculated: mockMileage,
      date: new Date().toISOString().split('T')[0]
    };

    onUpdateFuelLogs([created, ...fuelLogs]);
    setShowFuelModal(false);
    setNewFuel({ vehicle_id: '', driver_id: '', litres: 0, amount: 0, fuel_station: '' });
  };

  const handleCreateTyre = (e: React.FormEvent) => {
    e.preventDefault();
    const vObj = vehicles.find(v => v.id === newTyre.vehicle_id);
    const created: TyreLog = {
      id: 'tyre-' + Date.now(),
      company_id: companyId,
      vehicle_id: newTyre.vehicle_id || '',
      vehicle_reg: vObj ? vObj.reg_number : 'Unknown Vehicle',
      tyre_number: (newTyre.tyre_number || '').toUpperCase() || ('TY-RADIAL-' + Math.floor(Math.random() * 9000 + 1000)),
      position: newTyre.position as any,
      purchase_date: newTyre.purchase_date || new Date().toISOString().split('T')[0],
      cost: Number(newTyre.cost) || 16000,
      running_km: Number(newTyre.running_km) || 0,
      retread_status: newTyre.retread_status as any,
      replacement_date: newTyre.replacement_date || new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    };

    onUpdateTyreLogs([created, ...tyreLogs]);
    setShowTyreModal(false);
    setNewTyre({ vehicle_id: '', tyre_number: '', position: 'front_left', cost: 15000 });
  };

  const filteredMaint = maintenance.filter(m =>
    m.vehicle_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.workshop_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFuel = fuelLogs.filter(f =>
    f.vehicle_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.driver_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTyres = tyreLogs.filter(t =>
    t.vehicle_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.tyre_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Tabs Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab('maintenance'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'maintenance' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Workshop Maintenance ({maintenance.length})
          </button>
          <button
            onClick={() => { setActiveTab('fuel'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'fuel' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Droplet className="w-4 h-4" />
            Diesel Fuel Logs ({fuelLogs.length})
          </button>
          <button
            onClick={() => { setActiveTab('tyres'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'tyres' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Settings className="w-4 h-4" />
            Tyre Lifespan Tracker ({tyreLogs.length})
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'maintenance' && (
            <button
              onClick={() => setShowMaintModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Log Service Work
            </button>
          )}
          {activeTab === 'fuel' && (
            <button
              onClick={() => setShowFuelModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Record Fuel Card Top-up
            </button>
          )}
          {activeTab === 'tyres' && (
            <button
              onClick={() => setShowTyreModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Log Tyre Install
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {/* ACTIVE TAB LISTS */}
      {activeTab === 'maintenance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMaint.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No active maintenance logs. Log workshop events here.
            </div>
          ) : (
            filteredMaint.map(m => (
              <div key={m.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-cyan-400 font-mono font-bold select-all">{m.vehicle_reg}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Date: {m.service_date}</span>
                  </div>
                  <h4 className="text-xs font-black text-white capitalize mb-1">{m.service_type.replace(/_/g, ' ')}</h4>
                  <p className="text-[11px] text-slate-400">Workshop: <strong>{m.workshop_name}</strong> | Odo check: <strong>{m.odometer.toLocaleString()} KM</strong></p>
                  {m.notes && <p className="text-[10px] text-slate-500 italic mt-2">"{m.notes}"</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase">Next service due: <span className="text-slate-400 font-mono">{m.next_service_due_date}</span></span>
                  <div className="text-xs font-black text-white font-mono">Cost: ₹{m.cost.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Diesel Top-up ledger</h4>
            <span className="text-[10px] text-slate-500 font-mono">Real-time KMPL Telemetry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-850">
                <tr>
                  <th className="p-3 pl-5">Vehicle</th>
                  <th className="p-3">Driver Name</th>
                  <th className="p-3">Fuel Station / Location</th>
                  <th className="p-3 text-right">Liters Filled</th>
                  <th className="p-3 text-right">Odometer (KM)</th>
                  <th className="p-3 text-right">Fuel efficiency (KMPL)</th>
                  <th className="p-3 text-right">Voucher Cost (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredFuel.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No fuel logs recorded.
                    </td>
                  </tr>
                ) : (
                  filteredFuel.map(f => (
                    <tr key={f.id} className="hover:bg-slate-800/30">
                      <td className="p-3 pl-5 font-bold text-white select-all">{f.vehicle_reg}</td>
                      <td className="p-3 text-slate-300 font-medium">{f.driver_name}</td>
                      <td className="p-3 text-slate-400 font-mono">{f.fuel_station}</td>
                      <td className="p-3 text-right font-mono text-cyan-400 font-bold">{f.litres} L</td>
                      <td className="p-3 text-right font-mono text-slate-300">{f.odometer.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono">
                        <span className="text-emerald-400 font-black bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {f.mileage_calculated} KMPL
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-red-400 font-black">₹{f.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'tyres' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTyres.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No radial tyre inventory logs. Add heavy multi-axle tyre changes.
            </div>
          ) : (
            filteredTyres.map(t => (
              <div key={t.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between relative overflow-hidden">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-white select-all">{t.tyre_number}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                      t.retread_status === 'original' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {t.retread_status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono">
                    Mounted vehicle: <strong className="text-cyan-400 font-sans uppercase">{t.vehicle_reg}</strong> | Position: <strong className="text-white uppercase">{t.position.replace(/_/g, ' ')}</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Running mileage: <strong className="text-slate-200">{t.running_km.toLocaleString()} KM</strong>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Purchased: {t.purchase_date}</span>
                  <div className="text-xs font-black text-white font-mono">₹{t.cost.toLocaleString('en-IN')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================= LOG MAINTENANCE MODAL ======================= */}
      {showMaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowMaintModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Record Vehicle Workshop Service</h3>
            
            <form onSubmit={handleCreateMaint} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Fleet Vehicle *</label>
                <select required value={newMaint.vehicle_id} onChange={(e) => setNewMaint({ ...newMaint, vehicle_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Truck --</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type.toUpperCase()})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Service category</label>
                  <select value={newMaint.service_type} onChange={(e) => setNewMaint({ ...newMaint, service_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="scheduled">Scheduled Oil & Greasing</option>
                    <option value="repair">Emergency Breakdown Repair</option>
                    <option value="tyre_change">Tyre replacement check</option>
                    <option value="accident">Insurance Claim Overhaul</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Odometer Reading (KM) *</label>
                  <input type="number" required placeholder="140000" value={newMaint.odometer} onChange={(e) => setNewMaint({ ...newMaint, odometer: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Workshop / Vendor Name *</label>
                  <input type="text" required placeholder="e.g. Guru Nanak Motor Workshop" value={newMaint.workshop_name} onChange={(e) => setNewMaint({ ...newMaint, workshop_name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Maintenance Cost (₹) *</label>
                  <input type="number" required placeholder="8500" value={newMaint.cost} onChange={(e) => setNewMaint({ ...newMaint, cost: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Workshop Next service date</label>
                <input type="date" value={newMaint.next_service_due_date} onChange={(e) => setNewMaint({ ...newMaint, next_service_due_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Service Notes / Tasks completed</label>
                <textarea rows={2} placeholder="Replaced brake liners and front oil filter..." value={newMaint.notes} onChange={(e) => setNewMaint({ ...newMaint, notes: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Publish Workshop Log
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= RECORD FUEL MODAL ======================= */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowFuelModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Record Fuel Card Refuel</h3>
            
            <form onSubmit={handleCreateFuel} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Fleet Vehicle *</label>
                  <select required value={newFuel.vehicle_id} onChange={(e) => setNewFuel({ ...newFuel, vehicle_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="">-- Choose Truck --</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Responsible Driver *</label>
                  <select required value={newFuel.driver_id} onChange={(e) => setNewFuel({ ...newFuel, driver_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="">-- Choose Driver --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Liters Filled *</label>
                  <input type="number" required placeholder="150" value={newFuel.litres} onChange={(e) => setNewFuel({ ...newFuel, litres: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Total Bill Cost (₹) *</label>
                  <input type="number" required placeholder="14000" value={newFuel.amount} onChange={(e) => setNewFuel({ ...newFuel, amount: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Odometer (KM) *</label>
                  <input type="number" required placeholder="95400" value={newFuel.odometer} onChange={(e) => setNewFuel({ ...newFuel, odometer: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Fuel Pump Station Name</label>
                  <input type="text" placeholder="IOCL Pump National Highway 4" value={newFuel.fuel_station} onChange={(e) => setNewFuel({ ...newFuel, fuel_station: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Publish Fuel Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= LOG TYRE INSTALL MODAL ======================= */}
      {showTyreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowTyreModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Register Tyre Mounting</h3>
            
            <form onSubmit={handleCreateTyre} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Mount On Vehicle *</label>
                  <select required value={newTyre.vehicle_id} onChange={(e) => setNewTyre({ ...newTyre, vehicle_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                    <option value="">-- Choose Truck --</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.reg_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Tyre Serial Number *</label>
                  <input type="text" required placeholder="e.g. TY-RAD-0294" value={newTyre.tyre_number} onChange={(e) => setNewTyre({ ...newTyre, tyre_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Axle Mounting Position</label>
                  <select value={newTyre.position} onChange={(e) => setNewTyre({ ...newTyre, position: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="front_left">Front Left (Steering)</option>
                    <option value="front_right">Front Right (Steering)</option>
                    <option value="rear_left_outer">Rear Left Outer (Drive)</option>
                    <option value="rear_left_inner">Rear Left Inner (Drive)</option>
                    <option value="rear_right_outer">Rear Right Outer (Drive)</option>
                    <option value="rear_right_inner">Rear Right Inner (Drive)</option>
                    <option value="trailer_axle_1_left">Trailer Axle 1 Left</option>
                    <option value="trailer_axle_1_right">Trailer Axle 1 Right</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Tyre Cost (₹) *</label>
                  <input type="number" required placeholder="16500" value={newTyre.cost} onChange={(e) => setNewTyre({ ...newTyre, cost: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Purchase Date</label>
                  <input type="date" value={newTyre.purchase_date} onChange={(e) => setNewTyre({ ...newTyre, purchase_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Initial KM odometer</label>
                  <input type="number" placeholder="0" value={newTyre.running_km} onChange={(e) => setNewTyre({ ...newTyre, running_km: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Retread History status</label>
                <select value={newTyre.retread_status} onChange={(e) => setNewTyre({ ...newTyre, retread_status: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="original">Original Factory Rubber</option>
                  <option value="once_retreaded">Once Retreaded (Resoled)</option>
                  <option value="twice_retreaded">Twice Retreaded (Resoled x2)</option>
                </select>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Publish Tyre Installation record
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
