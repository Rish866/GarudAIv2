import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { formatCurrency, formatDate, getStatusColor } from '../../../lib/utils';
import { generateQuotationPDF } from '../../../lib/pdf';
import { ArrowRight, FileText, Send, Truck, Package, MapPin, Calendar, Weight, IndianRupee, Plus, X } from 'lucide-react';
import type { Enquiry, Quotation, VehicleType } from '../../../types';

type Tab = 'enquiries' | 'quotations';

export default function EnquiriesModule() {
  const [activeTab, setActiveTab] = useState<Tab>('enquiries');
  const [showAddModal, setShowAddModal] = useState(false);
  const { enquiries, quotations, customers, company, convertEnquiryToQuotation, convertQuotationToTrip, updateQuotation, addEnquiry } = useStore();

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
                        onClick={() => convertEnquiryToQuotation(enquiry.id)}
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
                        onClick={() => convertQuotationToTrip(quotation.id)}
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

      {/* Add Enquiry Modal */}
      {showAddModal && (
        <AddEnquiryModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AddEnquiryModal({ onClose }: { onClose: () => void }) {
  const { customers, addEnquiry } = useStore();

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
      company_id: 'comp_garud_001',
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
                <option value="reefer">Reefer</option>
                <option value="lcv">LCV</option>
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
