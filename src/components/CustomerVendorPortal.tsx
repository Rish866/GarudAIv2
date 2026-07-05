import React, { useState } from 'react';
import CustomerPortal from './CustomerPortal';
import DriverPortal from './DriverPortal';
import DataGridWrapper from './DataGridWrapper';
import { 
  Building2, 
  Truck, 
  Users, 
  ShieldCheck, 
  MapPin, 
  FileText, 
  Briefcase, 
  Info,
  DollarSign,
  Plus,
  X
} from 'lucide-react';

interface CustomerVendorPortalProps {
  companyId: string;
  customers: any[];
  drivers: any[];
  trips: any[];
  invoices: any[];
  enquiries: any[];
  quotations: any[];
  fuelLogs: any[];
  salaries: any[];
  onUpdateTrips: (items: any[]) => void;
  onUpdateQuotations: (items: any[]) => void;
}

export default function CustomerVendorPortal({
  companyId,
  customers: propCustomers,
  drivers: propDrivers,
  trips: propTrips,
  invoices: propInvoices,
  enquiries: propEnquiries,
  quotations: propQuotations,
  fuelLogs: propFuelLogs,
  salaries: propSalaries,
  onUpdateTrips,
  onUpdateQuotations
}: CustomerVendorPortalProps) {
  const [activeTab, setActiveTab] = useState<string>('customer_tab');
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [formFields, setFormFields] = useState<any>({});

  // Sample data to bind the portals securely
  const sampleCustomer = {
    id: 'cust-1',
    name: 'Tata Steel Processing Ltd',
    contact_person: 'Ramanathan Iyer',
    outstanding_balance: 145000,
    credit_period_days: 30,
    company_id: 'co-1',
    phone: '+91 9845019302',
    email: 'ram.iyer@tatasteel.com',
    city: 'Jamshedpur',
    pan_no: 'AAACT8392K',
    gstin: '20AAACT8392K1Z0',
    status: 'active' as const,
    created_at: '2026-01-15',
    billing_address: 'Jamshedpur Corporate Hub, Jharkhand',
    loading_locations: ['Jamshedpur Yard'],
    unloading_locations: ['Nagpur Yard'],
    contract_type: 'contract' as const,
    credit_limit_days: 30
  };

  const [enquiries, setEnquiries] = useState<any[]>([
    { id: 'enq-1', customer_id: 'cust-1', created_at: '2026-07-02', route_origin: 'Mumbai Nhava Sheva', route_destination: 'Nagpur Metal Yard', material: 'Steel Sheets Coil', weight_tons: 24, status: 'quoted' }
  ]);

  const [quotations, setQuotations] = useState<any[]>([
    { id: 'q-1', customer_id: 'cust-1', created_at: '2026-07-03', route_origin: 'Mumbai Nhava Sheva', route_destination: 'Nagpur Metal Yard', validity_date: '2026-07-25', rate: 42000, rate_type: 'FIXED_PER_TRIP' as const, terms: 'Payment 30 days after e-POD verified', status: 'sent' as const }
  ]);

  const [trips, setTrips] = useState<any[]>([
    { id: 'trip-1', trip_id_label: 'TRIP-2026-9021', lr_number: 'LR-MU-NGP-93021', eway_bill_number: 'EW-839210293019', customer_id: 'cust-1', driver_id: 'drv-1', driver_name: 'Karan Singh', vehicle_reg: 'HR-55-AJ-9021', origin: 'Mumbai Port Hub', destination: 'Nagpur Steel Yard', material: 'Steel Sheets Coil', weight_tons: 24, diesel_advance: 12000, driver_cash: 3000, loading_date_time: '2026-07-04 10:30 AM', status: 'in_transit' as const },
    { id: 'trip-2', trip_id_label: 'TRIP-2026-8920', lr_number: 'LR-MU-NGP-93011', eway_bill_number: 'EW-839210292022', customer_id: 'cust-1', driver_id: 'drv-1', driver_name: 'Karan Singh', vehicle_reg: 'HR-55-AJ-9021', origin: 'Mumbai Port Hub', destination: 'Nagpur Steel Yard', material: 'Industrial Machinery', weight_tons: 18, diesel_advance: 10000, driver_cash: 2500, loading_date_time: '2026-06-15 02:00 PM', status: 'pod_pending' as const }
  ]);

  const [invoices, setInvoices] = useState<any[]>([
    { id: 'inv-1', invoice_number: 'INV-2026-0043', customer_id: 'cust-1', created_at: '2026-06-30', due_date: '2026-07-30', freight_amount: 42000, gst_amount: 5040, tds_deduction: 840, total_amount: 46200, outstanding_amount: 46200, status: 'unpaid' as const }
  ]);

  const sampleDriver = {
    id: 'drv-1',
    name: 'Karan Singh',
    assigned_vehicle_reg: 'HR-55-AJ-9021',
    safety_score: 94,
    phone: '+91 9930291039',
    license_no: 'DL-39402910392',
    license_expiry: '2029-12-31',
    status: 'active' as const,
    company_id: 'co-1',
    mobile: '+91 9930291039',
    license_number: 'DL-39402910392',
    salary_type: 'per_trip' as const,
    emergency_contact: '+91 99999 99999',
    assigned_vehicle_id: 'veh-1',
    kyc_documents: { verified: true },
    base_salary: 16000
  };

  const [fuelLogs, setFuelLogs] = useState<any[]>([
    { id: 'fl-1', vehicle_reg: 'HR-55-AJ-9021', driver_id: 'drv-1', fuel_station: 'Indian Oil Highway', date: '2026-07-04', litres: 150, amount: 13500, mileage_calculated: 4.2 }
  ]);

  const [salaries, setSalaries] = useState<any[]>([
    { id: 'sal-1', driver_id: 'drv-1', month_year: 'June 2026', base_salary: 18000, trip_allowance: 10500, advance_deduction: 4000, other_deductions: 0, net_payable: 24500, payment_status: 'paid' }
  ]);

  // Vendor lists for local tab
  const [vendors, setVendors] = useState<any[]>([
    { id: 'vnd-1', name: 'Shergill Highway Fuel Station', type: 'Fuel Pump Credit Partner', balance_due: 42000, credit_limit: 100000, term: '15 Days Credit' },
    { id: 'vnd-2', name: 'Guru Nanak Tyres & Retreading', type: 'Tyre Workshop Partner', balance_due: 18500, credit_limit: 50000, term: 'Weekly Settlement' }
  ]);

  const handleApproveQuotation = (q: any) => {
    setQuotations(quotations.map(item => item.id === q.id ? { ...item, status: 'approved' } : item));
    alert('Rate Agreement has been digitally locked and authorized for order generation!');
  };

  const handleUploadPod = (tripId: string, url: string) => {
    setTrips(trips.map(t => t.id === tripId ? { ...t, status: 'pod_pending' } : t));
  };

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
    if (!confirm('Are you sure you want to delete this vendor partner?')) return;
    setVendors(vendors.filter(v => v.id !== item.id));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const itemId = editItem ? editItem.id : 'vnd-' + Date.now();
    const payload = { id: itemId, ...formFields };

    if (editItem) {
      setVendors(vendors.map(v => v.id === itemId ? { ...v, ...payload } : v));
    } else {
      setVendors([payload, ...vendors]);
    }
    setShowAddEditModal(false);
  };

  return (
    <div className="space-y-6 text-left animate-fadeIn">
      
      {/* Selector Tabs Row */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-850">
        <button
          onClick={() => setActiveTab('customer_tab')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'customer_tab' 
              ? 'bg-cyan-500 text-slate-950 font-black' 
              : 'text-slate-400 hover:text-white bg-slate-950/30 border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Customer Portal View</span>
        </button>

        <button
          onClick={() => setActiveTab('vendor_tab')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'vendor_tab' 
              ? 'bg-cyan-500 text-slate-950 font-black' 
              : 'text-slate-400 hover:text-white bg-slate-950/30 border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Vendor Credit Registry</span>
        </button>

        <button
          onClick={() => setActiveTab('driver_tab')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'driver_tab' 
              ? 'bg-cyan-500 text-slate-950 font-black' 
              : 'text-slate-400 hover:text-white bg-slate-950/30 border border-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Driver Touch Duty Console</span>
        </button>
      </div>

      {/* CUSTOMER PORTAL WRAPPER */}
      {activeTab === 'customer_tab' && (
        <div className="bg-slate-950/30 p-6 rounded-2xl border border-slate-900">
          <CustomerPortal 
            companyId="co-1"
            customerObj={sampleCustomer}
            enquiries={enquiries}
            quotations={quotations}
            trips={trips}
            invoices={invoices}
            onApproveQuotation={handleApproveQuotation}
          />
        </div>
      )}

      {/* VENDOR CREDIT REGISTRY TABLE */}
      {activeTab === 'vendor_tab' && (
        <DataGridWrapper<any>
          title="Vendor Partner Credit Registry"
          items={vendors}
          searchKeys={['name', 'type']}
          templateHeaders={['Vendor Partner Name', 'Vendor Classification Type', 'Outstanding Balance Due', 'Allocated Credit Limit', 'Payment Terms']}
          templateSampleRow={['Gopal Oil Corporation', 'Fuel Pump Credit Partner', '25000', '100000', '15 Days Credit']}
          onAdd={handleOpenAdd}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          columns={[
            { key: 'name', label: 'Vendor Partner' },
            { key: 'type', label: 'Classification Category' },
            { key: 'balance_due', label: 'Outstanding Balance (₹)' },
            { key: 'credit_limit', label: 'Credit Limit (₹)' },
            { key: 'term', label: 'Settlement Terms' }
          ]}
          onImport={(items) => setVendors([...items, ...vendors])}
        />
      )}

      {/* DRIVER PORTAL WRAPPER */}
      {activeTab === 'driver_tab' && (
        <div className="bg-slate-950/30 p-6 rounded-2xl border border-slate-900">
          <div className="mb-4 bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl text-xs text-cyan-400 flex items-center gap-3">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p>This mimics the touch-screen smartphone view that drivers see while parked at highway terminals for seamless E-POD and diesel logging.</p>
          </div>
          <DriverPortal 
            companyId="co-1"
            driverObj={sampleDriver}
            trips={trips}
            fuelLogs={fuelLogs}
            salaries={salaries}
            onUploadPod={handleUploadPod}
          />
        </div>
      )}

      {/* ADD / EDIT VENDOR MODAL */}
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
              {editItem ? 'Edit Vendor Partner' : 'Register Vendor Partner'}
            </h3>

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Vendor Partner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shergill Highway Fuel Station"
                  value={formFields.name || ''}
                  onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Vendor Partner Type Classification *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fuel Pump / Tyre Workshop / Sublet Broker"
                  value={formFields.type || ''}
                  onChange={(e) => setFormFields({ ...formFields, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Outstanding Balance (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="42000"
                    value={formFields.balance_due || ''}
                    onChange={(e) => setFormFields({ ...formFields, balance_due: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Credit Limit (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="100000"
                    value={formFields.credit_limit || ''}
                    onChange={(e) => setFormFields({ ...formFields, credit_limit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Settlement terms *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15 Days Credit"
                  value={formFields.term || ''}
                  onChange={(e) => setFormFields({ ...formFields, term: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {editItem ? 'Save Vendor Changes' : 'Register Vendor Node'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
