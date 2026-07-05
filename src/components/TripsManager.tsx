import React, { useState, useRef } from 'react';
import { Trip, Vehicle, Driver, ContractRate, MarketVehicleHire, TripStatus } from '../types';
import {
  Compass,
  Plus,
  Search,
  MapPin,
  ArrowRight,
  Truck,
  User,
  DollarSign,
  Droplet,
  CheckCircle,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileText,
  Activity,
  Calculator,
  XCircle,
  Eye,
  Settings
} from 'lucide-react';

interface TripsManagerProps {
  companyId: string;
  trips: Trip[];
  vehicles: Vehicle[];
  drivers: Driver[];
  contracts: ContractRate[];
  marketHires: MarketVehicleHire[];
  onUpdateTrips: (items: Trip[]) => void;
  onUpdateVehicles: (items: Vehicle[]) => void;
  onUpdateDrivers: (items: Driver[]) => void;
  onUpdateMarketHires: (items: MarketVehicleHire[]) => void;
  userRole: string;
}

export default function TripsManager({
  companyId,
  trips,
  vehicles,
  drivers,
  contracts,
  marketHires,
  onUpdateTrips,
  onUpdateVehicles,
  onUpdateDrivers,
  onUpdateMarketHires,
  userRole
}: TripsManagerProps) {
  const [activeTab, setActiveTab] = useState<'trips' | 'hired'>('trips');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showPodModal, setShowPodModal] = useState<Trip | null>(null);
  const [showLiveTracker, setShowLiveTracker] = useState<Trip | null>(null);

  // Dispatch state
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({
    customer_id: '', vehicle_id: '', driver_id: '', origin: '', destination: '', material: '', weight_tons: 20, freight_amount: 0, advance_paid: 0, diesel_advance: 0, driver_cash: 0, lr_number: '', eway_bill_number: '', remarks: ''
  });

  // Hired agreement state
  const [marketAgreement, setMarketAgreement] = useState<Partial<MarketVehicleHire>>({
    market_vehicle_reg: '', owner_name: '', owner_mobile: '', agreed_hire_amount: 0, advance_paid: 0
  });
  const [isHiredVehicle, setIsHiredVehicle] = useState(false);

  // File Upload drag/drop
  const [dragActive, setDragActive] = useState(false);
  const [podPreviewUrl, setPodPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto Lookup Route Contract Rate
  const handleContractLookup = (custId: string, origin: string, dest: string) => {
    const match = contracts.find(c => 
      c.customer_id === custId && 
      c.origin.toLowerCase() === origin.toLowerCase() && 
      c.destination.toLowerCase() === dest.toLowerCase()
    );
    if (match) {
      setNewTrip(prev => ({
        ...prev,
        freight_amount: match.rate,
        weight_tons: match.min_guarantee_tons || 20
      }));
      alert(`Contract found! Auto-loaded freight rate: ₹${match.rate} (${match.rate_type.replace('_', ' ')})`);
    }
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vObj = vehicles.find(v => v.id === newTrip.vehicle_id);
    const dObj = drivers.find(d => d.id === newTrip.driver_id);
    const custContract = contracts.find(c => c.customer_id === newTrip.customer_id);

    const tripIdStr = 't-' + Date.now();
    const tripLabelStr = 'TRIP-2026-' + Math.floor(Math.random() * 9000 + 1000);
    const lrStr = newTrip.lr_number || ('LR-GARUD-' + Math.floor(Math.random() * 90000 + 10000));

    const freight = Number(newTrip.freight_amount) || 50000;
    const advPaid = Number(newTrip.advance_paid) || 0;

    const createdTrip: Trip = {
      id: tripIdStr,
      company_id: companyId,
      branch_id: vObj?.branch_id || 'br-balaji-hq',
      trip_id_label: tripLabelStr,
      customer_id: newTrip.customer_id || '',
      customer_name: custContract ? custContract.customer_name : 'Walk-in Party',
      vehicle_id: newTrip.vehicle_id || '',
      vehicle_reg: vObj ? vObj.reg_number : (marketAgreement.market_vehicle_reg || 'Market Vehicle'),
      driver_id: newTrip.driver_id || '',
      driver_name: dObj ? dObj.name : 'Spot Driver',
      origin: newTrip.origin || '',
      destination: newTrip.destination || '',
      loading_date_time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      material: newTrip.material || 'General Cargo',
      weight_tons: Number(newTrip.weight_tons) || 20,
      freight_amount: freight,
      advance_paid: advPaid,
      diesel_advance: Number(newTrip.diesel_advance) || 0,
      driver_cash: Number(newTrip.driver_cash) || 0,
      status: 'in_transit',
      pod_status: 'pending',
      lr_number: lrStr,
      eway_bill_number: newTrip.eway_bill_number || ('EWB-' + Math.floor(Math.random() * 900000000000 + 100000000000)),
      remarks: newTrip.remarks || 'Dispatched via Garud Command Control Center.',
      created_at: new Date().toISOString().split('T')[0]
    };

    // Update vehicle status
    if (vObj) {
      const updatedVehicles = vehicles.map(v => v.id === vObj.id ? { ...v, status: 'on_trip' as const, driver_name: dObj?.name, driver_id: dObj?.id } : v);
      onUpdateVehicles(updatedVehicles);
    }

    // Update driver status
    if (dObj) {
      const updatedDrivers = drivers.map(d => d.id === dObj.id ? { ...d, status: 'on_trip' as const, assigned_vehicle_id: vObj?.id, assigned_vehicle_reg: vObj?.reg_number } : d);
      onUpdateDrivers(updatedDrivers);
    }

    // If outsourced vehicle, write market agreement
    if (isHiredVehicle && marketAgreement.market_vehicle_reg) {
      const hireAmt = Number(marketAgreement.agreed_hire_amount) || 40000;
      const commission = freight - hireAmt;
      const hiredRec: MarketVehicleHire = {
        id: 'hire-' + Date.now(),
        company_id: companyId,
        trip_id: tripIdStr,
        market_vehicle_reg: marketAgreement.market_vehicle_reg.toUpperCase(),
        owner_name: marketAgreement.owner_name || 'Market Operator',
        owner_mobile: marketAgreement.owner_mobile || '',
        agreed_hire_amount: hireAmt,
        advance_paid: Number(marketAgreement.advance_paid) || 0,
        balance_payable: hireAmt - (Number(marketAgreement.advance_paid) || 0),
        commission: commission,
        payment_status: Number(marketAgreement.advance_paid) > 0 ? 'partial' : 'unpaid'
      };
      onUpdateMarketHires([hiredRec, ...marketHires]);
    }

    onUpdateTrips([createdTrip, ...trips]);
    setShowDispatchModal(false);
    setIsHiredVehicle(false);
    setNewTrip({ customer_id: '', vehicle_id: '', driver_id: '', origin: '', destination: '', material: '', weight_tons: 20 });
    setMarketAgreement({});
  };

  // Drag and drop events
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
      simulateUpload(e.dataTransfer.files[0]);
    }
  };

  const handleManualFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0]);
    }
  };

  const simulateUpload = (file: File) => {
    // Generate a beautiful preview mock URL
    const mockUrls = [
      "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=600&auto=format&fit=crop"
    ];
    setPodPreviewUrl(mockUrls[Math.floor(Math.random() * mockUrls.length)]);
  };

  const submitPodApproval = () => {
    if (!showPodModal) return;
    const updated = trips.map(t => {
      if (t.id === showPodModal.id) {
        return {
          ...t,
          status: 'pod_pending' as const,
          pod_status: 'submitted' as const,
          pod_url: podPreviewUrl || 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop',
          unloading_date_time: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };
      }
      return t;
    });

    onUpdateTrips(updated);
    setShowPodModal(null);
    setPodPreviewUrl('');
    alert(`E-POD scanned file registered successfully. Operation manager and Client billing department notified.`);
  };

  const approvePodCompleted = (trip: Trip) => {
    const updated = trips.map(t => {
      if (t.id === trip.id) {
        return {
          ...t,
          status: 'pod_pending' as const, // Wait for invoicing
          pod_status: 'approved' as const
        };
      }
      return t;
    });
    onUpdateTrips(updated);
    alert(`POD approved! Status cleared for Invoice processing.`);
  };

  // Live GPS simulation values
  const getSimulatedSpeed = (status: string) => {
    return status === 'in_transit' ? Math.floor(Math.random() * 25 + 50) : 0;
  };

  const filteredTrips = trips.filter(t => {
    const matchesSearch = t.trip_id_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.vehicle_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Tab bar operations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab('trips'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'trips' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Compass className="w-4 h-4" />
            Live Dispatch Board ({trips.length})
          </button>
          <button
            onClick={() => { setActiveTab('hired'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'hired' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Truck className="w-4 h-4" />
            Outsourced / Market Hires ({marketHires.length})
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'trips' && (
            <button
              onClick={() => setShowDispatchModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Dispatch Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search Trip ID, vehicle plate, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {activeTab === 'trips' && (
          <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {['all', 'in_transit', 'pod_pending', 'billed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  statusFilter === st ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* DISPATCH LIST */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {filteredTrips.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No trips matching filters. Dispatch a vehicle to create live track.
            </div>
          ) : (
            filteredTrips.map(t => {
              const speedVal = getSimulatedSpeed(t.status);
              
              return (
                <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all overflow-hidden">
                  {/* Top Header */}
                  <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono font-bold text-xs select-all">{t.trip_id_label}</span>
                      <span className="text-slate-600">|</span>
                      <span className="text-[11px] font-black text-slate-200">{t.customer_name}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-mono">LR Ref: <span className="text-slate-300 select-all font-bold">{t.lr_number}</span></span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                        t.status === 'in_transit' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse' :
                        t.status === 'pod_pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Route Details */}
                    <div className="space-y-2">
                      <div className="text-xs font-black text-slate-300 flex items-center gap-1.5 bg-slate-950/60 p-2.5 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        <span className="truncate">{t.origin}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="truncate">{t.destination}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-1">
                        Material: <strong className="text-slate-300 font-sans">{t.material}</strong> | Payload: <strong className="text-slate-300">{t.weight_tons} Tons</strong>
                      </p>
                    </div>

                    {/* Operational Details */}
                    <div className="space-y-1.5 text-[11px] font-mono text-slate-400 border-l border-slate-800/80 pl-6">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-slate-500" />
                        <span>Vehicle: <strong className="text-white select-all font-sans">{t.vehicle_reg}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-slate-500" />
                        <span>Driver: <strong className="text-white font-sans">{t.driver_name}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Droplet className="w-4 h-4 text-emerald-400" />
                        <span>Fuel Adv: <strong className="text-slate-300 font-sans">₹{t.diesel_advance.toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>

                    {/* Commercial summary */}
                    <div className="space-y-1.5 text-right border-l border-slate-800/80 pl-6 flex flex-col justify-center">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Total contracted freight</span>
                        <div className="text-sm font-extrabold text-white">₹{t.freight_amount.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Driver Cash Adv: <strong className="text-slate-300">₹{t.driver_cash}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions & telemetry bar */}
                  <div className="px-5 py-3 bg-slate-950/25 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                    {t.status === 'in_transit' ? (
                      <div className="flex items-center gap-4 text-slate-500 font-mono">
                        <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Speed: <strong className="text-emerald-400">{speedVal} KM/H</strong></span>
                        <span className="flex items-center gap-1"><Settings className="w-3.5 h-3.5 text-slate-400 animate-spin" /> Ignition: <strong className="text-emerald-400">ON</strong></span>
                      </div>
                    ) : (
                      <div className="text-slate-500 font-mono italic">
                        Unloaded on: {t.unloading_date_time || 'Pending update'}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowLiveTracker(t)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] px-2.5 py-1.5 rounded-md transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Telemetry
                      </button>

                      {t.status === 'in_transit' ? (
                        <button
                          onClick={() => setShowPodModal(t)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-md transition-all flex items-center gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5" /> Log Arrival / POD
                        </button>
                      ) : t.pod_status === 'submitted' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded font-bold uppercase">POD Pending Approval</span>
                          {userRole === 'admin' && (
                            <button
                              onClick={() => approvePodCompleted(t)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] px-2 py-1 rounded transition-all"
                            >
                              Approve POD
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-black uppercase flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> POD Approved
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* OUTSOURCED VEHICLES LEDGER */}
      {activeTab === 'hired' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Broker / Spot Market Hired Vehicles Log</h4>
            <span className="text-[10px] text-slate-500 font-mono">Commission Brokerage Tracker</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[9px] border-b border-slate-800">
                <tr>
                  <th className="p-3 pl-5">Market Vehicle</th>
                  <th className="p-3">Vendor / Owner</th>
                  <th className="p-3 text-right">Agreed Hire Rate (₹)</th>
                  <th className="p-3 text-right">Advance Paid (₹)</th>
                  <th className="p-3 text-right">Balance Payable (₹)</th>
                  <th className="p-3 text-right">Net Profit / Margin (₹)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {marketHires.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                      No spot market vehicle agreements registered. Dispatch a hired vehicle to see logs.
                    </td>
                  </tr>
                ) : (
                  marketHires.map(h => (
                    <tr key={h.id} className="hover:bg-slate-800/30">
                      <td className="p-3 pl-5 font-bold text-white select-all">{h.market_vehicle_reg}</td>
                      <td className="p-3 font-medium text-slate-300">
                        {h.owner_name}
                        <div className="text-[10px] text-slate-500 select-all">{h.owner_mobile}</div>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">₹{h.agreed_hire_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-amber-400">₹{h.advance_paid.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-slate-100 font-bold">₹{h.balance_payable.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-emerald-400 font-black bg-slate-950/15">
                        +₹{h.commission.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          h.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {h.payment_status}
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

      {/* ======================= VEHICLE DISPATCH MODAL ======================= */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowDispatchModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Trip Dispatch & Driver Advance Authorization</h3>
            
            <form onSubmit={handleDispatchSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Contract Customer *</label>
                  <select required value={newTrip.customer_id} onChange={(e) => setNewTrip({ ...newTrip, customer_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="">-- Select Client --</option>
                    {contracts.map(c => <option key={c.id} value={c.customer_id}>{c.customer_name} ({c.origin} → {c.destination})</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Procurement</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsHiredVehicle(false)} className={`flex-1 p-1 text-[10px] font-bold rounded ${!isHiredVehicle ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}>
                      In-House
                    </button>
                    <button type="button" onClick={() => setIsHiredVehicle(true)} className={`flex-1 p-1 text-[10px] font-bold rounded ${isHiredVehicle ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400'}`}>
                      Spot Market
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!isHiredVehicle ? (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Duty Vehicle (Available) *</label>
                    <select required={!isHiredVehicle} value={newTrip.vehicle_id} onChange={(e) => {
                      const veh = vehicles.find(v => v.id === e.target.value);
                      setNewTrip(prev => ({ ...prev, vehicle_id: e.target.value, driver_id: veh?.driver_id || prev.driver_id }));
                    }} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                      <option value="">-- Choose Truck --</option>
                      {vehicles.filter(v => v.status === 'available').map(v => <option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type.toUpperCase()})</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Market Truck Number *</label>
                    <input type="text" required placeholder="e.g. MH-12-AB-9090" value={marketAgreement.market_vehicle_reg} onChange={(e) => setMarketAgreement({ ...marketAgreement, market_vehicle_reg: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono uppercase" />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Duty Driver *</label>
                  <select required value={newTrip.driver_id} onChange={(e) => setNewTrip({ ...newTrip, driver_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="">-- Choose Driver --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.status})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-850">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Origin *</label>
                  <input type="text" required placeholder="Pune Plant" value={newTrip.origin} onChange={(e) => setNewTrip({ ...newTrip, origin: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Destination *</label>
                  <input type="text" required placeholder="Chennai Port" value={newTrip.destination} onChange={(e) => setNewTrip({ ...newTrip, destination: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div className="col-span-2">
                  <button type="button" onClick={() => handleContractLookup(newTrip.customer_id || '', newTrip.origin || '', newTrip.destination || '')} className="text-[10px] text-cyan-400 hover:underline font-black flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" /> Check Approved Client Contract Rate
                  </button>
                </div>
              </div>

              {isHiredVehicle && (
                <div className="grid grid-cols-3 gap-3 bg-indigo-950/20 p-3 rounded-lg border border-indigo-500/15">
                  <div className="col-span-3 text-[10px] font-black text-indigo-400 uppercase">Spot Market Broker Agreement</div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Agreed Rate to Owner</label>
                    <input type="number" placeholder="42000" value={marketAgreement.agreed_hire_amount} onChange={(e) => setMarketAgreement({ ...marketAgreement, agreed_hire_amount: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Advance Paid to Owner</label>
                    <input type="number" placeholder="15000" value={marketAgreement.advance_paid} onChange={(e) => setMarketAgreement({ ...marketAgreement, advance_paid: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-1">Owner Contact Name</label>
                    <input type="text" placeholder="Vendor Owner" value={marketAgreement.owner_name} onChange={(e) => setMarketAgreement({ ...marketAgreement, owner_name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Client Contract Freight (₹)</label>
                  <input type="number" required placeholder="55000" value={newTrip.freight_amount} onChange={(e) => setNewTrip({ ...newTrip, freight_amount: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Diesel Advance card (₹)</label>
                  <input type="number" placeholder="25000" value={newTrip.diesel_advance} onChange={(e) => setNewTrip({ ...newTrip, diesel_advance: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Driver Spot Cash (₹)</label>
                  <input type="number" placeholder="5000" value={newTrip.driver_cash} onChange={(e) => setNewTrip({ ...newTrip, driver_cash: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">LR / Consignment Number</label>
                  <input type="text" placeholder="Auto-generated" value={newTrip.lr_number} onChange={(e) => setNewTrip({ ...newTrip, lr_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono uppercase" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">RTO E-Way Bill Number</label>
                  <input type="text" placeholder="12 digit number" value={newTrip.eway_bill_number} onChange={(e) => setNewTrip({ ...newTrip, eway_bill_number: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Cargo Description</label>
                  <input type="text" placeholder="e.g. Iron coils" value={newTrip.material} onChange={(e) => setNewTrip({ ...newTrip, material: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Authorize Dispatch & Transmit Telemetry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= POD FILE UPLOAD MODAL ======================= */}
      {showPodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowPodModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-2">Electronic POD Upload & Unloading Scan</h3>
            <p className="text-[11px] text-slate-400 mb-4">Trip Label: <strong className="text-cyan-400 font-mono">{showPodModal.trip_id_label}</strong></p>
            
            <div className="space-y-4">
              
              {/* Dropzone container - Supports both Drag-and-drop & Manual select */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
                  dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-850 hover:border-slate-700 bg-slate-950/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleManualFile}
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs text-slate-200 font-bold">Drag & drop scanned POD here, or <span className="text-cyan-400 hover:underline">browse</span></p>
                <p className="text-[10px] text-slate-500 mt-1">Supports PDF, JPG, PNG (Max 5MB)</p>
              </div>

              {podPreviewUrl && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase block mb-2 w-fit">POD Doc Detected</span>
                  <img src={podPreviewUrl} alt="POD Scanned Preview" className="w-full h-32 object-cover rounded border border-slate-800" />
                </div>
              )}

              <button
                type="button"
                onClick={submitPodApproval}
                disabled={!podPreviewUrl}
                className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  podPreviewUrl ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                Authorize Unloading & Post POD Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= LIVE TELEMETRY MODAL ======================= */}
      {showLiveTracker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowLiveTracker(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-2">Garud Command Center: Fleet Live Telemetry</h3>
            <p className="text-[11px] text-slate-400 mb-4">Oversight for vehicle: <strong className="text-cyan-400">{showLiveTracker.vehicle_reg}</strong></p>

            <div className="space-y-4">
              
              {/* MAP SIMULATOR */}
              <div className="h-44 rounded-xl bg-slate-950 border border-slate-850 overflow-hidden relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                
                {/* Simulating a tracking line and pulse radar */}
                <div className="absolute w-24 h-24 bg-cyan-500/5 rounded-full border border-cyan-500/20 animate-ping"></div>
                <div className="absolute w-44 h-44 bg-cyan-500/5 rounded-full border border-cyan-500/10 animate-pulse"></div>

                <div className="relative text-center z-10 space-y-1">
                  <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-200 shadow-xl inline-flex items-center gap-1.5">
                    <MapPin className="w-4.5 h-4.5 text-red-400 animate-bounce" />
                    <span>NH-48 Corridor Bypass</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Coords: 26.8521° N, 75.7201° E (Jaipur Hub)</p>
                </div>
              </div>

              {/* TELEMETRY GRIDS */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Speedometer</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{getSimulatedSpeed(showLiveTracker.status)} KM/H</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">ADAS Cameras</span>
                  <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">4 Active</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">GPS Link</span>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">100% (LIVE)</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                <h4 className="text-[10px] text-slate-500 uppercase font-bold">Trip logs:</h4>
                <div className="space-y-1.5 font-mono text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span>[10:04:12 AM] Fastag Auto-Debited ₹1,450 at Shahjahanpur Toll Plaza</span>
                    <span className="text-slate-600">Delhi-Jaipur</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[09:12:00 AM] Over-speed threshold warning resolved (Current: 78 KM/H)</span>
                    <span className="text-amber-500 font-bold">ADAS</span>
                  </div>
                  <div className="flex justify-between">
                    <span>[08:00:15 AM] Driver Rajesh Kumar bio-metric verified & started engine</span>
                    <span className="text-emerald-500 font-bold">AUTH</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
