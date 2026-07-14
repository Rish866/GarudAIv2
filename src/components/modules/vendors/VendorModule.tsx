import React, { useState } from 'react';
import { useModuleData } from '../../../hooks/useModuleData';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import type { PaginationFilter } from '../../../hooks/usePaginatedData';
import Pagination from '../../ui/Pagination';
import { formatCurrency, formatDate, classNames } from '../../../lib/utils';

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
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




export default function VendorModule() {
  const {
    data: vendors,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    setFilters,
    loading: vendorsLoading,
    refresh: refreshVendors,
    hasNextPage,
    hasPrevPage,
  } = usePaginatedData<Vendor>('vendors', { defaultSort: 'created_at', defaultSortDirection: 'desc' });
  const { create: createVendor, update: updateVendor, remove: removeVendor } = useModuleData<Vendor>('vendors');
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearch(query);
    const filters: PaginationFilter = {};
    if (query.trim()) filters.search = { columns: ['name', 'city', 'type'], query: query.trim() };
    if (typeFilter !== 'all') filters.eq = { type: typeFilter };
    setFilters(filters);
  };

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type);
    const filters: PaginationFilter = {};
    if (search.trim()) filters.search = { columns: ['name', 'city', 'type'], query: search.trim() };
    if (type !== 'all') filters.eq = { type };
    setFilters(filters);
  };


  const [form, setForm] = useState({
    name: '', type: 'vehicle_owner' as VendorType, contact_person: '', phone: '', email: '',
    gstin: '', pan: '', address: '', city: '', state: '', bank_name: '', account_number: '', ifsc: '',
  });

  const filteredVendors = vendors;

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
    createVendor(newVendor);
    setShowModal(false);
    setForm({ name: '', type: 'vehicle_owner', contact_person: '', phone: '', email: '', gstin: '', pan: '', address: '', city: '', state: '', bank_name: '', account_number: '', ifsc: '' });
  };

  const handleDelete = (id: string) => {
    removeVendor(id);
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
          <input type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search vendors..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
        </div>
        <select value={typeFilter} onChange={(e) => handleTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
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
        <BulkUpload title="Bulk Upload Vendors" description="Import vendor records from CSV" sampleFields={['name', 'type', 'contact_person', 'phone', 'email', 'gstin', 'city', 'state']} onUpload={(data) => { data.forEach(row => { createVendor( { id: 'vnd_' + generateId(), name: row.name || '', type: (row.type as VendorType) || 'other', contact_person: row.contact_person || '', phone: row.phone || '', email: row.email || '', gstin: row.gstin || '', pan: row.pan || '', address: row.address || '', city: row.city || '', state: row.state || '', bank_name: '', account_number: '', ifsc: '', total_paid: 0, outstanding: 0, status: 'active', created_at: new Date().toISOString().split('T')[0] }); }); }} onClose={() => setShowBulkUpload(false)} />
      )}
    </div>
  );
}
