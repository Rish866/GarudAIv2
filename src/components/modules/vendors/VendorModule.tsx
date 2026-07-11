import React, { useState } from 'react';
import { isDemoTenant } from '../../../lib/tenant';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';
import { Users, Plus, X, Search, Download, Edit, Trash2, Phone, Mail } from 'lucide-react';
import BulkUpload from '../../ui/BulkUpload';

type VendorType = 'vehicle_owner' | 'fuel_supplier' | 'tyre_vendor' | 'garage' | 'broker' | 'other';

interface Vendor {
  id: string;
  name: string;
  type: VendorType;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  total_paid: number;
  outstanding: number;
  status: 'active' | 'inactive';
  created_at: string;
}


const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

const seedVendors: Vendor[] = [
  { id: 'vnd_001', name: 'Mahesh Patel Transport', type: 'vehicle_owner', contact_person: 'Mahesh Patel', phone: '+91 94265 78901', email: 'mahesh.patel@gmail.com', gstin: '24AABCP1234E1Z5', pan: 'AABCP1234E', address: '12, Industrial Area', city: 'Ahmedabad', state: 'Gujarat', bank_name: 'HDFC Bank', account_number: '50200012345678', ifsc: 'HDFC0001234', total_paid: 2850000, outstanding: 125000, status: 'active', created_at: '2021-03-15' },
  { id: 'vnd_002', name: 'Bharat Petroleum (Dealer)', type: 'fuel_supplier', contact_person: 'Rajiv Gupta', phone: '+91 98765 12345', email: 'dealer.pune@bpcl.in', gstin: '27AABCB1234F1Z8', pan: 'AABCB1234F', address: '45, GT Road Fuel Station', city: 'Pune', state: 'Maharashtra', bank_name: 'SBI', account_number: '30200098765432', ifsc: 'SBIN0005678', total_paid: 4200000, outstanding: 0, status: 'active', created_at: '2020-01-10' },
  { id: 'vnd_003', name: 'MRF Tyre Distributor', type: 'tyre_vendor', contact_person: 'Sunil Agarwal', phone: '+91 98234 56789', email: 'sunil@mrfdist.com', gstin: '27AABCM5678G1Z2', pan: 'AABCM5678G', address: '78, Auto Market, Nigdi', city: 'Pune', state: 'Maharashtra', bank_name: 'ICICI Bank', account_number: '120200043210987', ifsc: 'ICIC0002345', total_paid: 890000, outstanding: 72000, status: 'active', created_at: '2022-05-20' },
  { id: 'vnd_004', name: 'Shree Balaji Service Center', type: 'garage', contact_person: 'Kishore Sharma', phone: '+91 97654 32100', email: 'balaji.service@gmail.com', gstin: '27AABCS3456H1Z9', pan: 'AABCS3456H', address: '23, MIDC Road', city: 'Nashik', state: 'Maharashtra', bank_name: 'Axis Bank', account_number: '91800234567890', ifsc: 'UTIB0003456', total_paid: 560000, outstanding: 45000, status: 'active', created_at: '2021-08-12' },
  { id: 'vnd_005', name: 'Ravi Logistics (Broker)', type: 'broker', contact_person: 'Ravi Kumar', phone: '+91 99887 76655', email: 'ravi.broker@yahoo.com', gstin: '', pan: 'AABCR7890I', address: '56, Transport Nagar', city: 'Delhi', state: 'Delhi', bank_name: 'PNB', account_number: '40100056789012', ifsc: 'PUNB0004567', total_paid: 1450000, outstanding: 88000, status: 'active', created_at: '2023-01-05' },
  { id: 'vnd_006', name: 'Krishna Spare Parts', type: 'other', contact_person: 'Dinesh Rao', phone: '+91 98112 34567', email: 'krishnaspares@gmail.com', gstin: '29AABCK2345J1Z1', pan: 'AABCK2345J', address: '12, Spare Parts Market', city: 'Bangalore', state: 'Karnataka', bank_name: 'Kotak Bank', account_number: '78900012345678', ifsc: 'KKBK0005678', total_paid: 320000, outstanding: 0, status: 'active', created_at: '2022-11-18' },
];

