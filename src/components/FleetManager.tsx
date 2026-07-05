import React, { useState } from 'react';
import { Vehicle, Driver, DriverSalaryLog, VehicleType, OwnershipType, VehicleStatus } from '../types';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserCheck,
  Shield,
  FileText,
  Calendar,
  DollarSign,
  Compass,
  MapPin,
  Clock,
  Phone
} from 'lucide-react';

interface FleetManagerProps {
  companyId: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  salaries: DriverSalaryLog[];
  onUpdateVehicles: (items: Vehicle[]) => void;
  onUpdateDrivers: (items: Driver[]) => void;
  onUpdateSalaries: (items: DriverSalaryLog[]) => void;
  userRole: string;
  defaultTab?: 'vehicles' | 'drivers' | 'salaries';
}

export default function FleetManager({
  companyId,
  vehicles,
  drivers,
  salaries,
  onUpdateVehicles,
  onUpdateDrivers,
  onUpdateSalaries,
  userRole,
  defaultTab = 'vehicles'
}: FleetManagerProps) {
  const [activeTab, setActiveTab] = React.useState<'vehicles' | 'drivers' | 'salaries'>(defaultTab);

  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showVehModal, setShowVehModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);

  // Form states
  const [newVeh, setNewVeh] = useState<Partial<Vehicle>>({
    reg_number: '', vehicle_type: 'trailer', ownership_type: 'owned', owner_name: '', owner_phone: '', capacity_tons: 25, gps_device_id: '', fitness_expiry: '', insurance_expiry: '', puc_expiry: '', permit_expiry: '', status: 'available', current_location: 'Main Terminal Yard 1'
  });
  const [newDriver, setNewDriver] = useState<Partial<Driver>>({
    name: '', mobile: '', license_number: '', license_expiry: '', salary_type: 'fixed_plus_allowance', base_salary: 20000, emergency_contact: '', status: 'active', safety_score: 90
  });
  const [newSalary, setNewSalary] = useState<Partial<DriverSalaryLog>>({
    driver_id: '', month_year: '07-2026', base_salary: 20000, trip_allowance: 0, advance_deduction: 0, other_deductions: 0, payment_status: 'pending'
  });

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Vehicle = {
      id: 'v-' + Date.now(),
      company_id: companyId,
      reg_number: (newVeh.reg_number || '').toUpperCase(),
      vehicle_type: newVeh.vehicle_type as any,
      ownership_type: newVeh.ownership_type as any,
      owner_name: newVeh.ownership_type === 'owned' ? 'Garud Transports' : (newVeh.owner_name || 'Market Operator'),
      owner_phone: newVeh.owner_phone || '',
      capacity_tons: Number(newVeh.capacity_tons) || 25,
      gps_device_id: newVeh.gps_device_id || ('GPS-' + Math.floor(Math.random() * 9000 + 1000)),
      cameras_active: 4,
      fitness_expiry: newVeh.fitness_expiry || '2027-12-31',
      insurance_expiry: newVeh.insurance_expiry || '2027-12-31',
      puc_expiry: newVeh.puc_expiry || '2026-12-31',
      permit_expiry: newVeh.permit_expiry || '2028-12-31',
      status: 'available',
      current_location: newVeh.current_location || 'Main Terminal Yard 1',
      speed: 0,
      ignition: false
    };
    onUpdateVehicles([created, ...vehicles]);
    setShowVehModal(false);
    setNewVeh({ reg_number: '', vehicle_type: 'trailer', ownership_type: 'owned', owner_name: '', capacity_tons: 25 });
  };

  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Driver = {
      id: 'd-' + Date.now(),
      company_id: companyId,
      name: newDriver.name || '',
      mobile: newDriver.mobile || '',
      license_number: (newDriver.license_number || '').toUpperCase(),
      license_expiry: newDriver.license_expiry || '2030-12-31',
      salary_type: newDriver.salary_type as any,
      base_salary: Number(newDriver.base_salary) || 20000,
      kyc_documents: { verified: true },
      emergency_contact: newDriver.emergency_contact || '',
      status: 'active',
      safety_score: 95
    };
    onUpdateDrivers([created, ...drivers]);
    setShowDriverModal(false);
    setNewDriver({ name: '', mobile: '', license_number: '', license_expiry: '', base_salary: 20000, emergency_contact: '' });
  };

  const handleAddSalary = (e: React.FormEvent) => {
    e.preventDefault();
    const dObj = drivers.find(d => d.id === newSalary.driver_id);
    const base = Number(newSalary.base_salary) || (dObj ? dObj.base_salary : 20000);
    const allowance = Number(newSalary.trip_allowance) || 0;
    const advDec = Number(newSalary.advance_deduction) || 0;
    const otherDec = Number(newSalary.other_deductions) || 0;
    const net = base + allowance - advDec - otherDec;

    const created: DriverSalaryLog = {
      id: 'sal-' + Date.now(),
      company_id: companyId,
      driver_id: newSalary.driver_id || '',
      driver_name: dObj ? dObj.name : 'Unknown Driver',
      month_year: newSalary.month_year || '07-2026',
      base_salary: base,
      trip_allowance: allowance,
      advance_deduction: advDec,
      other_deductions: otherDec,
      net_payable: net,
      payment_status: newSalary.payment_status as any,
      payment_date: newSalary.payment_status === 'paid' ? new Date().toISOString().split('T')[0] : undefined
    };
    onUpdateSalaries([created, ...salaries]);
    setShowSalaryModal(false);
  };

  const checkDocExpiryStatus = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const today = new Date();
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: 'Expired', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    if (diffDays <= 30) return { label: `${diffDays} Days Left`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Valid', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  };

  const filteredVehicles = vehicles.filter(v =>
    v.reg_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.mobile.includes(searchTerm) ||
    d.license_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSalaries = salaries.filter(s =>
    s.driver_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Tabs Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab('vehicles'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'vehicles' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Truck className="w-4 h-4" />
            Vehicles & Trailers ({vehicles.length})
          </button>
          <button
            onClick={() => { setActiveTab('drivers'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'drivers' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Driver Rosters ({drivers.length})
          </button>
          <button
            onClick={() => { setActiveTab('salaries'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'salaries' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            Salary Sheets & Advances ({salaries.length})
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'vehicles' && (
            <button
              onClick={() => setShowVehModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Vehicle
            </button>
          )}
          {activeTab === 'drivers' && (
            <button
              onClick={() => setShowDriverModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Enlist Driver
            </button>
          )}
          {activeTab === 'salaries' && (
            <button
              onClick={() => setShowSalaryModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Process Salary
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

      {/* LISTINGS */}
      {activeTab === 'vehicles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No vehicles registered. Click "Add Vehicle" to register.
            </div>
          ) : (
            filteredVehicles.map(v => {
              const fitSt = checkDocExpiryStatus(v.fitness_expiry);
              const insSt = checkDocExpiryStatus(v.insurance_expiry);
              const permitSt = checkDocExpiryStatus(v.permit_expiry);
              
              return (
                <div key={v.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-5 h-5 text-cyan-400 animate-pulse" />
                        <h3 className="text-sm font-black text-white select-all">{v.reg_number}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase border ${
                        v.status === 'on_trip' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        v.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 mt-2">
                      <div>Type: <span className="text-white uppercase font-sans font-bold">{v.vehicle_type}</span></div>
                      <div>Ownership: <span className="text-white uppercase font-sans font-bold">{v.ownership_type}</span></div>
                      <div>Capacity: <span className="text-white font-sans">{v.capacity_tons} Tons</span></div>
                      <div>GPS Tracker: <span className="text-cyan-400 font-bold">{v.gps_device_id || 'None'}</span></div>
                    </div>

                    {/* Expiry deadlines */}
                    <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-800/80">
                      <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">RTO Compliance deadlines:</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-950 p-1.5 rounded text-[9px] border border-slate-800/80">
                          <div className="text-slate-500 uppercase font-bold text-[8px]">Fitness</div>
                          <div className="text-slate-300 font-mono mt-0.5">{v.fitness_expiry}</div>
                          <span className={`inline-block mt-1 px-1 rounded text-[7px] font-bold ${fitSt.color}`}>{fitSt.label}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded text-[9px] border border-slate-800/80">
                          <div className="text-slate-500 uppercase font-bold text-[8px]">Insurance</div>
                          <div className="text-slate-300 font-mono mt-0.5">{v.insurance_expiry}</div>
                          <span className={`inline-block mt-1 px-1 rounded text-[7px] font-bold ${insSt.color}`}>{insSt.label}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded text-[9px] border border-slate-800/80">
                          <div className="text-slate-500 uppercase font-bold text-[8px]">Permit</div>
                          <div className="text-slate-300 font-mono mt-0.5">{v.permit_expiry}</div>
                          <span className={`inline-block mt-1 px-1 rounded text-[7px] font-bold ${permitSt.color}`}>{permitSt.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      <span className="truncate max-w-[180px]">{v.current_location}</span>
                    </div>
                    <div className="text-[10px] font-mono font-bold text-slate-500">
                      Driver: <strong className="text-slate-300 font-sans">{v.driver_name || 'Not assigned'}</strong>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'drivers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDrivers.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No drivers found. Add standard driver details.
            </div>
          ) : (
            filteredDrivers.map(d => (
              <div key={d.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400">
                        {d.name[0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center gap-1">
                          {d.name}
                          <Shield className="w-3 h-3 text-emerald-400" />
                        </h4>
                        <span className="text-[9px] font-mono text-slate-500 select-all">Lic: {d.license_number}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                      d.status === 'on_trip' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      d.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400 mt-2 bg-slate-950 p-3 rounded-lg border border-slate-900">
                    <div>Mobile: <strong className="text-slate-300 select-all">{d.mobile}</strong></div>
                    <div>Salary Type: <strong className="text-slate-300 uppercase">{d.salary_type.replace(/_/g, ' ')}</strong></div>
                    <div>Base salary: <strong className="text-emerald-400">₹{d.base_salary.toLocaleString('en-IN')}</strong></div>
                    <div>Safety Score: <strong className="text-cyan-400">{d.safety_score}/100</strong></div>
                  </div>

                  {d.emergency_contact && (
                    <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1.5 italic">
                      <Phone className="w-3 h-3" /> Emergency Contact: <span className="text-slate-400 font-sans font-bold">{d.emergency_contact}</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Duty vehicle: <strong className="text-slate-300">{d.assigned_vehicle_reg || 'Unassigned'}</strong></span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase text-[8px]">
                    KYC Verified
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'salaries' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/40">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Payroll Processing Ledger</h4>
            <span className="text-[10px] text-slate-500 font-mono">Company ID: {companyId}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-850">
                <tr>
                  <th className="p-3 pl-5">Driver Name</th>
                  <th className="p-3">Month</th>
                  <th className="p-3 text-right">Base Salary (₹)</th>
                  <th className="p-3 text-right">Trip Allowance (₹)</th>
                  <th className="p-3 text-right">Advances Dec (₹)</th>
                  <th className="p-3 text-right">Net Payable (₹)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {filteredSalaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No processed salary logs found. Click "Process Salary" to generate one.
                    </td>
                  </tr>
                ) : (
                  filteredSalaries.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="p-3 pl-5 font-bold text-white">{s.driver_name}</td>
                      <td className="p-3 font-mono text-slate-400">{s.month_year}</td>
                      <td className="p-3 text-right font-mono text-slate-300">₹{s.base_salary.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-emerald-400">+₹{s.trip_allowance.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-red-400">-₹{s.advance_deduction.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-white font-extrabold bg-slate-950/20">₹{s.net_payable.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          s.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {s.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================= ADD VEHICLE MODAL ======================= */}
      {showVehModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowVehModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Register Fleet Vehicle</h3>
            <form onSubmit={handleAddVehicle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Reg Number *</label>
                  <input type="text" required placeholder="e.g. DL-11-AA-1234" value={newVeh.reg_number} onChange={(e) => setNewVeh({ ...newVeh, reg_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Type</label>
                  <select value={newVeh.vehicle_type} onChange={(e) => setNewVeh({ ...newVeh, vehicle_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="trailer">Trailer</option>
                    <option value="container">Container</option>
                    <option value="hywa">Hywa</option>
                    <option value="tipper">Tipper</option>
                    <option value="reefer">Reefer</option>
                    <option value="bus">Staff/School Bus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Ownership Type</label>
                  <select value={newVeh.ownership_type} onChange={(e) => setNewVeh({ ...newVeh, ownership_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="owned">Owned</option>
                    <option value="market">Market Hired</option>
                    <option value="attached">Attached Operator</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Payload Capacity (Tons)</label>
                  <input type="number" placeholder="25" value={newVeh.capacity_tons} onChange={(e) => setNewVeh({ ...newVeh, capacity_tons: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              {newVeh.ownership_type !== 'owned' && (
                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Owner Name</label>
                    <input type="text" placeholder="Owner Name" value={newVeh.owner_name} onChange={(e) => setNewVeh({ ...newVeh, owner_name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Owner Mobile</label>
                    <input type="text" placeholder="Owner Phone" value={newVeh.owner_phone} onChange={(e) => setNewVeh({ ...newVeh, owner_phone: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">GPS Device ID</label>
                  <input type="text" placeholder="GPS-9983" value={newVeh.gps_device_id} onChange={(e) => setNewVeh({ ...newVeh, gps_device_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Initial Yard Location</label>
                  <input type="text" value={newVeh.current_location} onChange={(e) => setNewVeh({ ...newVeh, current_location: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Fitness Expiry Date</label>
                  <input type="date" value={newVeh.fitness_expiry} onChange={(e) => setNewVeh({ ...newVeh, fitness_expiry: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Insurance Expiry Date</label>
                  <input type="date" value={newVeh.insurance_expiry} onChange={(e) => setNewVeh({ ...newVeh, insurance_expiry: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Authorize Fleet Vehicle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= ADD DRIVER MODAL ======================= */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowDriverModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Enlist Duty Driver</h3>
            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Driver Full Name *</label>
                <input type="text" required value={newDriver.name} onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Mobile Number *</label>
                  <input type="text" required placeholder="e.g. 9810022334" value={newDriver.mobile} onChange={(e) => setNewDriver({ ...newDriver, mobile: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Driving License Number *</label>
                  <input type="text" required placeholder="DL-0420..." value={newDriver.license_number} onChange={(e) => setNewDriver({ ...newDriver, license_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">License Expiry Date *</label>
                  <input type="date" required value={newDriver.license_expiry} onChange={(e) => setNewDriver({ ...newDriver, license_expiry: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Base Salary (₹)</label>
                  <input type="number" placeholder="20000" value={newDriver.base_salary} onChange={(e) => setNewDriver({ ...newDriver, base_salary: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Salary Model</label>
                  <select value={newDriver.salary_type} onChange={(e) => setNewDriver({ ...newDriver, salary_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="fixed_plus_allowance">Fixed + Trip Allowance</option>
                    <option value="monthly">Pure Monthly Salary</option>
                    <option value="per_trip">Per Trip Rate contract</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Emergency contact (e.g. Wife - Phone)</label>
                  <input type="text" placeholder="Name - Phone" value={newDriver.emergency_contact} onChange={(e) => setNewDriver({ ...newDriver, emergency_contact: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Enroll Driver
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= PROCESS SALARY MODAL ======================= */}
      {showSalaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowSalaryModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Generate Driver Salary Sheet</h3>
            <form onSubmit={handleAddSalary} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Driver *</label>
                <select required value={newSalary.driver_id} onChange={(e) => {
                  const d = drivers.find(drv => drv.id === e.target.value);
                  setNewSalary({ ...newSalary, driver_id: e.target.value, base_salary: d ? d.base_salary : 20000 });
                }} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Select Driver --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name} (Base: ₹{d.base_salary})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Salary Month/Year</label>
                  <input type="text" placeholder="e.g. 07-2026" value={newSalary.month_year} onChange={(e) => setNewSalary({ ...newSalary, month_year: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Verified Base Salary (₹)</label>
                  <input type="number" value={newSalary.base_salary} onChange={(e) => setNewSalary({ ...newSalary, base_salary: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Total Trip Allowances (₹)</label>
                  <input type="number" placeholder="8500" value={newSalary.trip_allowance} onChange={(e) => setNewSalary({ ...newSalary, trip_allowance: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Salary Advances Deducted (₹)</label>
                  <input type="number" placeholder="2000" value={newSalary.advance_deduction} onChange={(e) => setNewSalary({ ...newSalary, advance_deduction: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Other Penalties/Deductions (₹)</label>
                  <input type="number" placeholder="500" value={newSalary.other_deductions} onChange={(e) => setNewSalary({ ...newSalary, other_deductions: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Payment Status</label>
                  <select value={newSalary.payment_status} onChange={(e) => setNewSalary({ ...newSalary, payment_status: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                    <option value="pending">Pending Approval</option>
                    <option value="paid">Paid & Transferred</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Publish Payroll Slip
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
