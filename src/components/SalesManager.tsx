import React, { useState } from 'react';
import { Customer, Enquiry, Quotation, ContractRate, VehicleType, RateType } from '../types';
import {
  Users,
  Plus,
  Search,
  Filter,
  FileText,
  DollarSign,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Percent
} from 'lucide-react';

interface SalesManagerProps {
  companyId: string;
  customers: Customer[];
  enquiries: Enquiry[];
  quotations: Quotation[];
  contracts: ContractRate[];
  onUpdateCustomers: (items: Customer[]) => void;
  onUpdateEnquiries: (items: Enquiry[]) => void;
  onUpdateQuotations: (items: Quotation[]) => void;
  onUpdateContracts: (items: ContractRate[]) => void;
  userRole: string;
}

export default function SalesManager({
  companyId,
  customers,
  enquiries,
  quotations,
  contracts,
  onUpdateCustomers,
  onUpdateEnquiries,
  onUpdateQuotations,
  onUpdateContracts,
  userRole
}: SalesManagerProps) {
  const [activeTab, setActiveTab] = useState<'customers' | 'enquiries' | 'quotations' | 'contracts'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCustModal, setShowCustModal] = useState(false);
  const [showEnqModal, setShowEnqModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);

  // New item states
  const [newCust, setNewCust] = useState<Partial<Customer>>({
    name: '', contact_person: '', phone: '', email: '', gstin: '', billing_address: '', contract_type: 'contract', credit_period_days: 30, outstanding_balance: 0, loading_locations: [], unloading_locations: [], status: 'active'
  });
  const [newEnq, setNewEnq] = useState<Partial<Enquiry>>({
    customer_id: '', origin: '', destination: '', material: '', vehicle_type: 'trailer', weight_tons: 20, target_rate: 0, status: 'new', remarks: ''
  });
  const [newQuote, setNewQuote] = useState<Partial<Quotation>>({
    customer_id: '', route_origin: '', route_destination: '', vehicle_type: 'trailer', rate_type: 'per_trip', rate: 0, gst_percent: 18, validity_date: '', terms: '', status: 'draft'
  });
  const [newContract, setNewContract] = useState<Partial<ContractRate>>({
    customer_id: '', origin: '', destination: '', vehicle_type: 'trailer', rate_type: 'per_trip', rate: 0, min_guarantee_tons: 15, detention_charge_per_day: 2000, loading_unloading_charges: 0, status: 'active'
  });

  const [loadingLocStr, setLoadingLocStr] = useState('');
  const [unloadingLocStr, setUnloadingLocStr] = useState('');

  // Handle Add Customer
  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Customer = {
      id: 'c-' + Date.now(),
      company_id: companyId,
      name: newCust.name || '',
      contact_person: newCust.contact_person || '',
      phone: newCust.phone || '',
      email: newCust.email || '',
      gstin: newCust.gstin || '',
      billing_address: newCust.billing_address || '',
      loading_locations: loadingLocStr.split(',').map(s => s.trim()).filter(Boolean),
      unloading_locations: unloadingLocStr.split(',').map(s => s.trim()).filter(Boolean),
      contract_type: newCust.contract_type as any,
      credit_period_days: Number(newCust.credit_period_days) || 30,
      outstanding_balance: Number(newCust.outstanding_balance) || 0,
      status: 'active'
    };
    onUpdateCustomers([created, ...customers]);
    setShowCustModal(false);
    setNewCust({ name: '', contact_person: '', phone: '', email: '', gstin: '', billing_address: '', contract_type: 'contract', credit_period_days: 30, outstanding_balance: 0 });
    setLoadingLocStr('');
    setUnloadingLocStr('');
  };

  // Handle Add Enquiry
  const handleAddEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    const custObj = customers.find(c => c.id === newEnq.customer_id);
    const created: Enquiry = {
      id: 'enq-' + Date.now(),
      company_id: companyId,
      customer_id: newEnq.customer_id || '',
      customer_name: custObj ? custObj.name : 'Unknown Customer',
      origin: newEnq.origin || '',
      destination: newEnq.destination || '',
      material: newEnq.material || '',
      vehicle_type: newEnq.vehicle_type as any,
      weight_tons: Number(newEnq.weight_tons) || 20,
      expected_loading_date: new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0],
      target_rate: Number(newEnq.target_rate) || 0,
      status: 'new',
      remarks: newEnq.remarks || '',
      created_at: new Date().toISOString().split('T')[0]
    };
    onUpdateEnquiries([created, ...enquiries]);
    setShowEnqModal(false);
  };

  // Handle Add Quotation
  const handleAddQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const custObj = customers.find(c => c.id === newQuote.customer_id);
    const created: Quotation = {
      id: 'q-' + Date.now(),
      company_id: companyId,
      customer_id: newQuote.customer_id || '',
      customer_name: custObj ? custObj.name : 'Unknown Customer',
      route_origin: newQuote.route_origin || '',
      route_destination: newQuote.route_destination || '',
      vehicle_type: newQuote.vehicle_type as any,
      rate_type: newQuote.rate_type as any,
      rate: Number(newQuote.rate) || 0,
      gst_percent: Number(newQuote.gst_percent) || 18,
      validity_date: newQuote.validity_date || new Date(Date.now() + 15*24*60*60*1000).toISOString().split('T')[0],
      terms: newQuote.terms || 'Freight rates are exclusive of toll. 70% advance on dispatch.',
      status: 'draft',
      created_at: new Date().toISOString().split('T')[0]
    };
    onUpdateQuotations([created, ...quotations]);
    setShowQuoteModal(false);
  };

  // Handle Add Contract
  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    const custObj = customers.find(c => c.id === newContract.customer_id);
    const created: ContractRate = {
      id: 'cnt-' + Date.now(),
      company_id: companyId,
      customer_id: newContract.customer_id || '',
      customer_name: custObj ? custObj.name : 'Unknown Customer',
      origin: newContract.origin || '',
      destination: newContract.destination || '',
      vehicle_type: newContract.vehicle_type as any,
      rate_type: newContract.rate_type as any,
      rate: Number(newContract.rate) || 0,
      min_guarantee_tons: Number(newContract.min_guarantee_tons) || 0,
      detention_charge_per_day: Number(newContract.detention_charge_per_day) || 2000,
      loading_unloading_charges: Number(newContract.loading_unloading_charges) || 0,
      status: 'active'
    };
    onUpdateContracts([created, ...contracts]);
    setShowContractModal(false);
  };

  // Conversions
  const convertEnquiryToQuotation = (enq: Enquiry) => {
    setNewQuote({
      customer_id: enq.customer_id,
      route_origin: enq.origin,
      route_destination: enq.destination,
      vehicle_type: enq.vehicle_type,
      rate: enq.target_rate,
      enquiry_id: enq.id
    });
    setActiveTab('quotations');
    setShowQuoteModal(true);
  };

  const convertQuotationToContract = (q: Quotation) => {
    const created: ContractRate = {
      id: 'cnt-' + Date.now(),
      company_id: companyId,
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      origin: q.route_origin,
      destination: q.route_destination,
      vehicle_type: q.vehicle_type,
      rate_type: q.rate_type,
      rate: q.rate,
      min_guarantee_tons: 15,
      detention_charge_per_day: 3000,
      loading_unloading_charges: 0,
      status: 'active'
    };
    onUpdateContracts([created, ...contracts]);
    
    // Update quotation status
    const updatedQ = quotations.map(item => item.id === q.id ? { ...item, status: 'approved' as const } : item);
    onUpdateQuotations(updatedQ);

    // Update enquiry status if linked
    if (q.enquiry_id) {
      const updatedE = enquiries.map(item => item.id === q.enquiry_id ? { ...item, status: 'confirmed' as const } : item);
      onUpdateEnquiries(updatedE);
    }

    setActiveTab('contracts');
    alert(`Quotation successfully approved and converted into an Active Route Contract!`);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEnquiries = enquiries.filter(e =>
    e.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuotations = quotations.filter(q =>
    q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.route_origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.route_destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredContracts = contracts.filter(c =>
    c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => { setActiveTab('customers'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'customers' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Users className="w-4 h-4" />
            Customer Master ({customers.length})
          </button>
          <button
            onClick={() => { setActiveTab('enquiries'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'enquiries' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Enquiries / Leads ({enquiries.length})
          </button>
          <button
            onClick={() => { setActiveTab('quotations'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'quotations' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <FileText className="w-4 h-4" />
            Quotations ({quotations.length})
          </button>
          <button
            onClick={() => { setActiveTab('contracts'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'contracts' ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white bg-slate-950/30'
            }`}
          >
            <Percent className="w-4 h-4" />
            Rate Contracts ({contracts.length})
          </button>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'customers' && (
            <button
              onClick={() => setShowCustModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Party
            </button>
          )}
          {activeTab === 'enquiries' && (
            <button
              onClick={() => setShowEnqModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Enquiry
            </button>
          )}
          {activeTab === 'quotations' && (
            <button
              onClick={() => setShowQuoteModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Draft Quotation
            </button>
          )}
          {activeTab === 'contracts' && (
            <button
              onClick={() => setShowContractModal(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Contract Rate
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
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

      {/* MAIN LISTINGS */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCustomers.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No customers found. Click "Add Party" to register a client.
            </div>
          ) : (
            filteredCustomers.map(c => (
              <div key={c.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-cyan-400" />
                      {c.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                      c.contract_type === 'contract' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {c.contract_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
                    <div>Contact: <strong className="text-slate-300 font-sans">{c.contact_person}</strong></div>
                    <div>Phone: <span className="text-slate-300">{c.phone}</span></div>
                    <div>Email: <span className="text-slate-300 select-all">{c.email}</span></div>
                    <div>GSTIN: <span className="text-cyan-400 select-all">{c.gstin}</span></div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Loading Hubs:</div>
                    <div className="flex flex-wrap gap-1">
                      {c.loading_locations.map((loc, idx) => (
                        <span key={idx} className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-400">{loc}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-500">Outstanding balance</div>
                    <div className="text-sm font-extrabold text-red-400">₹{c.outstanding_balance.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-black uppercase">
                      Credit: {c.credit_period_days} Days
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'enquiries' && (
        <div className="space-y-3">
          {filteredEnquiries.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No enquiries registered. Add a client's transport lead to begin.
            </div>
          ) : (
            filteredEnquiries.map(e => (
              <div key={e.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono">ENQUIRY</span>
                    <h4 className="text-xs font-black text-slate-200">{e.customer_name}</h4>
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{e.origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{e.destination}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Material: <strong>{e.material}</strong> | Payload: <strong>{e.weight_tons} Tons</strong> required as <strong>{e.vehicle_type}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Target Rate</div>
                    <div className="text-xs font-extrabold text-white">₹{e.target_rate.toLocaleString('en-IN')}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {e.status === 'new' ? (
                      <button
                        onClick={() => convertEnquiryToQuotation(e)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                      >
                        Create Quotation <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : e.status === 'confirmed' ? (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Confirmed
                      </span>
                    ) : (
                      <span className="bg-slate-800 text-slate-400 text-[10px] px-2.5 py-1 rounded-lg font-bold uppercase">
                        {e.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'quotations' && (
        <div className="space-y-3">
          {filteredQuotations.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No quotations drafted yet. Draft quotation to define rates.
            </div>
          ) : (
            filteredQuotations.map(q => (
              <div key={q.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-purple-500/10 text-purple-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono">QUOTATION</span>
                    <h4 className="text-xs font-black text-slate-200">{q.customer_name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Date: {q.created_at}</span>
                  </div>
                  <div className="text-sm font-black text-white flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{q.route_origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{q.route_destination}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Terms: <span className="italic">"{q.terms}"</span>
                  </p>
                </div>

                <div className="flex items-center gap-4 justify-between md:justify-end">
                  <div className="text-right">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Rate ({q.rate_type.replace('_', ' ')})</div>
                    <div className="text-xs font-extrabold text-cyan-400">₹{q.rate.toLocaleString('en-IN')} + {q.gst_percent}% GST</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {q.status === 'draft' || q.status === 'sent' ? (
                      <button
                        onClick={() => convertQuotationToContract(q)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Approve & Sign Contract
                      </button>
                    ) : (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/20 px-2.5 py-1 rounded-lg font-black uppercase flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Signed Contract
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredContracts.length === 0 ? (
            <div className="col-span-2 text-center py-12 bg-slate-900/20 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No active rate contracts registered. Approved quotations will convert automatically.
            </div>
          ) : (
            filteredContracts.map(c => (
              <div key={c.id} className="p-4 bg-slate-900 border-2 border-emerald-500/10 rounded-2xl hover:border-emerald-500/30 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black text-white">{c.customer_name}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Active Contract
                  </span>
                </div>

                <div className="text-xs font-black text-slate-300 flex items-center gap-1.5 pt-1 mb-3 bg-slate-950/60 p-2.5 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>{c.origin}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{c.destination}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-400 pt-1">
                  <div>Vehicle Type: <strong className="text-white uppercase">{c.vehicle_type}</strong></div>
                  <div>Rate Type: <strong className="text-white uppercase">{c.rate_type.replace('_', ' ')}</strong></div>
                  <div>Contract Rate: <strong className="text-emerald-400">₹{c.rate.toLocaleString('en-IN')}</strong></div>
                  <div>Min Payload: <strong className="text-white">{c.min_guarantee_tons || 'N/A'} Tons</strong></div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-[10px] text-slate-500">
                  <span>Detention: ₹{c.detention_charge_per_day}/Day</span>
                  <span>Loading/Unloading: ₹{c.loading_unloading_charges}/Trip</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================= ADD CUSTOMER MODAL ======================= */}
      {showCustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 relative">
            <button onClick={() => setShowCustModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Add Customer / Party</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Company / Customer Name *</label>
                  <input type="text" required value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Contact Person</label>
                  <input type="text" value={newCust.contact_person} onChange={(e) => setNewCust({ ...newCust, contact_person: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Phone *</label>
                  <input type="text" required value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Email</label>
                  <input type="email" value={newCust.email} onChange={(e) => setNewCust({ ...newCust, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">GSTIN</label>
                  <input type="text" placeholder="e.g. 09AAACT1029K1Z4" value={newCust.gstin} onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Credit Limit Period (Days)</label>
                  <input type="number" value={newCust.credit_period_days} onChange={(e) => setNewCust({ ...newCust, credit_period_days: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Billing Address</label>
                <textarea rows={2} value={newCust.billing_address} onChange={(e) => setNewCust({ ...newCust, billing_address: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Loading Hubs (Comma separated)</label>
                  <input type="text" placeholder="e.g. Pune Plant, Sanand Plant" value={loadingLocStr} onChange={(e) => setLoadingLocStr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Unloading Hubs (Comma separated)</label>
                  <input type="text" placeholder="e.g. Chennai Yard, Noida Port" value={unloadingLocStr} onChange={(e) => unloadingLocStr(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Save Customer Master Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= ADD ENQUIRY MODAL ======================= */}
      {showEnqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowEnqModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Register Client Enquiry</h3>
            <form onSubmit={handleAddEnquiry} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Select Customer</label>
                <select required value={newEnq.customer_id} onChange={(e) => setNewEnq({ ...newEnq, customer_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Party --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Origin *</label>
                  <input type="text" required placeholder="e.g. Pune Plant" value={newEnq.origin} onChange={(e) => setNewEnq({ ...newEnq, origin: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Destination *</label>
                  <input type="text" required placeholder="e.g. Chennai Port" value={newEnq.destination} onChange={(e) => setNewEnq({ ...newEnq, destination: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Material Description</label>
                  <input type="text" placeholder="e.g. Steel Sheets" value={newEnq.material} onChange={(e) => setNewEnq({ ...newEnq, material: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Weight (Tons)</label>
                  <input type="number" placeholder="20" value={newEnq.weight_tons} onChange={(e) => setNewEnq({ ...newEnq, weight_tons: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Type Required</label>
                  <select value={newEnq.vehicle_type} onChange={(e) => setNewEnq({ ...newEnq, vehicle_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="trailer">Trailer</option>
                    <option value="container">Container</option>
                    <option value="hywa">Hywa</option>
                    <option value="tipper">Tipper</option>
                    <option value="reefer">Reefer</option>
                    <option value="bus">Staff/School Bus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Target Rate (₹)</label>
                  <input type="number" placeholder="60000" value={newEnq.target_rate} onChange={(e) => setNewEnq({ ...newEnq, target_rate: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Register Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= DRAFT QUOTATION MODAL ======================= */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowQuoteModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Draft Quotation / Bid</h3>
            <form onSubmit={handleAddQuotation} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Customer / Party *</label>
                <select required value={newQuote.customer_id} onChange={(e) => setNewQuote({ ...newQuote, customer_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Party --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Route Origin *</label>
                  <input type="text" required placeholder="e.g. Pune Depot" value={newQuote.route_origin} onChange={(e) => setNewQuote({ ...newQuote, route_origin: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Route Destination *</label>
                  <input type="text" required placeholder="e.g. Chennai Yard" value={newQuote.route_destination} onChange={(e) => setNewQuote({ ...newQuote, route_destination: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Type</label>
                  <select value={newQuote.vehicle_type} onChange={(e) => setNewQuote({ ...newQuote, vehicle_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="trailer">Trailer</option>
                    <option value="container">Container</option>
                    <option value="hywa">Hywa</option>
                    <option value="tipper">Tipper</option>
                    <option value="reefer">Reefer</option>
                    <option value="bus">Staff/School Bus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Rate Type</label>
                  <select value={newQuote.rate_type} onChange={(e) => setNewQuote({ ...newQuote, rate_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="per_trip">Per Trip</option>
                    <option value="per_ton">Per Ton</option>
                    <option value="per_km">Per KM</option>
                    <option value="per_day">Per Day</option>
                    <option value="per_month">Per Month</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Rate (₹) *</label>
                  <input type="number" required placeholder="65000" value={newQuote.rate} onChange={(e) => setNewQuote({ ...newQuote, rate: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">GST (%)</label>
                  <input type="number" value={newQuote.gst_percent} onChange={(e) => setNewQuote({ ...newQuote, gst_percent: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Terms & Conditions</label>
                <textarea rows={2} placeholder="Validity, payment milestone, etc." value={newQuote.terms} onChange={(e) => setNewQuote({ ...newQuote, terms: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Publish Draft Bid
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================= ADD CONTRACT RATE MODAL ======================= */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setShowContractModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><XCircle /></button>
            <h3 className="text-base font-bold text-white mb-4">Establish Contract Rate</h3>
            <form onSubmit={handleAddContract} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Party / Customer *</label>
                <select required value={newContract.customer_id} onChange={(e) => setNewContract({ ...newContract, customer_id: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
                  <option value="">-- Choose Party --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Origin Hub *</label>
                  <input type="text" required placeholder="e.g. Pune Plant" value={newContract.origin} onChange={(e) => setNewContract({ ...newContract, origin: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Destination Hub *</label>
                  <input type="text" required placeholder="e.g. Chennai Yard" value={newContract.destination} onChange={(e) => setNewContract({ ...newContract, destination: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle Type</label>
                  <select value={newContract.vehicle_type} onChange={(e) => setNewContract({ ...newContract, vehicle_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="trailer">Trailer</option>
                    <option value="container">Container</option>
                    <option value="hywa">Hywa</option>
                    <option value="tipper">Tipper</option>
                    <option value="reefer">Reefer</option>
                    <option value="bus">Staff/School Bus</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Rate Type</label>
                  <select value={newContract.rate_type} onChange={(e) => setNewContract({ ...newContract, rate_type: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                    <option value="per_trip">Per Trip</option>
                    <option value="per_ton">Per Ton</option>
                    <option value="per_km">Per KM</option>
                    <option value="per_day">Per Day</option>
                    <option value="per_month">Per Month</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Rate (₹) *</label>
                  <input type="number" required placeholder="65000" value={newContract.rate} onChange={(e) => setNewContract({ ...newContract, rate: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Min Guarantee (Tons)</label>
                  <input type="number" placeholder="15" value={newContract.min_guarantee_tons} onChange={(e) => setNewContract({ ...newContract, min_guarantee_tons: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Detention / Day (₹)</label>
                  <input type="number" placeholder="3000" value={newContract.detention_charge_per_day} onChange={(e) => setNewContract({ ...newContract, detention_charge_per_day: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Loading/Unloading (₹)</label>
                  <input type="number" placeholder="1500" value={newContract.loading_unloading_charges} onChange={(e) => setNewContract({ ...newContract, loading_unloading_charges: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white" />
                </div>
              </div>

              <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all">
                Authorize Route Contract
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
