import React, { useState, useRef } from 'react';
import { Driver, Trip, FuelLog, DriverSalaryLog } from '../types';
import {
  Truck,
  Compass,
  DollarSign,
  Droplet,
  UploadCloud,
  CheckCircle,
  Clock,
  Award,
  Phone,
  MapPin,
  ArrowRight,
  ShieldAlert,
  XCircle,
  Camera
} from 'lucide-react';

interface DriverPortalProps {
  companyId: string;
  driverObj: Driver;
  trips: Trip[];
  fuelLogs: FuelLog[];
  salaries: DriverSalaryLog[];
  onUploadPod: (tripId: string, url: string) => void;
}

export default function DriverPortal({
  companyId,
  driverObj,
  trips,
  fuelLogs,
  salaries,
  onUploadPod
}: DriverPortalProps) {
  const [activeTab, setActiveTab] = useState<'duty' | 'payouts' | 'fuel'>('duty');
  const [dragActive, setDragActive] = useState(false);
  const [podUploaded, setPodUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter strictly for THIS driver
  const myTrip = trips.find(t => t.driver_id === driverObj.id && t.status === 'in_transit');
  const pastTrips = trips.filter(t => t.driver_id === driverObj.id && t.status !== 'in_transit');
  const myFuelLogs = fuelLogs.filter(f => f.driver_id === driverObj.id);
  const mySalaries = salaries.filter(s => s.driver_id === driverObj.id);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      triggerPodUpload();
    }
  };

  const handleManualFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      triggerPodUpload();
    }
  };

  const triggerPodUpload = () => {
    if (!myTrip) return;
    const mockPodUrl = "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop";
    onUploadPod(myTrip.id, mockPodUrl);
    setPodUploaded(true);
    alert("POD uploaded successfully! Consignment dispatcher notified for validation.");
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      
      {/* Touch-Friendly Welcoming Card */}
      <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-cyan-500/10 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500 text-slate-950 font-black flex items-center justify-center text-sm">
              {driverObj.name[0]}
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Driver Duty Console</span>
              <h3 className="text-sm font-black text-white mt-0.5">{driverObj.name}</h3>
              <p className="text-[10px] text-slate-400">Assigned Truck: <strong className="text-slate-200 select-all">{driverObj.assigned_vehicle_reg || 'None'}</strong></p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-black block">Safety Index</span>
            <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1 mt-0.5">
              <Award className="w-3.5 h-3.5" /> {driverObj.safety_score}/100
            </span>
          </div>
        </div>
      </div>

      {/* Touch Bottom-bar Navigation */}
      <div className="grid grid-cols-3 bg-slate-900 p-1 rounded-xl border border-slate-800 text-center">
        <button
          onClick={() => setActiveTab('duty')}
          className={`py-2 rounded-lg text-xs font-black transition-all flex flex-col items-center gap-1 ${
            activeTab === 'duty' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          <Truck className="w-4.5 h-4.5" />
          <span>Active Duty</span>
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          className={`py-2 rounded-lg text-xs font-black transition-all flex flex-col items-center gap-1 ${
            activeTab === 'payouts' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          <DollarSign className="w-4.5 h-4.5" />
          <span>Salary Sheets</span>
        </button>
        <button
          onClick={() => setActiveTab('fuel')}
          className={`py-2 rounded-lg text-xs font-black transition-all flex flex-col items-center gap-1 ${
            activeTab === 'fuel' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          <Droplet className="w-4.5 h-4.5" />
          <span>Fuel Cards</span>
        </button>
      </div>

      {/* RENDER VIEWPORT */}
      {activeTab === 'duty' && (
        <div className="space-y-4">
          
          {/* Active Trip Assignment */}
          {myTrip ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-cyan-400 font-mono font-bold">{myTrip.trip_id_label}</span>
                <span className="text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">In Transit</span>
              </div>

              <div className="p-4 space-y-4">
                <div className="text-xs font-black text-slate-300 flex items-center gap-1.5 bg-slate-950/60 p-2.5 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{myTrip.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{myTrip.destination}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400 bg-slate-950 p-3 rounded-lg">
                  <div>Cargo: <strong className="text-slate-200 font-sans">{myTrip.material}</strong></div>
                  <div>Net Payload: <strong className="text-slate-200">{myTrip.weight_tons} Tons</strong></div>
                  <div>LR Ref: <span className="text-cyan-400 select-all font-sans font-bold">{myTrip.lr_number}</span></div>
                  <div>E-Way bill: <span className="text-cyan-400 select-all">{myTrip.eway_bill_number}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase font-black">Diesel Adv Card</span>
                    <div className="text-xs font-black text-emerald-400">₹{myTrip.diesel_advance.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-500 uppercase font-black">Driver Spot Cash</span>
                    <div className="text-xs font-black text-emerald-400">₹{myTrip.driver_cash.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Highway Proof of Delivery Upload zone */}
                <div className="pt-3 border-t border-slate-800">
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase mb-2">Unloading? Upload scanned POD:</h4>
                  
                  {!podUploaded ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-slate-800 hover:border-cyan-500/40 bg-slate-950/40 rounded-xl text-center cursor-pointer transition-all"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleManualFile}
                        className="hidden"
                      />
                      <Camera className="w-8 h-8 text-slate-500 mx-auto mb-1 animate-bounce" />
                      <p className="text-[10px] text-slate-300 font-bold">Tap to capture or drag POD photo</p>
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border-2 border-emerald-500/20 p-3 rounded-xl text-center text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Proof of Delivery (E-POD) Transmitted!
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 space-y-2">
              <Compass className="w-10 h-10 text-cyan-400 mx-auto" />
              <h4 className="text-xs font-bold text-white uppercase">Waiting for next Dispatch</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">Your vehicle is currently in Standby at the Delhi HQ terminal hub. Fleet office will notify you soon.</p>
            </div>
          )}

          {/* Past Completed Trips Log */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <h4 className="text-[10px] text-slate-400 font-bold uppercase mb-2">Past Completed Trips:</h4>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {pastTrips.map(pt => (
                <div key={pt.id} className="bg-slate-950 p-2.5 rounded text-[11px] flex justify-between items-center border border-slate-850">
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono">{pt.trip_id_label}</span>
                    <p className="text-white font-bold">{pt.origin} → {pt.destination}</p>
                  </div>
                  <span className="text-[9px] text-emerald-400 font-black uppercase">Delivered</span>
                </div>
              ))}
              {pastTrips.length === 0 && (
                <p className="text-[10px] text-slate-500 italic">No past trips found.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {activeTab === 'payouts' && (
        <div className="space-y-3">
          <h4 className="text-[10px] text-slate-400 font-bold uppercase px-1">Your Monthly Salary Ledger:</h4>
          
          {mySalaries.map(sal => (
            <div key={sal.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white">Month: <strong className="font-mono text-cyan-400">{sal.month_year}</strong></span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                  sal.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {sal.payment_status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400 bg-slate-950 p-3 rounded-lg">
                <div>Base wage: <span className="text-white">₹{sal.base_salary.toLocaleString('en-IN')}</span></div>
                <div>Trip Allowance: <span className="text-emerald-400">+₹{sal.trip_allowance.toLocaleString('en-IN')}</span></div>
                <div>Advance deduction: <span className="text-red-400">-₹{sal.advance_deduction.toLocaleString('en-IN')}</span></div>
                <div>Other penalties: <span className="text-red-400">-₹{sal.other_deductions.toLocaleString('en-IN')}</span></div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">Net payout transferred</span>
                <div className="text-sm font-black text-white">₹{sal.net_payable.toLocaleString('en-IN')}</div>
              </div>
            </div>
          ))}

          {mySalaries.length === 0 && (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No salary payout slips on file for this month yet.
            </div>
          )}
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="space-y-3">
          <h4 className="text-[10px] text-slate-400 font-bold uppercase px-1">Recent Fuel fillings history:</h4>
          
          {myFuelLogs.map(fl => (
            <div key={fl.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-white select-all">{fl.vehicle_reg}</span>
                <span className="text-[10px] text-slate-500 font-mono">{fl.date}</span>
              </div>
              <p className="text-[11px] text-slate-400">Pump: <strong>{fl.fuel_station}</strong></p>
              
              <div className="grid grid-cols-3 gap-2 text-center text-xs mt-3 bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                <div>
                  <div className="text-slate-400 font-mono font-bold">{fl.litres} L</div>
                  <span className="text-[8px] text-slate-500 uppercase">Liters Filled</span>
                </div>
                <div>
                  <div className="text-emerald-400 font-mono font-bold">KMPL {fl.mileage_calculated}</div>
                  <span className="text-[8px] text-slate-500 uppercase">Mileage Efficiency</span>
                </div>
                <div>
                  <div className="text-white font-mono font-bold">₹{fl.amount.toLocaleString('en-IN')}</div>
                  <span className="text-[8px] text-slate-500 uppercase">Voucher Cost</span>
                </div>
              </div>
            </div>
          ))}

          {myFuelLogs.length === 0 && (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No refuel cards used yet.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
