import React, { useState, useEffect } from "react";
import { X, MapPin, Truck, User, Package, Calendar, Phone, CreditCard, FileText, Download, Clock, CheckCircle, Circle } from "lucide-react";
import { useStore } from "../../../store/useStore";
import { useOrganization } from "../../../contexts/OrganizationContext";
import { usePermissions } from "../../../hooks/usePermissions";
import { useModuleData } from "../../../hooks/useModuleData";
import { tripRepository } from "../../../data/trips/tripRepository";
import { formatCurrency, formatDate, getStatusColor, classNames } from "../../../lib/utils";
import { generateLRPDF, generateTripReportPDF } from "../../../lib/pdf";
import { showToast } from "../../ui/Toast";
import DriverAdvanceTracker from "./DriverAdvanceTracker";
import DriverSettlementPanel from "./DriverSettlementPanel";
import type { Trip, TripStatus, Invoice, Payment, Expense, FuelEntry, Enquiry, Quotation, Vehicle, Customer } from "../../../types";

const STATUS_FLOW: TripStatus[] = [
  'booked', 'assigned', 'loading', 'in_transit', 'reached', 'unloading', 'pod_pending', 'completed', 'billed', 'settled'
];

export default function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { company } = useStore();
  const { organizationId } = useOrganization();
  const { update: updateTrip } = useModuleData<Trip>('trips', { fetchOnMount: false });
  const { data: expenses } = useModuleData<Expense>('expenses');
  const { data: fuelEntries } = useModuleData<FuelEntry>('fuel_entries');
  const { data: invoices } = useModuleData<Invoice>('invoices');
  const { data: payments } = useModuleData<Payment>('payments');
  const { data: quotations } = useModuleData<Quotation>('quotations');
  const { data: enquiries } = useModuleData<Enquiry>('enquiries');
  const currentIdx = STATUS_FLOW.indexOf(trip.status);

  // P0.1 — Trip-Level Profitability (authoritative service)
  const [profitData, setProfitData] = useState<{ revenue: number; directCost: number; grossProfit: number; marginPercentage: number; completeness: string; missingInputs: string[] } | null>(null);
  useEffect(() => {
    if (!organizationId || !trip.id) return;
    import('../../../lib/tripEntities').then(({ calculateTripProfitability }) => {
      calculateTripProfitability(organizationId, trip.id).then(setProfitData);
    });
  }, [organizationId, trip.id]);

  const totalRevenue = profitData?.revenue ?? ((trip.freight_amount || 0) + (trip.detention_charges || 0) + (trip.other_charges || 0));
  const fuelCost = profitData ? profitData.directCost : 0;
  const expenseCost = 0; // Included in directCost from service
  const totalCost = profitData?.directCost ?? 0;
  const tripProfit = profitData?.grossProfit ?? (totalRevenue - totalCost);
  const profitMargin = profitData?.marginPercentage ?? (totalRevenue > 0 ? Math.round((tripProfit / totalRevenue) * 100) : 0);
  const profitMissingData = profitData?.missingInputs ?? [];

  // P0.2 — Linked Document Chain
  const linkedInvoice = invoices.find(i => i.trip_ids.includes(trip.id));
  const linkedPayment = linkedInvoice ? payments.find(p => p.invoice_id === linkedInvoice.id) : undefined;
  const linkedQuotation = quotations.find(q => q.customer_id === trip.customer_id && q.origin === trip.origin && q.destination === trip.destination);
  const linkedEnquiry = linkedQuotation?.enquiry_id ? enquiries.find(e => e.id === linkedQuotation.enquiry_id) : undefined;

  const getStatusDate = (status: TripStatus): string | null => {
    switch (status) {
      case 'booked': return trip.booking_date;
      case 'loading': return trip.loading_date || null;
      case 'in_transit': return trip.departure_date || null;
      case 'completed': return trip.actual_delivery || null;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{trip.trip_number}</h2>
            <p className="text-sm text-slate-500">LR: {trip.lr_number}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Trip Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Trip Timeline</h3>
            <div className="relative pl-6">
              {STATUS_FLOW.map((status, idx) => {
                const isCompleted = idx <= currentIdx;
                const isCurrent = idx === currentIdx;
                const dateStr = getStatusDate(status);
                return (
                  <div key={status} className="relative flex items-start pb-4 last:pb-0">
                    {/* Vertical line */}
                    {idx < STATUS_FLOW.length - 1 && (
                      <div className={classNames(
                        'absolute left-[-14px] top-5 w-0.5 h-full',
                        isCompleted ? 'bg-green-400' : 'bg-slate-200'
                      )} />
                    )}
                    {/* Circle */}
                    <div className="absolute left-[-18px] top-0.5">
                      {isCompleted ? (
                        <CheckCircle size={16} className={isCurrent ? 'text-blue-600' : 'text-green-500'} />
                      ) : (
                        <Circle size={16} className="text-slate-300" />
                      )}
                    </div>
                    <div className="ml-2">
                      <span className={classNames(
                        'text-sm font-medium capitalize',
                        isCurrent ? 'text-blue-600' : isCompleted ? 'text-slate-900' : 'text-slate-400'
                      )}>
                        {status.replace(/_/g, ' ')}
                      </span>
                      {dateStr && <span className="text-xs text-slate-500 ml-2">{formatDate(dateStr)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Route Section */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Route</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-700">{trip.origin}</span>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{trip.destination}</span>
                <div className="w-3 h-3 rounded-full bg-red-500" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">{trip.distance_km} km | Expected: {trip.expected_delivery ? formatDate(trip.expected_delivery) : 'N/A'}</p>
          </div>

          {/* Vehicle & Driver */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Truck size={14} /> Vehicle
              </h3>
              <p className="text-sm text-slate-700 font-medium">{trip.vehicle_reg}</p>
              <p className="text-xs text-slate-500">ID: {trip.vehicle_id}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <User size={14} /> Driver
              </h3>
              <p className="text-sm text-slate-700 font-medium">{trip.driver_name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Phone size={10} /> {trip.driver_phone}
              </p>
            </div>
          </div>


          {/* Financial Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard size={14} /> Financial Breakdown
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Freight</span>
                <span className="font-medium">{formatCurrency(trip.freight_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Advance</span>
                <span className="font-medium">{formatCurrency(trip.advance_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Balance</span>
                <span className="font-medium">{formatCurrency(trip.balance_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Detention</span>
                <span className="font-medium">{formatCurrency(trip.detention_charges)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Other Charges</span>
                <span className="font-medium">{formatCurrency(trip.other_charges)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-2">
                <span className="text-slate-900 font-semibold">Total</span>
                <span className="font-bold text-slate-900">{formatCurrency(trip.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* POD Section */}
          {trip.pod_details && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h3 className="text-sm font-semibold text-green-900 mb-3">POD Details</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-green-700 text-xs">Received By</span>
                  <p className="font-medium text-green-900">{trip.pod_details.received_by || '—'}</p>
                </div>
                <div>
                  <span className="text-green-700 text-xs">Condition</span>
                  <p className="font-medium text-green-900 capitalize">{trip.pod_details.condition}</p>
                </div>
                <div>
                  <span className="text-green-700 text-xs">Date</span>
                  <p className="font-medium text-green-900">{trip.pod_details.received_date ? formatDate(trip.pod_details.received_date) : trip.pod_date ? formatDate(trip.pod_date) : '—'}</p>
                </div>
              </div>
              {trip.pod_details.remarks && (
                <p className="text-xs text-green-700 mt-2">Remarks: {trip.pod_details.remarks}</p>
              )}
              {/* POD Verification Actions */}
              {trip.status === 'pod_pending' && (
                <div className="mt-3 pt-3 border-t border-green-200 flex gap-2">
                  <button
                    onClick={async () => {
                      if (!organizationId) return;
                      const { getPODForTrip, verifyPOD } = await import('../../../lib/tripEntities');
                      const pod = await getPODForTrip(organizationId, trip.id);
                      if (pod) {
                        const result = await verifyPOD(organizationId, pod.id, 'current_user');
                        if (result.success) {
                          showToast('success', 'POD verified');
                          updateTrip(trip.id, { status: 'completed' });
                        } else {
                          showToast('error', result.error || 'Verification failed');
                        }
                      } else {
                        showToast('error', 'No POD record found. Upload POD first.');
                      }
                    }}
                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700"
                  >
                    ✓ Verify POD
                  </button>
                  <button
                    onClick={async () => {
                      const reason = prompt('Rejection reason:');
                      if (!reason || !organizationId) return;
                      const { getPODForTrip, rejectPOD } = await import('../../../lib/tripEntities');
                      const pod = await getPODForTrip(organizationId, trip.id);
                      if (pod) {
                        const result = await rejectPOD(organizationId, pod.id, reason);
                        if (result.success) {
                          showToast('warning', 'POD rejected. Driver must re-upload.');
                        } else {
                          showToast('error', result.error || 'Rejection failed');
                        }
                      }
                    }}
                    className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50"
                  >
                    ✗ Reject POD
                  </button>
                  <button
                    onClick={async () => {
                      const reason = prompt('POD waiver reason (min 5 chars):');
                      if (!reason || reason.length < 5 || !organizationId) {
                        if (reason && reason.length < 5) showToast('error', 'Waiver reason must be at least 5 characters');
                        return;
                      }
                      const { getPODForTrip, waivePOD } = await import('../../../lib/tripEntities');
                      const pod = await getPODForTrip(organizationId, trip.id);
                      const result = await waivePOD(organizationId, pod?.id || null, trip.id, reason, 'current_user');
                      if (result.success) {
                        showToast('success', 'POD requirement waived');
                        updateTrip(trip.id, { status: 'completed' });
                      } else {
                        showToast('error', result.error || 'Waiver failed');
                      }
                    }}
                    className="px-3 py-1.5 border border-orange-200 text-orange-600 text-xs font-medium rounded-lg hover:bg-orange-50"
                  >
                    ⚠ Waive POD
                  </button>
                </div>
              )}
            </div>
          )}

          {/* P0.1 — TRIP PROFITABILITY */}
          <div className={classNames('rounded-xl p-4 border', profitMargin >= 20 ? 'bg-green-50 border-green-200' : profitMargin >= 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200')}>
            <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span className={profitMargin >= 20 ? 'text-green-900' : profitMargin >= 0 ? 'text-yellow-900' : 'text-red-900'}>
                📊 Trip Profitability
              </span>
              <span className={classNames('px-3 py-1 rounded-full text-xs font-bold', profitMargin >= 20 ? 'bg-green-200 text-green-800' : profitMargin >= 0 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800')}>
                {profitMargin}% Margin
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Revenue Side */}
              <div>
                <p className="text-xs font-semibold text-green-700 mb-2 uppercase">Revenue</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Freight</span><span className="font-medium text-green-700">{formatCurrency(trip.freight_amount)}</span></div>
                  {trip.detention_charges > 0 && <div className="flex justify-between"><span className="text-slate-600">Detention</span><span className="font-medium text-green-700">{formatCurrency(trip.detention_charges)}</span></div>}
                  {trip.other_charges > 0 && <div className="flex justify-between"><span className="text-slate-600">Other</span><span className="font-medium text-green-700">{formatCurrency(trip.other_charges)}</span></div>}
                  <div className="flex justify-between border-t border-green-200 pt-1"><span className="font-semibold">Total Revenue</span><span className="font-bold text-green-800">{formatCurrency(totalRevenue)}</span></div>
                </div>
              </div>
              {/* Cost Side */}
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2 uppercase">Costs</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Fuel</span><span className="font-medium text-red-700">{formatCurrency(fuelCost)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Expenses</span><span className="font-medium text-red-700">{formatCurrency(expenseCost)}</span></div>
                  <div className="flex justify-between border-t border-red-200 pt-1"><span className="font-semibold">Total Cost</span><span className="font-bold text-red-800">{formatCurrency(totalCost)}</span></div>
                </div>
              </div>
            </div>
            {/* Profit Line */}
            <div className="mt-3 pt-3 border-t flex justify-between items-center" style={{ borderColor: profitMargin >= 0 ? '#86efac' : '#fca5a5' }}>
              <span className="font-bold text-sm">NET PROFIT / (LOSS)</span>
              <span className={classNames('text-lg font-bold', tripProfit >= 0 ? 'text-green-700' : 'text-red-700')}>
                {tripProfit >= 0 ? '' : '('}{formatCurrency(Math.abs(tripProfit))}{tripProfit < 0 ? ')' : ''}
              </span>
            </div>
          </div>

          {/* DRIVER SETTLEMENT */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <h3 className="text-sm font-semibold text-amber-900 mb-3">Driver Settlement</h3>
            <DriverSettlementPanel tripId={trip.id} driverId={trip.driver_id} driverName={trip.driver_name} organizationId={organizationId || ''} />
          </div>

          {/* P0.2 — LINKED DOCUMENT CHAIN */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              🔗 Document Chain (End-to-End Traceability)
            </h3>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Enquiry */}
              <div className={classNames('px-3 py-2 rounded-lg text-xs font-medium border', linkedEnquiry ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                {linkedEnquiry ? `📋 Enquiry: ${linkedEnquiry.customer_name}` : '📋 Enquiry: —'}
              </div>
              <span className="text-slate-300">→</span>
              {/* Quotation */}
              <div className={classNames('px-3 py-2 rounded-lg text-xs font-medium border', linkedQuotation ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                {linkedQuotation ? `📄 ${linkedQuotation.quotation_number} (₹${linkedQuotation.rate.toLocaleString()})` : '📄 Quotation: —'}
              </div>
              <span className="text-slate-300">→</span>
              {/* Trip (current) */}
              <div className="px-3 py-2 rounded-lg text-xs font-medium border-2 border-blue-500 bg-blue-100 text-blue-900">
                🚛 {trip.trip_number}
              </div>
              <span className="text-slate-300">→</span>
              {/* Invoice */}
              <div className={classNames('px-3 py-2 rounded-lg text-xs font-medium border', linkedInvoice ? 'bg-green-50 border-green-200 text-green-800' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                {linkedInvoice ? `🧾 ${linkedInvoice.invoice_number} (₹${linkedInvoice.total_amount.toLocaleString()})` : '🧾 Invoice: Pending'}
              </div>
              <span className="text-slate-300">→</span>
              {/* Payment */}
              <div className={classNames('px-3 py-2 rounded-lg text-xs font-medium border', linkedPayment ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                {linkedPayment ? `💰 ₹${linkedPayment.amount.toLocaleString()} (${linkedPayment.payment_mode})` : '💰 Payment: Pending'}
              </div>
            </div>
            {linkedInvoice && (
              <div className="mt-2 text-xs text-slate-500">
                Invoice Status: <span className="font-medium">{linkedInvoice.status}</span> | 
                Balance: <span className="font-medium text-orange-600">{formatCurrency(linkedInvoice.balance_amount)}</span>
              </div>
            )}
          </div>


          {/* Documents */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <FileText size={14} /> Documents
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <span className="text-slate-500 text-xs">LR Number</span>
                <p className="font-medium text-slate-900">{trip.lr_number}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">E-Way Bill</span>
                <p className="font-medium text-slate-900">{trip.eway_bill || '—'}</p>
              </div>
            </div>
            <button
              onClick={() => generateLRPDF(trip, company)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <FileText size={14} />
              Print LR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

