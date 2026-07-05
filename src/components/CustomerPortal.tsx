import React, { useState } from 'react';
import { Customer, Enquiry, Quotation, Trip, Invoice } from '../types';
import {
  Compass,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  MapPin,
  ArrowRight,
  Truck,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Activity,
  Award,
  X
} from 'lucide-react';

interface CustomerPortalProps {
  companyId: string;
  customerObj: Customer;
  enquiries: Enquiry[];
  quotations: Quotation[];
  trips: Trip[];
  invoices: Invoice[];
  onApproveQuotation: (q: Quotation) => void;
}

export default function CustomerPortal({
  companyId,
  customerObj,
  enquiries,
  quotations,
  trips,
  invoices,
  onApproveQuotation
}: CustomerPortalProps) {
  const [activeTab, setActiveTab] = useState<'shipments' | 'quotations' | 'invoices'>('shipments');
  const [trackingShipment, setTrackingShipment] = useState<Trip | null>(null);

  // Filter lists strictly for THIS customer (Data Isolation!)
  const myEnquiries = enquiries.filter(e => e.customer_id === customerObj.id);
  const myQuotations = quotations.filter(q => q.customer_id === customerObj.id);
  const myTrips = trips.filter(t => t.customer_id === customerObj.id);
  const myInvoices = invoices.filter(i => i.customer_id === customerObj.id);

  return (
    <div className="space-y-6">
      
      {/* Client Welcome Hero Section */}
      <div className="p-6 bg-slate-900 border-2 border-cyan-500/10 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">Secure Customer Portal login</span>
            <h2 className="text-xl font-black text-white mt-1">Hello, {customerObj.contact_person}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Managing your supply chain account with <strong>{customerObj.name}</strong></p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 text-right">
            <span className="text-[10px] text-slate-500 uppercase font-black">Outstanding Account balance</span>
            <div className="text-lg font-black text-red-400 mt-1">₹{customerObj.outstanding_balance.toLocaleString('en-IN')}</div>
            <span className="text-[9px] text-slate-500 block mt-0.5">Terms: Net {customerObj.credit_period_days} Days</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'shipments' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          Active Shipments ({myTrips.filter(t => t.status !== 'billed').length})
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'quotations' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Rate Quotations & Draft Contracts ({myQuotations.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'invoices' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Tax Invoices Ledger ({myInvoices.length})
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'shipments' && (
        <div className="space-y-4">
          {myTrips.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No shipments registered under your account currently.
            </div>
          ) : (
            myTrips.map(t => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all overflow-hidden">
                <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-mono font-bold text-xs select-all">{t.trip_id_label}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-[11px] text-slate-400">LR Reference: <strong className="text-slate-300 font-mono">{t.lr_number}</strong></span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                    t.status === 'in_transit' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse' :
                    t.status === 'pod_pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-300 flex items-center gap-1.5 bg-slate-950/60 p-2.5 rounded-lg w-fit">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>{t.origin}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t.destination}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-1">
                      Material: <strong>{t.material}</strong> | Net Weight: <strong>{t.weight_tons} Tons</strong> | Dispatched: <strong>{t.loading_date_time}</strong>
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 text-[11px] font-mono border-l border-slate-800/80 pl-6">
                    <div>
                      <div className="text-slate-500 uppercase font-bold text-[8px]">Truck Reg</div>
                      <div className="text-white font-sans font-bold select-all">{t.vehicle_reg}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 uppercase font-bold text-[8px]">Duty Driver</div>
                      <div className="text-white font-sans font-bold">{t.driver_name}</div>
                    </div>
                    <button
                      onClick={() => setTrackingShipment(t)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-md transition-all flex items-center gap-1"
                    >
                      <Activity className="w-3.5 h-3.5" /> Track GPS
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'quotations' && (
        <div className="space-y-3">
          {myQuotations.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No pending quotations drafted currently. Write to logistics desk to request bids.
            </div>
          ) : (
            myQuotations.map(q => (
              <div key={q.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase">BID QUOTE</span>
                    <h4 className="text-xs font-black text-slate-300 font-mono">Date published: {q.created_at}</h4>
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{q.route_origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{q.route_destination}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Validity: <span className="text-red-400">{q.validity_date}</span> | Terms: <span className="italic">"{q.terms}"</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Standard Rate</div>
                    <div className="text-xs font-extrabold text-cyan-400">₹{q.rate.toLocaleString('en-IN')} ({q.rate_type.replace('_', ' ')})</div>
                  </div>

                  <div>
                    {q.status === 'draft' || q.status === 'sent' ? (
                      <button
                        onClick={() => onApproveQuotation(q)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] px-3 py-2 rounded-lg transition-all"
                      >
                        Approve & Authorize Contract
                      </button>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Active Contract
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {myInvoices.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No billing records found.
            </div>
          ) : (
            myInvoices.map(i => (
              <div key={i.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono">{i.invoice_number}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Published: {i.created_at}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Base freight value: <strong>₹{i.freight_amount.toLocaleString('en-IN')}</strong> | GST tax: <strong>₹{i.gst_amount.toLocaleString('en-IN')}</strong> | TDS withheld (2%): <strong className="text-red-400">₹{i.tds_deduction.toLocaleString('en-IN')}</strong>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Payment Deadline due date: <span className="text-slate-300 font-mono font-bold">{i.due_date}</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Unsettled Balance</div>
                    <div className="text-sm font-extrabold text-red-400">₹{i.outstanding_amount.toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Invoice total: ₹{i.total_amount.toLocaleString('en-IN')}</div>
                  </div>

                  <div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                      i.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                    }`}>
                      {i.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================= GPS TRACKER OVERLAY MODAL ======================= */}
      {trackingShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setTrackingShipment(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold text-white mb-2">Live GPS Freight Consignment Tracking</h3>
            <p className="text-[11px] text-slate-400 mb-4">Trip Reference: <strong className="text-cyan-400 font-mono">{trackingShipment.trip_id_label}</strong></p>

            <div className="space-y-4">
              
              {/* MAP COMPONENT */}
              <div className="h-44 rounded-xl bg-slate-950 border border-slate-850 overflow-hidden relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                
                <div className="absolute w-24 h-24 bg-cyan-500/5 rounded-full border border-cyan-500/20 animate-ping"></div>
                <div className="absolute w-44 h-44 bg-cyan-500/5 rounded-full border border-cyan-500/10 animate-pulse"></div>

                <div className="relative text-center z-10 space-y-1">
                  <div className="bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-[10px] font-black text-slate-200 shadow-xl inline-flex items-center gap-1.5">
                    <MapPin className="w-4.5 h-4.5 text-cyan-400 animate-bounce" />
                    <span>In-Transit: {trackingShipment.origin} → {trackingShipment.destination}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Current telemetry ping: NH-48 Corridor Bypass (Jaipur Node)</p>
                </div>
              </div>

              {/* TELEMETRY */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Transit Speed</span>
                  <div className="text-base font-black text-emerald-400 font-mono mt-0.5">65 KM/H</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Vehicle Registration</span>
                  <div className="text-base font-black text-cyan-400 font-mono mt-0.5 select-all">{trackingShipment.vehicle_reg}</div>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                  <span className="text-[9px] text-slate-500 uppercase font-bold">E-Way Bill Status</span>
                  <div className="text-base font-black text-emerald-400 font-mono mt-0.5">VERIFIED</div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2">Transit Timeline Checkpoints:</h4>
                <div className="space-y-1.5 font-mono text-[9px] text-slate-400 leading-normal">
                  <div className="flex justify-between">
                    <span>• Shahjahanpur Toll plaza crossed auto-debited Fastag</span>
                    <span className="text-slate-600">Today, 10:04 AM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Loaded & authorized RTO E-Way Bill at Dispatch yard</span>
                    <span className="text-emerald-500 font-bold">Yesterday, 02:30 PM</span>
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
