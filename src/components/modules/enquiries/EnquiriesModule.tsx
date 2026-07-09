import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatDate, getStatusColor } from '../../../lib/utils';
import { ArrowRight, FileText, Send, Truck, Package, MapPin, Calendar, Weight, IndianRupee } from 'lucide-react';
import type { Enquiry, Quotation } from '../../../types';

type Tab = 'enquiries' | 'quotations';

export default function EnquiriesModule() {
  const [activeTab, setActiveTab] = useState<Tab>('enquiries');
  const { enquiries, quotations, convertEnquiryToQuotation, convertQuotationToTrip, updateQuotation } = useStore();

  const steps = [
    { label: 'Enquiry', color: 'bg-purple-500', active: activeTab === 'enquiries' },
    { label: 'Quotation', color: 'bg-blue-500', active: activeTab === 'quotations' },
    { label: 'Trip Booking', color: 'bg-green-500', active: false },
  ];

  return (
    <div className="p-6 space-y-6">
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
