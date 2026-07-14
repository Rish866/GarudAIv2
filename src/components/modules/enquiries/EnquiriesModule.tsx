import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { useModuleData } from '../../../hooks/useModuleData';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import type { PaginationFilter } from '../../../hooks/usePaginatedData';
import Pagination from '../../ui/Pagination';
import { formatCurrency, formatDate, getStatusColor } from '../../../lib/utils';
import { generateQuotationPDF } from '../../../lib/pdf';
import { estimateDistance } from '../../../lib/distance';
import { ArrowRight, FileText, Send, Truck, Package, MapPin, Calendar, Weight, IndianRupee, Plus, X, Edit } from 'lucide-react';
import type { Enquiry, Quotation, VehicleType } from '../../../types';

type Tab = 'enquiries' | 'quotations';

export default function EnquiriesModule() {
  const [activeTab, setActiveTab] = useState<Tab>('enquiries');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const { company } = useStore();
  const {
    data: enquiries,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    setFilters,
    loading: enquiriesLoading,
    refresh: refreshEnquiries,
    hasNextPage,
    hasPrevPage,
  } = usePaginatedData<any>('enquiries', { defaultSort: 'created_at', defaultSortDirection: 'desc' });
  const { create: addEnquiry } = useModuleData<any>('enquiries');
  const { data: quotations, create: addQuotation, update: updateQuotation } = useModuleData<any>('quotations');
  const { data: customers } = useModuleData<any>('customers');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filters: PaginationFilter = {};
    if (query.trim()) filters.search = { columns: ['customer_name', 'origin', 'destination'], query: query.trim() };
    setFilters(filters);
  };

  const steps = [
    { label: 'Enquiry', color: 'bg-purple-500', active: activeTab === 'enquiries' },
    { label: 'Quotation', color: 'bg-blue-500', active: activeTab === 'quotations' },
    { label: 'Trip Booking', color: 'bg-green-500', active: false },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Enquiries & Quotations</h1>
          <p className="text-sm text-slate-500 mt-0.5">{enquiries.length} enquiries, {quotations.length} quotations</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          New Enquiry
        </button>
      </div>

      {/* Workflow Indicator */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center justify-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${step.active ? step.color : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className={`text-sm font-medium ${step.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-2" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('enquiries')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'enquiries'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Enquiries ({enquiries.length})
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'quotations'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Quotations ({quotations.length})
        </button>
      </div>

      {/* Enquiries Tab */}
      {activeTab === 'enquiries' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Enquiries <span className="text-sm font-normal text-slate-500">({enquiries.length})</span>
          </h2>
          {enquiries.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No enquiries yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {enquiries.map((enquiry: Enquiry) => (
                <div key={enquiry.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{enquiry.customer_name}</h3>
                      <div className="flex items-center gap-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{enquiry.origin}</span>
                        <ArrowRight className="w-3 h-3 mx-1" />
                        <span>{enquiry.destination}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(enquiry.status)}`}>
                      {enquiry.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>{enquiry.material}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Weight className="w-4 h-4 text-slate-400" />
                      <span>{enquiry.weight_tons} Tons</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium">{enquiry.vehicle_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(enquiry.loading_date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1 text-sm">
                      <IndianRupee className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(enquiry.target_rate)}</span>
                      <span className="text-slate-400 text-xs">target</span>
                    </div>
                    {enquiry.status === 'new' && (
                      <button
                        onClick={() => addQuotation({ enquiry_id: enquiry.id, customer_id: enquiry.customer_id, customer_name: enquiry.customer_name, origin: enquiry.origin, destination: enquiry.destination, vehicle_type: enquiry.vehicle_type, material: enquiry.material, weight_tons: enquiry.weight_tons, rate_type: 'per_trip', rate: enquiry.target_rate, total_amount: Math.round(enquiry.target_rate * 1.05), gst_percent: 5, validity_days: 7, quotation_number: `QT-${Date.now().toString(36)}`, status: 'draft', created_at: new Date().toISOString() })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Create Quotation
                      </button>
                    )}
                  </div>

                  {enquiry.remarks && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">{enquiry.remarks}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Quotations <span className="text-sm font-normal text-slate-500">({quotations.length})</span>
          </h2>
          {quotations.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No quotations yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {quotations.map((quotation: Quotation) => (
                <div key={quotation.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{quotation.quotation_number}</h3>
                        {quotation.enquiry_id && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-500 dark:text-slate-400">
                            Enq: {quotation.enquiry_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{quotation.customer_name}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(quotation.status)}`}>
                      {quotation.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{quotation.origin}</span>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <span>{quotation.destination}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="text-xs text-slate-400 block">Material</span>
                      {quotation.material}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="text-xs text-slate-400 block">Rate Type</span>
                      <span className="capitalize">{quotation.rate_type.replace('_', ' ')}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="text-xs text-slate-400 block">Rate</span>
                      {formatCurrency(quotation.rate)}
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="text-xs text-slate-400 block">Total Amount</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(quotation.total_amount)}</span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="text-xs text-slate-400 block">GST</span>
                      {quotation.gst_percent}%
                    </div>
                    <div className="text-slate-600 dark:text-slate-300">
                      <span className="text-xs text-slate-400 block">Valid For</span>
                      {quotation.validity_days} days
                    </div>
                  </div>

                  {quotation.terms && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-700/50 rounded-lg p-2">
                      {quotation.terms}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => setEditingQuotation(quotation)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    {quotation.status === 'draft' && (
                      <button
                        onClick={() => updateQuotation(quotation.id, { status: 'sent' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </button>
                    )}
                    {quotation.status === 'sent' && (
                      <button
                        onClick={() => updateQuotation(quotation.id, { status: 'accepted' })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Convert to Trip
                      </button>
                    )}
                    <button
                      onClick={() => generateQuotationPDF(quotation, company)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Quotation Modal */}
      {editingQuotation && (
        <EditQuotationModal quotation={editingQuotation} onClose={() => setEditingQuotation(null)} />
      )}

      {/* Add Enquiry Modal */}
      {showAddModal && (
        <AddEnquiryModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddEnquiryModal({ onClose }: { onClose: () => void }) {
  const { data: customers } = useModuleData<any>('customers');
  const { create: addEnquiry } = useModuleData<any>('enquiries');

  const [form, setForm] = useState({
    customer_id: '',
    origin: '',
    destination: '',
    material: '',
    vehicle_type: 'truck' as VehicleType,
    weight_tons: '',
    loading_date: '',
    target_rate: '',
    remarks: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === form.customer_id);
    if (!customer) return;

    const enquiry: Enquiry = {
      id: generateId(),
      
      customer_id: customer.id,
      customer_name: customer.name,
      origin: form.origin,
      destination: form.destination,
      material: form.material,
      vehicle_type: form.vehicle_type,
      weight_tons: Number(form.weight_tons) || 0,
      loading_date: form.loading_date,
      target_rate: Number(form.target_rate) || 0,
      status: 'new',
      remarks: form.remarks || undefined,
      created_at: new Date().toISOString(),
    };

    addEnquiry(enquiry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">New Enquiry</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select name="customer_id" value={form.customer_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
              <input type="text" name="origin" value={form.origin} onChange={handleChange} required placeholder="e.g., Pune, Maharashtra" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input type="text" name="destination" value={form.destination} onChange={handleChange} required placeholder="e.g., Mumbai, Maharashtra" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          {/* Auto KM estimation */}
          {form.origin && form.destination && estimateDistance(form.origin, form.destination) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-600 text-sm font-medium">📍 Estimated Distance:</span>
              <span className="text-blue-800 font-bold text-sm">{estimateDistance(form.origin, form.destination)} km</span>
              <span className="text-blue-500 text-xs">(auto-calculated)</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
              <input type="text" name="material" value={form.material} onChange={handleChange} required placeholder="e.g., Cement Bags" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Type</label>
              <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="truck">Truck</option>
                <option value="trailer">Trailer</option>
                <option value="container">Container</option>
                <option value="tanker">Tanker</option>
                <option value="tipper">Tipper</option>
                <option value="reefer">Reefer (Cold Chain)</option>
                <option value="lcv">LCV (Light Commercial)</option>
                <option value="open_body">Open Body</option>
                <option value="flatbed">Flatbed</option>
                <option value="bulker">Bulker (Cement)</option>
                <option value="car_carrier">Car Carrier</option>
                <option value="half_body">Half Body</option>
                <option value="full_body">Full Body (Closed)</option>
                <option value="jcb_crane">JCB / Crane / ODC</option>
                <option value="mini_truck">Mini Truck</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (Tons)</label>
              <input type="number" name="weight_tons" value={form.weight_tons} onChange={handleChange} required placeholder="25" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Loading Date</label>
              <input type="date" name="loading_date" value={form.loading_date} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Rate (₹)</label>
              <input type="number" name="target_rate" value={form.target_rate} onChange={handleChange} required placeholder="55000" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={2} placeholder="Any special requirements..." className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Create Enquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function EditQuotationModal({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const { update: updateQuotation } = useModuleData<any>('quotations');
  const [form, setForm] = useState({
    origin: quotation.origin,
    destination: quotation.destination,
    material: quotation.material,
    weight_tons: String(quotation.weight_tons),
    rate_type: quotation.rate_type,
    rate: String(quotation.rate),
    gst_percent: String(quotation.gst_percent),
    validity_days: String(quotation.validity_days),
    terms: quotation.terms || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    const rate = Number(form.rate) || 0;
    const gst = Number(form.gst_percent) || 5;
    const totalAmount = Math.round(rate * (1 + gst / 100));
    updateQuotation(quotation.id, {
      origin: form.origin,
      destination: form.destination,
      material: form.material,
      weight_tons: Number(form.weight_tons) || 0,
      rate_type: form.rate_type as Quotation['rate_type'],
      rate,
      gst_percent: gst,
      total_amount: totalAmount,
      validity_days: Number(form.validity_days) || 7,
      terms: form.terms || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Quotation</h2>
            <p className="text-xs text-slate-500">{quotation.quotation_number} • {quotation.customer_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
              <input type="text" name="origin" value={form.origin} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input type="text" name="destination" value={form.destination} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
              <input type="text" name="material" value={form.material} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (Tons)</label>
              <input type="number" name="weight_tons" value={form.weight_tons} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate Type</label>
              <select name="rate_type" value={form.rate_type} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="per_trip">Per Trip</option>
                <option value="per_ton">Per Ton</option>
                <option value="per_km">Per KM</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate (₹)</label>
              <input type="number" name="rate" value={form.rate} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GST %</label>
              <select name="gst_percent" value={form.gst_percent} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Validity (Days)</label>
            <input type="number" name="validity_days" value={form.validity_days} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
            <textarea name="terms" value={form.terms} onChange={handleChange} rows={3} placeholder="e.g., Loading/unloading at party scope. Detention ₹2000/day after 24hrs." className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <span className="text-slate-500">Total Amount (auto-calculated): </span>
            <span className="font-bold text-slate-900">{formatCurrency(Math.round((Number(form.rate) || 0) * (1 + (Number(form.gst_percent) || 5) / 100)))}</span>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
