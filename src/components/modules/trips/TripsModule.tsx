import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import { useModuleData } from '../../../hooks/useModuleData';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { tripRepository } from '../../../data/trips/tripRepository';
import type { Trip, TripStatus, Invoice } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, classNames, generateTripNumber, generateLRNumber, generateInvoiceNumber } from '../../../lib/utils';
import { generateLRPDF, generateTripReportPDF } from '../../../lib/pdf';
import { exportTrips } from '../../../lib/excel';
import { estimateDistance } from '../../../lib/distance';
import { showToast } from '../../ui/Toast';
import { Plus, Search, MapPin, Truck, User, Package, ChevronDown, X, FileText, Download, Eye, Upload, Calendar, Phone, CreditCard, CheckCircle, Circle, Clock, Ban, RotateCcw, Edit3 } from 'lucide-react';
import DriverAdvanceTracker from './DriverAdvanceTracker';
import SendNotificationModal from '../../ui/SendNotificationModal';

const STATUS_FLOW: TripStatus[] = [
  'booked', 'assigned', 'loading', 'in_transit', 'reached', 'unloading', 'pod_pending', 'completed', 'billed', 'settled'
];

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'loading', label: 'Loading' },
  { key: 'pod_pending', label: 'POD Pending' },
  { key: 'completed', label: 'Completed' },
  { key: 'billed', label: 'Billed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

function getNextStatuses(current: TripStatus): TripStatus[] {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return [];
  return STATUS_FLOW.slice(idx + 1, idx + 3);
}


export default function TripsModule() {
  const { company } = useStore();
  const { organizationId } = useOrganization();
  const { can } = usePermissions();
  const { data: trips, create: addTrip, update: updateTrip, refresh: refreshTrips, loading: tripsLoading } = useModuleData<any>('trips');
  const { data: customers } = useModuleData<any>('customers');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');
  const { create: addInvoice } = useModuleData<any>('invoices');
  const { create: addNotification } = useModuleData<any>('notifications');
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);
  const [podModalTrip, setPodModalTrip] = useState<Trip | null>(null);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);
  const [notifyTrip, setNotifyTrip] = useState<{ trip: Trip; status: string } | null>(null);
  const [cancelModalTrip, setCancelModalTrip] = useState<Trip | null>(null);
  const [editModalTrip, setEditModalTrip] = useState<Trip | null>(null);
  const [reopenModalTrip, setReopenModalTrip] = useState<Trip | null>(null);

  const canEditTrips = can('trips.update');
  const canDeleteTrips = can('trips.delete');
  const canCreateTrips = can('trips.create');

  const filteredTrips = trips.filter((trip) => {
    const matchesFilter = activeFilter === 'all' || trip.status === activeFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      trip.trip_number.toLowerCase().includes(query) ||
      trip.customer_name.toLowerCase().includes(query) ||
      trip.vehicle_reg.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const getFilterCount = (key: string) => {
    if (key === 'all') return trips.length;
    return trips.filter((t) => t.status === key).length;
  };


  const handleStatusUpdate = async (tripId: string, newStatus: TripStatus) => {
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    setStatusDropdown(null);

    const { error } = await tripRepository.transitionStatus(organizationId, tripId, newStatus);
    if (error) {
      showToast('error', `Status update failed: ${error}`);
      return;
    }

    showToast('success', `Status updated to ${newStatus.replace(/_/g, ' ')}`);
    await refreshTrips();

    // Trigger notification modal
    const foundTrip = trips.find(t => t.id === tripId);
    if (foundTrip) {
      setNotifyTrip({ trip: foundTrip, status: newStatus.replace(/_/g, ' ') });
    }

    // Auto-generate invoice when trip is completed
    if (newStatus === 'completed') {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        const subtotal = trip.freight_amount + trip.detention_charges + trip.other_charges;
        const gst_amount = Math.round(subtotal * 0.05);
        const tds_amount = Math.round(subtotal * 0.02);
        const total_amount = subtotal + gst_amount - tds_amount;

        const invoice: Invoice = {
          id: generateId(),
          invoice_number: generateInvoiceNumber(),
          customer_id: trip.customer_id,
          customer_name: trip.customer_name,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          trip_ids: [trip.id],
          freight_total: trip.freight_amount,
          detention_total: trip.detention_charges,
          other_charges: trip.other_charges,
          subtotal,
          gst_percent: 5,
          gst_amount,
          tds_amount,
          total_amount,
          paid_amount: 0,
          balance_amount: total_amount,
          status: 'sent',
          created_at: new Date().toISOString(),
        };
        addInvoice(invoice);

        // Transition to billed via RPC
        await tripRepository.transitionStatus(organizationId, tripId, 'billed');
        await refreshTrips();

        // Send notification
        addNotification({
          id: generateId(),
          type: 'invoice_generated',
          title: 'Invoice Auto-Generated',
          message: `Invoice ${invoice.invoice_number} created for trip ${trip.trip_number} (${formatCurrency(total_amount)})`,
          link_module: 'billing',
          link_id: invoice.id,
          is_read: false,
          created_at: new Date().toISOString(),
        });
      }
    }
  };


  const handleDuplicateTrip = (trip: Trip) => {
    const newTrip: Trip = {
      ...trip,
      id: generateId(),
      trip_number: generateTripNumber(),
      lr_number: generateLRNumber(),
      eway_bill: 'EWB-' + Date.now().toString().slice(-9),
      status: 'booked',
      booking_date: new Date().toISOString().split('T')[0],
      loading_date: undefined,
      departure_date: undefined,
      expected_delivery: undefined,
      actual_delivery: undefined,
      pod_url: undefined,
      pod_date: undefined,
      pod_details: undefined,
      remarks: `Duplicated from ${trip.trip_number}`,
      created_at: new Date().toISOString(),
    };
    addTrip(newTrip);
  };

  const handleCancelTrip = async (tripId: string, reason: string) => {
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    const { error } = await tripRepository.cancel(organizationId, tripId, reason);
    if (error) {
      showToast('error', `Cancel failed: ${error}`);
    } else {
      showToast('success', 'Trip cancelled successfully');
      await refreshTrips();
    }
    setCancelModalTrip(null);
  };

  const handleReopenTrip = async (tripId: string, reason: string) => {
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    const { error } = await tripRepository.reopen(organizationId, tripId, reason);
    if (error) {
      showToast('error', `Reopen failed: ${error}`);
    } else {
      showToast('success', 'Trip reopened successfully');
      await refreshTrips();
    }
    setReopenModalTrip(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip Management</h1>
          <p className="text-sm text-slate-500 mt-1">{trips.length} total trips</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateTripReportPDF(filteredTrips, company, 'Trip Report')}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button
            onClick={() => exportTrips(filteredTrips)}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Export Excel
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors font-medium"
            disabled={!canCreateTrips}
            title={!canCreateTrips ? 'You do not have permission to create trips' : undefined}
          >
            <Plus size={18} />
            New Trip
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeFilter === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-slate-200 px-1.5 py-0.5 rounded-full">
              {getFilterCount(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by trip number, customer, or vehicle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>


      {/* Trip Cards */}
      <div className="space-y-4">
        {filteredTrips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-900">{trip.trip_number}</span>
                <span className="text-sm text-slate-500">LR: {trip.lr_number}</span>
                <span className={classNames('px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(trip.status))}>
                  {trip.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setDetailTrip(trip)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  title="View Trip Details"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  onClick={() => handleDuplicateTrip(trip)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                  title="Duplicate Trip"
                >
                  Duplicate
                </button>
                {/* Edit — only for non-settled, non-cancelled trips AND user has permission */}
                {trip.status !== 'settled' && trip.status !== 'cancelled' && canEditTrips && (
                  <button
                    onClick={() => setEditModalTrip(trip)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                    title="Edit Trip"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
                {/* Cancel — only for non-settled, non-cancelled trips AND user has permission */}
                {trip.status !== 'settled' && trip.status !== 'cancelled' && canDeleteTrips && (
                  <button
                    onClick={() => setCancelModalTrip(trip)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    title="Cancel Trip"
                  >
                    <Ban size={14} />
                    Cancel
                  </button>
                )}
                {/* Reopen — only for cancelled trips AND user has permission (owner/admin/ops_manager) */}
                {trip.status === 'cancelled' && canDeleteTrips && (
                  <button
                    onClick={() => setReopenModalTrip(trip)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                    title="Reopen Trip"
                  >
                    <RotateCcw size={14} />
                    Reopen
                  </button>
                )}
                {trip.status === 'pod_pending' && (
                  <button
                    onClick={() => setPodModalTrip(trip)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors"
                    title="Upload POD"
                  >
                    <Upload size={14} />
                    Upload POD
                  </button>
                )}
                <button
                  onClick={() => generateLRPDF(trip, company)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Print Lorry Receipt"
                >
                  <FileText size={14} />
                  LR
                </button>
                {canEditTrips && trip.status !== 'cancelled' && (
                <button
                  onClick={() => setStatusDropdown(statusDropdown === trip.id ? null : trip.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Update Status
                  <ChevronDown size={14} />
                </button>
                )}
                {statusDropdown === trip.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1 min-w-[150px]">
                    {getNextStatuses(trip.status).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(trip.id, status)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 capitalize"
                      >
                        {status.replace(/_/g, ' ')}
                      </button>
                    ))}
                    {getNextStatuses(trip.status).length === 0 && (
                      <span className="px-3 py-2 text-sm text-slate-400 block">No further status</span>
                    )}
                  </div>
                )}
              </div>
            </div>


            {/* Route */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-slate-700">{trip.origin}</span>
              </div>
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">{trip.destination}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              </div>
            </div>

            {/* Details Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Truck size={14} className="text-slate-400" />
                <span>{trip.vehicle_reg}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <User size={14} className="text-slate-400" />
                <span>{trip.driver_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Package size={14} className="text-slate-400" />
                <span>{trip.material}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin size={14} className="text-slate-400" />
                <span>{trip.weight_tons} tons</span>
              </div>
            </div>

            {/* Financial + Customer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xl font-bold text-slate-900">{formatCurrency(trip.total_amount)}</span>
                </div>
                <div className="text-sm text-slate-500">
                  Adv: {formatCurrency(trip.advance_amount)} | Bal: {formatCurrency(trip.balance_amount)}
                </div>
              </div>
              <span className="text-sm text-slate-600 font-medium">{trip.customer_name}</span>
            </div>
          </div>
        ))}

        {filteredTrips.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No trips found matching your criteria.
          </div>
        )}
      </div>

      {/* Driver Advance Summary */}
      <DriverAdvanceTracker />

      {/* Modals */}
      {showModal && <NewTripModal onClose={() => setShowModal(false)} />}
      {podModalTrip && <PODUploadModal trip={podModalTrip} onClose={() => setPodModalTrip(null)} />}
      {detailTrip && <TripDetailModal trip={detailTrip} onClose={() => setDetailTrip(null)} />}
      {notifyTrip && <SendNotificationModal trip={notifyTrip.trip} statusChange={notifyTrip.status} onClose={() => setNotifyTrip(null)} />}
      {cancelModalTrip && <CancelTripModal trip={cancelModalTrip} onConfirm={handleCancelTrip} onClose={() => setCancelModalTrip(null)} />}
      {reopenModalTrip && <ReopenTripModal trip={reopenModalTrip} onConfirm={handleReopenTrip} onClose={() => setReopenModalTrip(null)} />}
      {editModalTrip && <EditTripModal trip={editModalTrip} onClose={() => { setEditModalTrip(null); refreshTrips(); }} />}
    </div>
  );
}


function PODUploadModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { update: updateTrip } = useModuleData<any>('trips');
  const [receivedBy, setReceivedBy] = useState('');
  const [condition, setCondition] = useState<'good' | 'damaged' | 'partial'>('good');
  const [remarks, setRemarks] = useState('');
  const [filename, setFilename] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFilename(e.target.files[0].name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    updateTrip(trip.id, {
      pod_url: filename || 'pod_uploaded.jpg',
      pod_date: today,
      pod_details: {
        received_by: receivedBy,
        condition,
        remarks,
        received_date: today,
        image_url: filename || undefined,
      },
      status: 'completed',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Upload POD - {trip.trip_number}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Received By</label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              required
              placeholder="Name of person who received goods"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>


          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'good' | 'damaged' | 'partial')}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="good">Good</option>
              <option value="damaged">Damaged</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional remarks..."
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">POD Image (Simulated Upload)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 file:mr-3 file:px-3 file:py-1 file:border-0 file:rounded file:bg-blue-50 file:text-blue-600 file:font-medium file:text-sm"
            />
            {filename && <p className="text-xs text-green-600 mt-1">Selected: {filename}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg shadow-lg shadow-amber-500/25 hover:bg-amber-700">
              Submit POD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { company } = useStore();
  const { data: expenses } = useModuleData<any>('expenses');
  const { data: fuelEntries } = useModuleData<any>('fuel_entries');
  const { data: invoices } = useModuleData<any>('invoices');
  const { data: payments } = useModuleData<any>('payments');
  const { data: quotations } = useModuleData<any>('quotations');
  const { data: enquiries } = useModuleData<any>('enquiries');
  const currentIdx = STATUS_FLOW.indexOf(trip.status);

  // P0.1 — Trip-Level Profitability Calculation
  const tripExpenses = expenses.filter(e => e.trip_id === trip.id || e.vehicle_id === trip.vehicle_id);
  const tripFuel = fuelEntries.filter(f => f.vehicle_id === trip.vehicle_id);
  const fuelCostEstimate = trip.distance_km > 0 ? Math.round(trip.distance_km * 3.5 * 95 / 4.5) : 0; // ~3.5km/l at ₹95/l avg
  const tollEstimate = Math.round(trip.distance_km * 2.8); // ~₹2.8/km average toll
  const driverBata = tripExpenses.filter(e => e.category === 'driver_bata').reduce((s, e) => s + e.amount, 0) || Math.round(trip.distance_km * 1.5);
  const loadingUnloading = tripExpenses.filter(e => e.category === 'loading' || e.category === 'unloading').reduce((s, e) => s + e.amount, 0) || 2000;
  const repairCost = tripExpenses.filter(e => e.category === 'repair').reduce((s, e) => s + e.amount, 0);
  const miscExpenses = tripExpenses.filter(e => e.category === 'misc' || e.category === 'office').reduce((s, e) => s + e.amount, 0);
  
  const totalCost = fuelCostEstimate + tollEstimate + driverBata + loadingUnloading + repairCost + trip.detention_charges + miscExpenses;
  const totalRevenue = trip.freight_amount + trip.detention_charges + trip.other_charges;
  const tripProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? Math.round((tripProfit / totalRevenue) * 100) : 0;

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
                  <div className="flex justify-between"><span className="text-slate-600">Fuel (est.)</span><span className="font-medium text-red-700">{formatCurrency(fuelCostEstimate)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Toll (est.)</span><span className="font-medium text-red-700">{formatCurrency(tollEstimate)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Driver Bata</span><span className="font-medium text-red-700">{formatCurrency(driverBata)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Loading/Unloading</span><span className="font-medium text-red-700">{formatCurrency(loadingUnloading)}</span></div>
                  {repairCost > 0 && <div className="flex justify-between"><span className="text-slate-600">Repairs</span><span className="font-medium text-red-700">{formatCurrency(repairCost)}</span></div>}
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


function NewTripModal({ onClose }: { onClose: () => void }) {
  const { data: customers } = useModuleData<any>('customers');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');
  const { data: quotations } = useModuleData<any>('quotations');
  const { create: addTrip } = useModuleData<any>('trips');
  const availableVehicles = vehicles;
  const availableDrivers = drivers;

  // Simulated indents (from store would be better but indents are local to IndentModule currently)
  const pendingQuotations = quotations.filter(q => q.status === 'sent' || q.status === 'draft' || q.status === 'accepted');

  const [form, setForm] = useState({
    source_type: '' as '' | 'quotation' | 'manual',
    quotation_id: '',
    customer_id: '',
    vehicle_id: '',
    driver_id: '',
    origin: '',
    destination: '',
    distance_km: '',
    material: '',
    weight_tons: '',
    eway_bill: '',
    freight_amount: '',
    advance_amount: '',
    booking_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Auto-fill from quotation
  const handleQuotationFill = (quotId: string) => {
    const quot = quotations.find(q => q.id === quotId);
    if (quot) {
      const customer = customers.find(c => c.id === quot.customer_id);
      setForm({
        ...form,
        source_type: 'quotation',
        quotation_id: quotId,
        customer_id: quot.customer_id,
        origin: quot.origin,
        destination: quot.destination,
        material: quot.material,
        weight_tons: String(quot.weight_tons),
        freight_amount: String(quot.rate),
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === form.customer_id);
    const vehicle = vehicles.find((v) => v.id === form.vehicle_id);
    const driver = drivers.find((d) => d.id === form.driver_id);

    if (!customer || !vehicle || !driver) return;

    const freight = Number(form.freight_amount) || 0;
    const advance = Number(form.advance_amount) || 0;

    const trip: Trip = {
      id: generateId(),
      
      trip_number: generateTripNumber(),
      lr_number: generateLRNumber(),
      eway_bill: form.eway_bill || ('EWB-' + Date.now().toString().slice(-9)),
      customer_id: customer.id,
      customer_name: customer.name,
      vehicle_id: vehicle.id,
      vehicle_reg: vehicle.reg_number,
      driver_id: driver.id,
      driver_name: driver.name,
      driver_phone: driver.phone,
      origin: form.origin,
      destination: form.destination,
      distance_km: Number(form.distance_km) || 0,
      material: form.material,
      weight_tons: Number(form.weight_tons) || 0,
      booking_date: form.booking_date,
      expected_delivery: form.expected_delivery || undefined,
      freight_amount: freight,
      advance_amount: advance,
      balance_amount: freight - advance,
      detention_charges: 0,
      other_charges: 0,
      total_amount: freight,
      status: 'booked',
      created_at: new Date().toISOString(),
    };

    addTrip(trip);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">New Trip</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Source Selection — Link to Quotation */}
          <div className="p-3 rounded-xl border border-dashed" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--accent)' }}>📋 Create from Quotation (auto-fills details)</label>
            <select value={form.quotation_id} onChange={(e) => handleQuotationFill(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm">
              <option value="">— Manual Entry (no quotation) —</option>
              {pendingQuotations.map(q => (
                <option key={q.id} value={q.id}>{q.quotation_number} — {q.customer_name} ({q.origin} → {q.destination}) ₹{q.rate.toLocaleString()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select name="customer_id" value={form.customer_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select customer</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select vehicle</option>
                {availableVehicles.map((v) => (<option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type}) {v.status !== 'available' ? `— ${v.status}` : ''}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
              <select name="driver_id" value={form.driver_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select driver</option>
                {availableDrivers.map((d) => (<option key={d.id} value={d.id}>{d.name} {d.status !== 'available' ? `— ${d.status}` : ''}</option>))}
              </select>
            </div>
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
              <input type="text" name="origin" value={form.origin} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input type="text" name="destination" value={form.destination} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance (km)</label>
              <input type="number" name="distance_km" value={form.distance_km} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              {form.origin && form.destination && estimateDistance(form.origin, form.destination) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const km = estimateDistance(form.origin, form.destination);
                    if (km > 0) setForm({ ...form, distance_km: String(km) });
                  }}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Auto-calculate: ~{estimateDistance(form.origin, form.destination)} km
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
              <input type="text" name="material" value={form.material} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (tons)</label>
              <input type="number" name="weight_tons" value={form.weight_tons} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-Way Bill Number (auto-generated if empty)</label>
            <input type="text" name="eway_bill" value={form.eway_bill} onChange={handleChange} placeholder="EWB-XXXXXXXXX" className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Freight Amount</label>
              <input type="number" name="freight_amount" value={form.freight_amount} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Advance Amount</label>
              <input type="number" name="advance_amount" value={form.advance_amount} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Booking Date</label>
              <input type="date" name="booking_date" value={form.booking_date} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
              <input type="date" name="expected_delivery" value={form.expected_delivery} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            {/* P0.5 Pre-dispatch margin alert */}
            {Number(form.freight_amount) > 0 && Number(form.distance_km) > 0 && (() => {
              const freight = Number(form.freight_amount);
              const estCost = Math.round(Number(form.distance_km) * 3.5 * 95 / 4.5) + Math.round(Number(form.distance_km) * 2.8) + Math.round(Number(form.distance_km) * 1.5) + 2000;
              const margin = Math.round((freight - estCost) / freight * 100);
              if (margin < 15) return (
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  <span className="text-red-500 font-bold">⚠️</span>
                  <span>Low margin alert: ~{margin}% (est. cost ₹{estCost.toLocaleString()} vs freight ₹{freight.toLocaleString()}). Min recommended: 15%</span>
                </div>
              );
              return null;
            })()}
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700">
              Create Trip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



/** Modal for cancelling a trip — requires a reason */
function CancelTripModal({
  trip,
  onConfirm,
  onClose,
}: {
  trip: Trip;
  onConfirm: (tripId: string, reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(trip.id, reason.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-red-700">Cancel Trip</h2>
            <p className="text-sm text-slate-500 mt-0.5">{trip.trip_number} — {trip.origin} → {trip.destination}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <strong>Warning:</strong> Cancelling this trip will mark it as cancelled. The vehicle and driver will become available again. This action can be reversed by reopening the trip.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="e.g., Customer cancelled order, Vehicle breakdown, Route unavailable..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Keep Trip
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg shadow-lg shadow-red-500/25 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Ban size={14} />
                  Confirm Cancellation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/** Modal for editing trip details (route, financial, vehicle, driver) */
function EditTripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { organizationId } = useOrganization();
  const { data: customers } = useModuleData<any>('customers');
  const { data: vehicles } = useModuleData<any>('vehicles');
  const { data: drivers } = useModuleData<any>('drivers');

  // Filter: show available + currently assigned vehicle/driver; exclude inactive
  const availableVehicles = vehicles.filter((v: any) =>
    v.status === 'available' || v.status === 'on_trip' || v.id === trip.vehicle_id
  );
  const availableDrivers = drivers.filter((d: any) =>
    d.status === 'available' || d.status === 'on_trip' || d.id === trip.driver_id
  );

  const [form, setForm] = useState({
    customer_id: trip.customer_id || '',
    vehicle_id: trip.vehicle_id || '',
    driver_id: trip.driver_id || '',
    origin: trip.origin || '',
    destination: trip.destination || '',
    distance_km: String(trip.distance_km || 0),
    material: trip.material || '',
    weight_tons: String(trip.weight_tons || 0),
    eway_bill: trip.eway_bill || '',
    freight_amount: String(trip.freight_amount || 0),
    advance_amount: String(trip.advance_amount || 0),
    detention_charges: String(trip.detention_charges || 0),
    other_charges: String(trip.other_charges || 0),
    expected_delivery: trip.expected_delivery || '',
    remarks: trip.remarks || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    setSaving(true);

    const customer = customers.find((c: any) => c.id === form.customer_id);
    const vehicle = vehicles.find((v: any) => v.id === form.vehicle_id);
    const driver = drivers.find((d: any) => d.id === form.driver_id);

    // Build updates object for the RPC (only changed fields)
    const updates: Record<string, any> = {
      customer_id: form.customer_id || null,
      customer_name: customer?.name || trip.customer_name,
      vehicle_id: form.vehicle_id || null,
      vehicle_reg: vehicle?.reg_number || trip.vehicle_reg,
      driver_id: form.driver_id || null,
      driver_name: driver?.name || trip.driver_name,
      driver_phone: driver?.phone || trip.driver_phone,
      origin: form.origin,
      destination: form.destination,
      distance_km: Number(form.distance_km) || 0,
      material: form.material,
      weight_tons: Number(form.weight_tons) || 0,
      eway_bill: form.eway_bill || null,
      freight_amount: Number(form.freight_amount) || 0,
      advance_amount: Number(form.advance_amount) || 0,
      detention_charges: Number(form.detention_charges) || 0,
      other_charges: Number(form.other_charges) || 0,
      expected_delivery: form.expected_delivery || null,
      remarks: form.remarks || null,
    };

    const { error } = await tripRepository.editDetails(organizationId, trip.id, updates);
    setSaving(false);
    if (error) {
      showToast('error', `Update failed: ${error}`);
    } else {
      showToast('success', `Trip ${trip.trip_number} updated`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit Trip</h2>
            <p className="text-sm text-slate-500">{trip.trip_number} — Status: {trip.status.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select name="customer_id" value={form.customer_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">Select customer</option>
              {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>

          {/* Vehicle & Driver */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle</label>
              <select name="vehicle_id" value={form.vehicle_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select vehicle</option>
                {availableVehicles.map((v: any) => (<option key={v.id} value={v.id}>{v.reg_number} ({v.vehicle_type}) {v.id === trip.vehicle_id ? '(current)' : v.status !== 'available' ? `— ${v.status}` : ''}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
              <select name="driver_id" value={form.driver_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select driver</option>
                {availableDrivers.map((d: any) => (<option key={d.id} value={d.id}>{d.name} {d.id === trip.driver_id ? '(current)' : d.status !== 'available' ? `— ${d.status}` : ''}</option>))}
              </select>
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Origin</label>
              <input type="text" name="origin" value={form.origin} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input type="text" name="destination" value={form.destination} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Distance, Material, Weight */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance (km)</label>
              <input type="number" name="distance_km" value={form.distance_km} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material</label>
              <input type="text" name="material" value={form.material} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Weight (tons)</label>
              <input type="number" name="weight_tons" value={form.weight_tons} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* E-Way Bill */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-Way Bill</label>
            <input type="text" name="eway_bill" value={form.eway_bill} onChange={handleChange} placeholder="EWB-XXXXXXXXX" className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Freight Amount</label>
              <input type="number" name="freight_amount" value={form.freight_amount} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Advance Amount</label>
              <input type="number" name="advance_amount" value={form.advance_amount} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Detention Charges</label>
              <input type="number" name="detention_charges" value={form.detention_charges} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Other Charges</label>
              <input type="number" name="other_charges" value={form.other_charges} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          {/* Expected Delivery */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
            <input type="date" name="expected_delivery" value={form.expected_delivery} onChange={handleChange} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={2} placeholder="Any notes..." className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit3 size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


/** Modal for reopening a cancelled trip — requires a reason */
function ReopenTripModal({
  trip,
  onConfirm,
  onClose,
}: {
  trip: Trip;
  onConfirm: (tripId: string, reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(trip.id, reason.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-amber-700">Reopen Trip</h2>
            <p className="text-sm text-slate-500 mt-0.5">{trip.trip_number} — {trip.origin} → {trip.destination}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <strong>Note:</strong> Reopening will reset this trip to <strong>booked</strong> status. Vehicle and driver assignments will be preserved but may need re-validation if they are no longer available.
          </div>
          {trip.cancellation_reason && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
              <strong>Original cancellation reason:</strong> {trip.cancellation_reason}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reopen Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              placeholder="e.g., Customer confirmed order again, Vehicle repaired, Issue resolved..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Keep Cancelled
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg shadow-lg shadow-amber-500/25 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Reopening...
                </>
              ) : (
                <>
                  <RotateCcw size={14} />
                  Confirm Reopen
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
