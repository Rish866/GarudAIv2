import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Truck, 
  AlertTriangle, 
  Clock, 
  User, 
  ShieldAlert, 
  Gauge, 
  Eye, 
  Battery, 
  Wifi, 
  FileText, 
  Compass,
  Layers,
  Sparkles,
  TrendingUp,
  Sliders,
  DollarSign,
  Info,
  X
} from 'lucide-react';
import { Trip, Vehicle, Driver, SystemAlert } from '../types';

interface LiveDashboardProps {
  companyId: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  alerts: SystemAlert[];
  onTriggerSimulatedAlert: (alert: SystemAlert) => void;
}

export default function LiveDashboard({
  companyId,
  vehicles,
  drivers,
  trips,
  alerts,
  onTriggerSimulatedAlert
}: LiveDashboardProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeCameraStream, setActiveCameraStream] = useState<number>(1);
  const [showTelemetryModal, setShowTelemetryModal] = useState<boolean>(false);

  // Set the default selected vehicle
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehicles[0]);
    }
  }, [vehicles]);

  // Status mapping to match User requirement: "Running / Idle / Stopped / Offline"
  const getVehicleStatus = (v: Vehicle): 'Running' | 'Idle' | 'Stopped' | 'Offline' => {
    if (v.speed && v.speed > 5) return 'Running';
    if (v.ignition && (!v.speed || v.speed <= 5)) return 'Idle';
    if (!v.ignition && v.status !== 'inactive') return 'Stopped';
    return 'Offline';
  };

  const filteredVehicles = vehicles.filter(v => {
    const status = getVehicleStatus(v);
    if (statusFilter !== 'ALL' && status.toUpperCase() !== statusFilter.toUpperCase()) return false;
    return true;
  });

  // Calculate status metric highlights
  const metrics = {
    total: vehicles.length,
    running: vehicles.filter(v => getVehicleStatus(v) === 'Running').length,
    idle: vehicles.filter(v => getVehicleStatus(v) === 'Idle').length,
    stopped: vehicles.filter(v => getVehicleStatus(v) === 'Stopped').length,
    offline: vehicles.filter(v => getVehicleStatus(v) === 'Offline').length,
    delayed: trips.filter(t => t.status === 'in_transit' && Math.random() > 0.6).length,
    activeTrips: trips.filter(t => ['assigned', 'loading', 'in_transit', 'reached', 'unloaded'].includes(t.status)).length,
    pendingPOD: trips.filter(t => t.status === 'pod_pending' || !t.pod_url).length,
    revenue: trips.reduce((acc, t) => acc + t.freight_amount, 0),
    alertsCount: alerts.filter(a => !a.is_read).length
  };

  // Simulated Alert Generator for interactive demonstration
  const handleTriggerAISafetyAlert = () => {
    const types = [
      { type: 'driver_behavior', title: 'DSM: Driver Micro-sleep Sequence', desc: 'Active camera flagged micro-sleep pattern (eyes closed > 2s).', severity: 'critical' },
      { type: 'document_expiry', title: 'National Permit Expiry Warning', desc: 'Permit for HR-55-AJ-9021 expires in 4 days.', severity: 'warning' },
      { type: 'trip_delayed', title: 'Route Deviation Alert', desc: 'Vehicle departed standard highway corridor (NH-48 corridor corridor).', severity: 'critical' },
      { type: 'maintenance_due', title: 'Tire Pressure Loss Anomaly', desc: 'TPMS reports Front-Left tire pressure critical loss (82 PSI -> 44 PSI).', severity: 'warning' }
    ] as const;

    const selectedType = types[Math.floor(Math.random() * types.length)];
    const chosenVehicle = vehicles[Math.floor(Math.random() * vehicles.length)] || selectedVehicle;

    const newAlert: SystemAlert = {
      id: 'alert-' + Date.now(),
      company_id: companyId,
      type: selectedType.type as any,
      title: selectedType.title,
      description: `${chosenVehicle ? chosenVehicle.reg_number : 'Fleet Truck'}: ${selectedType.desc}`,
      severity: selectedType.severity,
      target_id: chosenVehicle?.id,
      created_at: new Date().toLocaleTimeString(),
      is_read: false
    };

    onTriggerSimulatedAlert(newAlert);
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Real-time Status Card Metrics HUD */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Fleet</span>
          <div className="text-2xl font-mono font-black text-white mt-1">{metrics.total} Trucks</div>
          <span className="text-[10px] text-cyan-400 font-mono mt-1 block">Live Connected: {metrics.total - metrics.offline}</span>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Running / Active</span>
          <div className="text-2xl font-mono font-black text-emerald-400 mt-1">{metrics.running} Moving</div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Avg Speed: 52 km/h</span>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Idle / Stopped</span>
          <div className="text-2xl font-mono font-black text-amber-500 mt-1">{metrics.idle + metrics.stopped} Trucks</div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">Engine Ignition: {metrics.idle} Live</span>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GPS Offline</span>
          <div className="text-2xl font-mono font-black text-red-500 mt-1">{metrics.offline} Offline</div>
          <span className="text-[10px] text-slate-500 font-mono mt-1 block">No updates &gt; 30 min</span>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl relative overflow-hidden">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Today Revenue</span>
          <div className="text-2xl font-mono font-black text-cyan-400 mt-1">₹{metrics.revenue.toLocaleString('en-IN')}</div>
          <span className="text-[10px] text-emerald-400 font-mono mt-1 block">Active Loads: {metrics.activeTrips}</span>
        </div>
      </div>

      {/* Main Interactive Map Command Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Map Screen HUD */}
        <div className="xl:col-span-8 flex flex-col space-y-4">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden relative min-h-[450px] flex flex-col justify-between">
            
            {/* Map Header Floating Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-sm px-4 py-2.5 rounded-xl text-xs font-bold text-slate-200 flex items-center space-x-3 pointer-events-auto shadow-xl">
                <Compass className="w-4 h-4 text-cyan-400 animate-spin" />
                <div>
                  <h3 className="font-extrabold text-white text-[11px] uppercase tracking-wider font-mono">India Live Logistics Corridor</h3>
                  <p className="text-[9px] text-slate-500">Scale: 1:40,000 | Hub Partitioning Active</p>
                </div>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-sm p-1 rounded-lg pointer-events-auto flex gap-1 shadow-xl">
                <button onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.2))} className="w-7 h-7 bg-slate-950 border border-slate-850 rounded hover:text-white flex items-center justify-center font-bold font-mono text-xs cursor-pointer">+</button>
                <button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.2))} className="w-7 h-7 bg-slate-950 border border-slate-850 rounded hover:text-white flex items-center justify-center font-bold font-mono text-xs cursor-pointer">-</button>
              </div>
            </div>

            {/* Map Visual Stage */}
            <div className="absolute inset-0 bg-[#020617] flex items-center justify-center pointer-events-auto">
              {/* Complex Vector Grid Map representation of Indian logistics corridors */}
              <div 
                className="w-full h-full relative transition-transform duration-300"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* SVG National Highways / Corridors */}
                <svg className="w-full h-full opacity-40 absolute inset-0" viewBox="0 0 800 500">
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0e172c" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#mapGrid)" />

                  {/* Main Arterial Highways */}
                  {/* Delhi - Mumbai Nhava Sheva (NH-48) */}
                  <path d="M220,120 L190,190 L160,250 L140,320 L180,380 L200,420" fill="none" stroke="#0891b2" strokeWidth="3" strokeDasharray="6,4" />
                  <text x="145" y="240" fill="#0891b2" fontSize="9" fontFamily="monospace" transform="rotate(-65 145 240)">NH-48 EXPRESSWAY</text>

                  {/* Mumbai - Pune - Hyderabad (NH-65) */}
                  <path d="M200,420 L230,430 L310,400 L390,380 L440,360" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                  
                  {/* Ahmedabad - Udaipur - Jaipur - Delhi */}
                  <path d="M140,320 L160,280 L200,180 L220,120" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="4,4" />

                  {/* Eastern Corridor Coal Route */}
                  <path d="M220,120 L350,150 L480,220 L520,310" fill="none" stroke="#f59e0b" strokeWidth="2" />

                  {/* Key Logistic Hub Nodes */}
                  <circle cx="220" cy="120" r="6" fill="#f43f5e" />
                  <text x="230" y="123" fill="#94a3b8" fontSize="9" fontWeight="bold">DELHI NCR</text>

                  <circle cx="200" cy="420" r="6" fill="#06b6d4" />
                  <text x="145" y="435" fill="#94a3b8" fontSize="9" fontWeight="bold">JNPT MUMBAI</text>

                  <circle cx="140" cy="320" r="5" fill="#10b981" />
                  <text x="80" y="324" fill="#94a3b8" fontSize="9" fontWeight="bold">AHMEDABAD</text>

                  <circle cx="390" cy="380" r="5" fill="#3b82f6" />
                  <text x="385" y="396" fill="#94a3b8" fontSize="9" fontWeight="bold">HYDERABAD</text>
                </svg>

                {/* Map Interactive vehicle markers */}
                {filteredVehicles.map((v, idx) => {
                  // Generate reliable mock coordinates on highways
                  const offsets = [
                    { x: 190, y: 190 }, // NH-48 Udaipur Bypass
                    { x: 230, y: 430 }, // Pune Industrial Corridor
                    { x: 160, y: 280 }, // Jaipur Bypass Road
                    { x: 410, y: 375 }, // Hyderabad Entry Hub
                    { x: 310, y: 140 }, // Northern Plains Coal Route
                    { x: 140, y: 320 }  // Ahmedabad Terminal
                  ];

                  const pos = offsets[idx % offsets.length];
                  const status = getVehicleStatus(v);
                  const isSelected = selectedVehicle?.id === v.id;

                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      style={{ top: `${pos.y}px`, left: `${pos.x}px` }}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-20 focus:outline-none"
                    >
                      <div className="relative flex items-center justify-center">
                        {/* Radial Ping indicator */}
                        {status === 'Running' && (
                          <span className="absolute w-6 h-6 rounded-full bg-cyan-400/35 animate-ping"></span>
                        )}
                        {status === 'Idle' && (
                          <span className="absolute w-5 h-5 rounded-full bg-amber-500/20 animate-pulse"></span>
                        )}

                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-lg transition-all ${
                          isSelected 
                            ? 'bg-cyan-400 text-slate-950 border-white scale-110' 
                            : status === 'Running' ? 'bg-slate-900 border-cyan-400 text-cyan-400'
                            : status === 'Idle' ? 'bg-slate-900 border-amber-500 text-amber-500'
                            : status === 'Stopped' ? 'bg-slate-900 border-slate-500 text-slate-400'
                            : 'bg-slate-950 border-red-500/40 text-red-500/60'
                        }`}>
                          <Truck className="w-4.5 h-4.5" />
                        </div>

                        {/* Floating vehicle badge on hover/select */}
                        <div className={`absolute top-9 bg-slate-950 border border-slate-800 text-[10px] text-white rounded-md px-2 py-1 font-mono shadow-xl transition-all whitespace-nowrap ${
                          isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 pointer-events-none'
                        }`}>
                          <div className="font-extrabold">{v.reg_number}</div>
                          <div className="text-[9px] text-slate-400">{v.speed || 0} km/h • {v.driver_name || 'No Driver'}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulated Live Alert ticker / status logs */}
            <div className="absolute bottom-4 left-4 z-10 max-w-sm pointer-events-auto">
              <div className="bg-slate-950/90 border border-slate-900 rounded-xl p-3 shadow-xl backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-red-400 uppercase tracking-widest font-mono mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span>Active ADAS Safety Events</span>
                </div>
                <div className="space-y-1 max-h-20 overflow-y-auto pr-1">
                  {alerts.slice(0, 3).map((al) => (
                    <div key={al.id} className="text-[10px] text-slate-300 font-mono flex items-center space-x-1.5 border-b border-slate-900/60 py-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${al.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                      <span className="font-bold shrink-0">{al.created_at}:</span>
                      <span className="truncate">{al.description}</span>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="text-[10px] text-slate-500 italic">No critical alerts flagged. Cabin telemetry clear.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: Map Controls */}
            <div className="z-10 bg-slate-950/90 border-t border-slate-900 px-5 py-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <div className="flex items-center space-x-4">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400"></span> Moving</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Idle / Ignition On</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Stopped</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/60"></span> Offline</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleTriggerAISafetyAlert}
                  className="bg-red-950/50 hover:bg-red-900/40 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Simulate AI Alarm
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Row: Core Operational Status summaries (Dispatch, Expiry, Maintenance) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-left">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Today Dispatch Summary
              </h4>
              <p className="text-xl font-mono font-black text-white">{trips.filter(t => t.status === 'assigned' || t.status === 'loading').length} Loads</p>
              <p className="text-[10px] text-slate-400 mt-1">Pending LR generation: {trips.filter(t => !t.lr_number).length} bookings</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-left">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500" />
                POD Submission Summary
              </h4>
              <p className="text-xl font-mono font-black text-white">{trips.filter(t => t.status === 'pod_pending').length} Pending</p>
              <p className="text-[10px] text-slate-400 mt-1">Today approved: {trips.filter(t => t.status === 'completed').length} PODs</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 text-left">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Document Expiry Alerts
              </h4>
              <p className="text-xl font-mono font-black text-white">4 Vehicles Due</p>
              <p className="text-[10px] text-slate-400 mt-1">National permit expiry warnings active</p>
            </div>
          </div>
        </div>

        {/* Right Column: Clicked Vehicle detailed Telemetry Dashboard */}
        <div className="xl:col-span-4 bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col justify-between">
          {selectedVehicle ? (
            <div className="space-y-6">
              
              {/* Profile card details */}
              <div className="border-b border-slate-900 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="bg-cyan-500/10 text-cyan-400 text-[10px] font-bold font-mono border border-cyan-500/25 px-2.5 py-1 rounded uppercase tracking-wider">
                      {selectedVehicle.reg_number}
                    </span>
                    <h2 className="text-base font-black text-white mt-2">{selectedVehicle.driver_name || 'No Driver Assigned'}</h2>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase border ${
                      getVehicleStatus(selectedVehicle) === 'Running' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse' :
                      getVehicleStatus(selectedVehicle) === 'Idle' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-slate-900 text-slate-500 border-slate-800'
                    }`}>
                      {getVehicleStatus(selectedVehicle)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedVehicle.current_location || 'NH-48 corridor near Udaipur'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Updated: {selectedVehicle.last_gps_update || 'Just now'}</span>
                  </div>
                </div>
              </div>

              {/* Live Animated Speed Dial & GPS tracking metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">GPS Speed</span>
                  <div className="flex items-baseline space-x-1 my-2">
                    <span className="text-2xl font-mono font-black text-cyan-400">{selectedVehicle.speed || 0}</span>
                    <span className="text-xs text-slate-500 font-mono">km/h</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-cyan-500 h-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((selectedVehicle.speed || 0) / 90) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Ignition Status</span>
                  <div className="flex items-center space-x-1.5 my-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${selectedVehicle.ignition ? 'bg-emerald-400 shadow-lg shadow-emerald-500/20' : 'bg-slate-600'}`}></span>
                    <span className="text-sm font-extrabold text-white">{selectedVehicle.ignition ? 'IGNITION ON' : 'IGNITION OFF'}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Voltage: 24.2V (Ok)</span>
                </div>
              </div>

              {/* Active Trip Info details */}
              <div className="p-4 bg-slate-900/40 border border-slate-850 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800/80 pb-2">
                  <span>Current Active Duty</span>
                  <span className="text-cyan-400">TRIP_ENGAGED</span>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Route Corridor</span>
                    <span className="font-extrabold text-slate-300">{selectedVehicle.route || 'Delhi Cargo Terminal → Mumbai Nhava Sheva'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tonnage Capacity</span>
                    <span className="font-mono font-bold text-slate-300">{selectedVehicle.capacity_tons || 28} Tons</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Active Cameras</span>
                    <span className="text-emerald-400 font-bold font-mono">✓ {selectedVehicle.cameras_active || 4} Channel On</span>
                  </div>
                </div>
              </div>

              {/* Button link to view full active camera telemetry streams */}
              <button
                onClick={() => setShowTelemetryModal(true)}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider cursor-pointer"
              >
                <Eye className="w-4 h-4" /> View Live Cabin Dashcams
              </button>

            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs italic flex flex-col items-center justify-center space-y-2 h-full">
              <Compass className="w-8 h-8 text-slate-700 animate-spin" />
              <span>Selecting vehicle telematic feeds...</span>
            </div>
          )}
        </div>

      </div>

      {/* Live Dashcam Camera Diagnostic Stream Modal */}
      {showTelemetryModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 relative">
            
            <button 
              onClick={() => setShowTelemetryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6 border-b border-slate-800 pb-3">
              <span className="bg-cyan-500/10 text-cyan-400 text-xs font-bold font-mono px-2.5 py-1 rounded">
                TELEMETRY DIAGNOSTIC // {selectedVehicle.reg_number}
              </span>
              <h3 className="text-base font-black text-white">4-Channel Live Dashcam Stream</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Grid of 4 cameras */}
              <div className="md:col-span-8 grid grid-cols-2 gap-3">
                {[
                  { channel: 1, label: 'Road Forward Lens (ADAS)', feed: 'Clear visibility • Highway corridor' },
                  { channel: 2, label: 'Cabin Driver Focus (DSM)', feed: 'Driver wearing seatbelt • Alert' },
                  { channel: 3, label: 'Left Blindspot Lens', feed: 'No lane obstruction' },
                  { channel: 4, label: 'Cargo Container Rear', feed: 'Secured container door lock' }
                ].map((cam) => (
                  <button
                    key={cam.channel}
                    onClick={() => setActiveCameraStream(cam.channel)}
                    className={`p-1 rounded-xl text-left border overflow-hidden relative group transition-all ${
                      activeCameraStream === cam.channel 
                        ? 'border-cyan-500 bg-slate-950/90 shadow-lg shadow-cyan-500/5' 
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/20'
                    }`}
                  >
                    {/* Simulated visual video stream container */}
                    <div className="bg-slate-950 rounded-lg aspect-video flex items-center justify-center relative overflow-hidden">
                      {/* Grid overlays */}
                      <div className="absolute inset-0 bg-[radial-gradient(#0891b2_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
                      
                      {/* Scanline effect */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-1/2 w-full animate-pulse"></div>

                      <Compass className={`w-8 h-8 text-cyan-500/20 ${activeCameraStream === cam.channel ? 'animate-spin' : ''}`} />

                      <span className="absolute top-2 left-2 text-[8px] font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-400">
                        CAM {cam.channel} // LIVE
                      </span>

                      {/* Rec badge */}
                      <span className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-mono bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-red-500 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> REC
                      </span>
                    </div>

                    <div className="p-2.5">
                      <h4 className="text-[10px] font-bold text-white uppercase">{cam.label}</h4>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">{cam.feed}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Right Column: Dynamic vehicle diagnostics */}
              <div className="md:col-span-4 bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col justify-between">
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-900 pb-2">
                    ADAS Telemetry Status
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                      <span className="text-slate-400">Driver Focus Rate</span>
                      <span className="text-emerald-400 font-mono font-bold">98% (High Alertness)</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                      <span className="text-slate-400">Lane Deviation</span>
                      <span className="text-slate-300 font-mono">0% (In Lane Corridor)</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                      <span className="text-slate-400">FASTag Balance</span>
                      <span className="text-cyan-400 font-mono font-bold">₹4,820 (Sufficient)</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-900/40 p-2 rounded-lg border border-slate-850">
                      <span className="text-slate-400">TPMS Tyres Check</span>
                      <span className="text-emerald-400 font-bold">✓ ALL OK (85 PSI)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-3 rounded-lg text-[10px] text-slate-500 leading-normal border border-slate-850 mt-4">
                  <span className="font-bold text-slate-400 block uppercase mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5 text-cyan-400" /> DSM Intelligent Processing:</span>
                  <p>Artificial intelligence evaluates pupil micro-fluctuations, seatbelt placement, lane deviations, and forward obstacles live at 20 frames per second inside the cabin container.</p>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