export default function VendorModule() {
  const [vendors, setVendors] = useState<Vendor[]>(isDemoTenant() ? seedVendors : []);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);


  const [form, setForm] = useState({
    name: '', type: 'vehicle_owner' as VendorType, contact_person: '', phone: '', email: '',
    gstin: '', pan: '', address: '', city: '', state: '', bank_name: '', account_number: '', ifsc: '',
  });

  const filteredVendors = vendors.filter(v => {
    if (typeFilter !== 'all' && v.type !== typeFilter) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !v.contact_person.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalOutstanding = vendors.reduce((s, v) => s + v.outstanding, 0);
  const totalPaid = vendors.reduce((s, v) => s + v.total_paid, 0);

  const typeLabels: Record<VendorType, string> = {
    vehicle_owner: 'Vehicle Owner',
    fuel_supplier: 'Fuel Supplier',
    tyre_vendor: 'Tyre Vendor',
    garage: 'Garage / Workshop',
    broker: 'Broker / Agent',
    other: 'Other',
  };

  const typeBadge: Record<VendorType, string> = {
    vehicle_owner: 'bg-blue-100 text-blue-800',
    fuel_supplier: 'bg-orange-100 text-orange-800',
    tyre_vendor: 'bg-purple-100 text-purple-800',
    garage: 'bg-teal-100 text-teal-800',
    broker: 'bg-indigo-100 text-indigo-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const handleAdd = () => {
    if (!form.name || !form.phone) return;
    const newVendor: Vendor = {
      id: 'vnd_' + generateId(),
      ...form,
      total_paid: 0,
      outstanding: 0,
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
    };
    setVendors([newVendor, ...vendors]);
    setShowModal(false);
    setForm({ name: '', type: 'vehicle_owner', contact_person: '', phone: '', email: '', gstin: '', pan: '', address: '', city: '', state: '', bank_name: '', account_number: '', ifsc: '' });
  };

  const handleDelete = (id: string) => {
    setVendors(vendors.filter(v => v.id !== id));
  };

  const exportCSV = () => {
    const headers = ['Name', 'Type', 'Contact', 'Phone', 'Email', 'GSTIN', 'City', 'State', 'Total Paid', 'Outstanding'];
    const rows = filteredVendors.map(v => [v.name, v.type, v.contact_person, v.phone, v.email, v.gstin, v.city, v.state, v.total_paid, v.outstanding]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'vendors.csv'; a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Vendor / Supplier Master</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Manage hired vehicle owners, fuel suppliers, tyre vendors & garages</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            <Download className="w-4 h-4 inline mr-1" /> Export
          </button>
          <button onClick={() => setShowBulkUpload(true)} className="px-4 py-2 text-sm border rounded-lg" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
            Bulk Upload
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Vendors</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{vendors.length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Active</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{vendors.filter(v => v.status === 'active').length}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Total Paid</p>
          <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-2xl border p-5" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(totalOutstanding)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          <option value="all">All Types</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>


      {/* Vendor List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map(vendor => (
          <div key={vendor.id} className="rounded-2xl border p-5 hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{vendor.name}</h3>
                <span className={classNames('inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium', typeBadge[vendor.type])}>{typeLabels[vendor.type]}</span>
              </div>
              <button onClick={() => handleDelete(vendor.id)} className="p-1 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>
            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-2"><Users className="w-3 h-3" /> {vendor.contact_person}</div>
              <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {vendor.phone}</div>
              {vendor.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {vendor.email}</div>}
              {vendor.gstin && <div className="flex items-center gap-2"><span className="font-medium">GSTIN:</span> {vendor.gstin}</div>}
              <div>{vendor.city}, {vendor.state}</div>
            </div>
            <div className="flex justify-between mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Paid</p>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatCurrency(vendor.total_paid)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Outstanding</p>
                <p className="text-sm font-medium text-orange-600">{formatCurrency(vendor.outstanding)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative rounded-2xl shadow-xl w-full max-w-lg p-6 m-4 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add Vendor</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Vendor Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value as VendorType})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Contact Person</label>
                  <input type="text" value={form.contact_person} onChange={(e) => setForm({...form, contact_person: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Phone *</label>
                  <input type="text" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>GSTIN</label>
                  <input type="text" value={form.gstin} onChange={(e) => setForm({...form, gstin: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>PAN</label>
                  <input type="text" value={form.pan} onChange={(e) => setForm({...form, pan: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>City</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({...form, city: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>State</label>
                  <input type="text" value={form.state} onChange={(e) => setForm({...form, state: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <p className="text-xs font-medium mt-2" style={{ color: 'var(--text-tertiary)' }}>Bank Details (for payment)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bank</label>
                  <input type="text" value={form.bank_name} onChange={(e) => setForm({...form, bank_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Account No.</label>
                  <input type="text" value={form.account_number} onChange={(e) => setForm({...form, account_number: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>IFSC</label>
                  <input type="text" value={form.ifsc} onChange={(e) => setForm({...form, ifsc: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <button onClick={handleAdd} className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Add Vendor</button>
            </div>
          </div>
        </div>
      )}

      {showBulkUpload && (
        <BulkUpload title="Bulk Upload Vendors" description="Import vendor records from CSV" sampleFields={['name', 'type', 'contact_person', 'phone', 'email', 'gstin', 'city', 'state']} onUpload={(data) => { data.forEach(row => { setVendors(prev => [...prev, { id: 'vnd_' + generateId(), name: row.name || '', type: (row.type as VendorType) || 'other', contact_person: row.contact_person || '', phone: row.phone || '', email: row.email || '', gstin: row.gstin || '', pan: row.pan || '', address: row.address || '', city: row.city || '', state: row.state || '', bank_name: '', account_number: '', ifsc: '', total_paid: 0, outstanding: 0, status: 'active', created_at: new Date().toISOString().split('T')[0] }]); }); }} onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}
