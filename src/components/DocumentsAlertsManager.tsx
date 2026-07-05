import React, { useState } from 'react';
import DataGridWrapper from './DataGridWrapper';
import { 
  FileText, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  Building2, 
  UserCheck, 
  Truck, 
  FileCheck, 
  Sliders,
  CheckCircle,
  X,
  Plus
} from 'lucide-react';

export default function DocumentsAlertsManager() {
  const [activeTab, setActiveTab] = useState<string>('vehicle_docs');
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<any>({});

  // Document datasets
  const [vehicleDocs, setVehicleDocs] = useState<any[]>([
    { id: 'vd-1', vehicle_reg: 'HR-55-AJ-9021', type: 'National Goods Permit', issuer: 'RTO Delhi', expiry_date: '2026-11-20', status: 'ACTIVE' },
    { id: 'vd-2', vehicle_reg: 'GJ-01-XX-4930', type: 'Third Party Fitness Insurance', issuer: 'New India Assurance', expiry_date: '2026-08-15', status: 'WARNING' },
    { id: 'vd-3', vehicle_reg: 'MH-43-BB-8022', type: 'Pollution Under Control (PUC)', issuer: 'Maharashtra Pollution Board', expiry_date: '2026-07-12', status: 'CRITICAL' }
  ]);
  const [driverDocs, setDriverDocs] = useState<any[]>([
    { id: 'dd-1', driver_name: 'Karan Singh', type: 'HCV Commercial Driver License', license_no: 'DL-39402910392', expiry_date: '2029-12-31', status: 'ACTIVE' },
    { id: 'dd-2', driver_name: 'Prem Singh', type: 'Medical Health Fitness Fitness Certificate', license_no: 'MED-BP-83210', expiry_date: '2026-09-04', status: 'ACTIVE' }
  ]);
  const [customerDocs, setCustomerDocs] = useState<any[]>([
    { id: 'cd-1', customer_name: 'Tata Steel Processing Ltd', type: 'Corporate MSA Contract Agreement', reference: 'MSA-TATA-2026', expiry_date: '2027-06-30', status: 'ACTIVE' }
  ]);
  const [vendorDocs, setVendorDocs] = useState<any[]>([
    { id: 'vnd-1', vendor_name: 'Shergill Roadlines Pvt Ltd', type: 'Vendor PAN & Bank Mandate File', reference: 'VND-SHER-8392', expiry_date: '2029-01-01', status: 'ACTIVE' }
  ]);
  const [challans, setChallans] = useState<any[]>([
    { id: 'ch-1', vehicle_reg: 'HR-55-AJ-9021', offence: 'Overspeeding National Highway NH-48', penalty_amount: 2000, date: '2026-06-25', status: 'PENDING' },
    { id: 'ch-2', vehicle_reg: 'GJ-01-XX-4930', offence: 'Overloading Weighbridge Bypass deviation', penalty_amount: 5000, date: '2026-06-12', status: 'DISPOSED' }
  ]);

  const docTabs = [
    { id: 'vehicle_docs', label: 'Vehicle Documents', icon: Truck },
    { id: 'driver_docs', label: 'Driver Documents', icon: UserCheck },
    { id: 'customer_docs', label: 'Customer MSA Contracts', icon: Building2 },
    { id: 'vendor_docs', label: 'Vendor Agreements', icon: FileCheck },
    { id: 'compliance_calendar', label: 'Compliance Calendar', icon: Calendar },
    { id: 'challans', label: 'Traffic Challan Tracking', icon: ShieldAlert }
  ];

  const handleOpenAdd = () => {
    setEditItem(null);
    setFormFields({});
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditItem(item);
    setFormFields({ ...item });
    setShowAddEditModal(true);
  };

  const handleDelete = (item: any) => {
    if (!confirm('Are you sure you want to delete this document or compliance alert?')) return;
    
    switch (activeTab) {
      case 'vehicle_docs': setVehicleDocs(vehicleDocs.filter(v => v.id !== item.id)); break;
      case 'driver_docs': setDriverDocs(driverDocs.filter(d => d.id !== item.id)); break;
      case 'customer_docs': setCustomerDocs(customerDocs.filter(c => c.id !== item.id)); break;
      case 'vendor_docs': setVendorDocs(vendorDocs.filter(v => v.id !== item.id)); break;
      case 'challans': setChallans(challans.filter(c => c.id !== item.id)); break;
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = editItem ? editItem.id : 'doc-' + Date.now();
    const payload = { id: itemId, ...formFields };

    if (editItem) {
      switch (activeTab) {
        case 'vehicle_docs': setVehicleDocs(vehicleDocs.map(v => v.id === itemId ? { ...v, ...payload } : v)); break;
        case 'driver_docs': setDriverDocs(driverDocs.map(d => d.id === itemId ? { ...d, ...payload } : d)); break;
        case 'customer_docs': setCustomerDocs(customerDocs.map(c => c.id === itemId ? { ...c, ...payload } : c)); break;
        case 'vendor_docs': setVendorDocs(vendorDocs.map(v => v.id === itemId ? { ...v, ...payload } : v)); break;
        case 'challans': setChallans(challans.map(c => c.id === itemId ? { ...c, ...payload } : c)); break;
      }
    } else {
      switch (activeTab) {
        case 'vehicle_docs': setVehicleDocs([payload, ...vehicleDocs]); break;
        case 'driver_docs': setDriverDocs([payload, ...driverDocs]); break;
        case 'customer_docs': setCustomerDocs([payload, ...customerDocs]); break;
        case 'vendor_docs': setVendorDocs([payload, ...vendorDocs]); break;
        case 'challans': setChallans([payload, ...challans]); break;
      }
    }

    setShowAddEditModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Sub tabs selector */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        {docTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowAddEditModal(false); }}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                isActive 
                  ? 'bg-cyan-500 text-slate-950 font-black' 
                  : 'text-slate-400 hover:text-white bg-slate-950/30 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* COMPLIANCE CALENDAR VIEW */}
      {activeTab === 'compliance_calendar' && (
        <div className="bg-slate-950 border border-slate-900 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6 border-b border-slate-900 pb-3">
            <div>
              <h3 className="text-base font-black text-white">National Fleet Compliance Calendar</h3>
              <p className="text-xs text-slate-500">Scheduled goods permits, fitness checks, emissions test, and road tax renewals due this month</p>
            </div>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-2.5 py-1 rounded">3 CRITICAL CHECKS DUE</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'Maharashtra State Goods Permit Renewal', vehicle: 'HR-55-AJ-9021', date: 'In 3 Days', category: 'PERMIT', severity: 'critical' },
              { title: 'Emission Pollution Certificate (PUC)', vehicle: 'MH-43-BB-8022', date: 'In 6 Days', category: 'POLLUTION', severity: 'critical' },
              { title: 'National Road Insurance Annual Premium', vehicle: 'GJ-01-XX-4930', date: 'In 18 Days', category: 'INSURANCE', severity: 'warning' },
              { title: 'Driver Heavy Vehicle Medical Fitness check', driver: 'Karan Singh', date: 'In 24 Days', category: 'HEALTH', severity: 'normal' }
            ].map((ev, idx) => (
              <div key={idx} className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                    <span className="text-slate-500">{ev.category}</span>
                    <span className={ev.severity === 'critical' ? 'text-red-400' : ev.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'}>{ev.date}</span>
                  </div>
                  <h4 className="text-xs font-black text-white mb-1 leading-snug">{ev.title}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Asset: {ev.vehicle || ev.driver}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-850 flex justify-end">
                  <button className="text-[10px] bg-slate-950 hover:bg-slate-850 text-cyan-400 font-bold px-3 py-1.5 rounded border border-slate-800 cursor-pointer">Initiate Renewal Online</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VEHICLE DOCUMENTS */}
      {activeTab === 'vehicle_docs' && (
        <DataGridWrapper<any>
          title="Vehicle Compliance Documents"
          items={vehicleDocs}
          searchKeys={['vehicle_reg', 'type']}
          templateHeaders={['Vehicle Registration', 'Document Type', 'Issuing Authority', 'Expiration Date']}
          templateSampleRow={['MH-43-AA-9020', 'National Permit', 'RTO Maharashtra', '2027-12-31']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle Placed' },
            { key: 'type', label: 'Document Category' },
            { key: 'issuer', label: 'Issuing RTO Authority' },
            { key: 'expiry_date', label: 'Expiry Date' },
            { 
              key: 'status', 
              label: 'Compliance Alert Level',
              render: (d) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  d.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400' :
                  d.status === 'WARNING' ? 'bg-amber-950 text-amber-400' :
                  'bg-red-950 text-red-400'
                }`}>
                  {d.status}
                </span>
              )
            }
          ]}
          onImport={(items) => setVehicleDocs([...items, ...vehicleDocs])}
        />
      )}

      {activeTab === 'driver_docs' && (
        <DataGridWrapper<any>
          title="Driver License compliance files"
          items={driverDocs}
          searchKeys={['driver_name', 'license_no']}
          templateHeaders={['Driver Name', 'Document Category', 'License No / Reference', 'Expiration Date']}
          templateSampleRow={['Gopal Sharma', 'Commercial Driver License', 'DL-3920193019302', '2030-12-31']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'driver_name', label: 'Driver Name' },
            { key: 'type', label: 'Document Category' },
            { key: 'license_no', label: 'License / Reference ID' },
            { key: 'expiry_date', label: 'Expiry Date' }
          ]}
          onImport={(items) => setDriverDocs([...items, ...driverDocs])}
        />
      )}

      {activeTab === 'customer_docs' && (
        <DataGridWrapper<any>
          title="Customer MSA Agreements"
          items={customerDocs}
          searchKeys={['customer_name', 'type']}
          templateHeaders={['Customer Name', 'Document Type', 'MSA Reference ID', 'Expiration Date']}
          templateSampleRow={['Tata Steel', 'MSA Contract Agreement', 'MSA-TATA-2026', '2027-06-30']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'customer_name', label: 'Billing Corporate' },
            { key: 'type', label: 'Agreement Type' },
            { key: 'reference', label: 'Contract Reference' },
            { key: 'expiry_date', label: 'Expiry Date' }
          ]}
          onImport={(items) => setCustomerDocs([...items, ...customerDocs])}
        />
      )}

      {activeTab === 'vendor_docs' && (
        <DataGridWrapper<any>
          title="Vendor Business Files"
          items={vendorDocs}
          searchKeys={['vendor_name', 'type']}
          templateHeaders={['Vendor Name', 'Document Category', 'Agreement Reference ID', 'Expiration Date']}
          templateSampleRow={['Punjab Roadways', 'Vendor PAN & Bank Mandate', 'VND-PUNJ-9930', '2029-12-31']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vendor_name', label: 'Market Vendor' },
            { key: 'type', label: 'Document Category' },
            { key: 'reference', label: 'Contract Reference' },
            { key: 'expiry_date', label: 'Expiry Date' }
          ]}
          onImport={(items) => setVendorDocs([...items, ...vendorDocs])}
        />
      )}

      {activeTab === 'challans' && (
        <DataGridWrapper<any>
          title="RTO / Traffic Police Challan Ledger"
          items={challans}
          searchKeys={['vehicle_reg', 'offence']}
          templateHeaders={['Vehicle Registration', 'Traffic Offence Location', 'Penalty Amount', 'Challan Date', 'Challan Status']}
          templateSampleRow={['MH-43-BB-8022', 'Overloading NH-48 Toll plaza', '5000', '2026-06-25', 'PENDING']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'vehicle_reg', label: 'Vehicle registration' },
            { key: 'offence', label: 'Offence & Toll location' },
            { key: 'penalty_amount', label: 'Fine Amount (₹)' },
            { key: 'date', label: 'Incident Date' },
            { 
              key: 'status', 
              label: 'Challan Status',
              render: (ch) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  ch.status === 'PENDING' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'
                }`}>
                  {ch.status}
                </span>
              )
            }
          ]}
          onImport={(items) => setChallans([...items, ...challans])}
        />
      )}

      {/* ADD / EDIT COMPLIANCE DOCUMENT MODAL */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm text-left">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setShowAddEditModal(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <Plus className="w-4.5 h-4.5 text-cyan-400" />
              {editItem ? 'Edit Compliance File' : 'Register Compliance File'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Vehicle registration / Target Entity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HR-55-AJ-9021"
                  value={formFields.vehicle_reg || formFields.driver_name || formFields.customer_name || formFields.vendor_name || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    if (activeTab === 'vehicle_docs' || activeTab === 'challans') {
                      setFormFields({ ...formFields, vehicle_reg: val });
                    } else if (activeTab === 'driver_docs') {
                      setFormFields({ ...formFields, driver_name: e.target.value });
                    } else if (activeTab === 'customer_docs') {
                      setFormFields({ ...formFields, customer_name: e.target.value });
                    } else {
                      setFormFields({ ...formFields, vendor_name: e.target.value });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Document Category / Offence Detail *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goods Carrier permit renewal / Overspeeding fine"
                  value={formFields.type || formFields.offence || ''}
                  onChange={(e) => {
                    if (activeTab === 'challans') {
                      setFormFields({ ...formFields, offence: e.target.value });
                    } else {
                      setFormFields({ ...formFields, type: e.target.value });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              {activeTab === 'challans' ? (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Fine Penalty Cost (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="2000"
                    value={formFields.penalty_amount || ''}
                    onChange={(e) => setFormFields({ ...formFields, penalty_amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Agreement Expiration Date *</label>
                  <input
                    type="date"
                    required
                    value={formFields.expiry_date || ''}
                    onChange={(e) => setFormFields({ ...formFields, expiry_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {editItem ? 'Save Document Changes' : 'Register Document Node'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
