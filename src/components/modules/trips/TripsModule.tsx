import React, { useState, useCallback, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { useModuleData } from '../../../hooks/useModuleData';
import { usePaginatedData } from '../../../hooks/usePaginatedData';
import type { PaginationFilter } from '../../../hooks/usePaginatedData';
import Pagination from '../../ui/Pagination';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useErpTransaction } from '../../../hooks/useErpTransaction';
import { tripRepository } from '../../../data/trips/tripRepository';
import { validateStatusTransition, validateVehicleForTrip, validateDriverForTrip, validateCustomerCredit, canGenerateInvoice, getValidNextStatuses } from '../../../lib/workflowRules';
import type { TripRecord } from '../../../lib/workflowRules';
import type { Trip, TripStatus, Invoice, Vehicle, Driver, Customer, Payment, Expense, FuelEntry, Enquiry, Quotation, AppNotification } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, classNames, generateTripNumber, generateInvoiceNumber } from '../../../lib/utils';
import { generateLRPDF, generateTripReportPDF } from '../../../lib/pdf';
import { exportTrips } from '../../../lib/excel';
import { estimateDistance } from '../../../lib/distance';
import { showToast } from '../../ui/Toast';
import { Plus, Search, MapPin, Truck, User, Package, ChevronDown, X, FileText, Download, Eye, Upload, Calendar, Phone, CreditCard, CheckCircle, Circle, Clock, Ban, RotateCcw, Edit3 } from 'lucide-react';
import DriverAdvanceTracker from './DriverAdvanceTracker';
import DriverSettlementPanel from './DriverSettlementPanel';
import SendNotificationModal from '../../ui/SendNotificationModal';
import BranchField from '../../ui/BranchField';
import PODUploadModal from './PODUploadModal';
import CancelTripModal from './CancelTripModal';
import ReopenTripModal from './ReopenTripModal';
import TripDetailModal from './TripDetailModal';
import NewTripModal from './NewTripModal';
import EditTripModal from './EditTripModal';

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
  const erpTx = useErpTransaction();

  // Server-side paginated trip data
  const {
    data: trips,
    totalCount,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    sortBy,
    sortDirection,
    setSort,
    filters,
    setFilters,
    loading: tripsLoading,
    error: tripsError,
    refresh: refreshTrips,
    hasNextPage,
    hasPrevPage,
  } = usePaginatedData<Trip>('trips', {
    defaultSort: 'created_at',
    defaultSortDirection: 'desc',
    defaultPageSize: 25,
  });

  // Supporting data (non-paginated — small reference tables)
  const { data: customers } = useModuleData<Customer>('customers');
  const { data: vehicles } = useModuleData<Vehicle>('vehicles');
  const { data: drivers } = useModuleData<Driver>('drivers');
  const { create: addNotification } = useModuleData<AppNotification>('notifications', { fetchOnMount: false });
  const { create: addTrip } = useModuleData<Trip>('trips', { fetchOnMount: false });

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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

  // ─── Filter application (server-side) ─────────────────────────────────────

  const applyFilters = useCallback((
    status?: string,
    search?: string,
    bookingFrom?: string,
    bookingTo?: string
  ) => {
    const newFilters: PaginationFilter = {};

    // Status filter
    if (status && status !== 'all') {
      newFilters.eq = { status };
    }

    // Search across trip_number, customer_name, vehicle_reg, driver_name, origin, destination
    if (search && search.trim()) {
      newFilters.search = {
        columns: ['trip_number', 'customer_name', 'vehicle_reg', 'driver_name', 'origin', 'destination'],
        query: search.trim(),
      };
    }

    // Date range on booking_date
    if (bookingFrom || bookingTo) {
      newFilters.dateRange = {
        column: 'booking_date',
        from: bookingFrom || undefined,
        to: bookingTo || undefined,
      };
    }

    setFilters(newFilters);
  }, [setFilters]);

  // Apply filters when any filter control changes
  const handleStatusFilter = (status: string) => {
    setActiveFilter(status);
    applyFilters(status, searchQuery, dateFrom, dateTo);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(activeFilter, query, dateFrom, dateTo);
  };

  const handleDateRange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    applyFilters(activeFilter, searchQuery, from, to);
  };

  // No client-side filtering — all done server-side via usePaginatedData


  const handleStatusUpdate = async (tripId: string, newStatus: TripStatus) => {
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    setStatusDropdown(null);

    if (!can('trips.update')) {
      showToast('error', 'Permission denied: you cannot update trip status.');
      return;
    }

    // Business rule validation before status transition
    const trip = trips.find((t) => t.id === tripId);
    if (trip) {
      const validation = validateStatusTransition(trip as unknown as TripRecord, newStatus, {
        canOverridePOD: can('approvals.action'),
      });

      if (!validation.allowed) {
        showToast('error', validation.errors[0]);
        return;
      }

      // Show warnings but allow transition
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(w => showToast('warning', w));
      }
    }

    const { error } = await tripRepository.transitionStatus(organizationId, tripId, newStatus);
    if (error) {
      showToast('error', `Status update failed: ${error}`);
      return;
    }

    // === ERP CASCADE: Update dependent modules based on new status ===
    const tripData = trips.find(t => t.id === tripId);
    
    // When trip is ASSIGNED: mark vehicle + driver as on_trip
    if (newStatus === 'assigned' && tripData?.vehicle_id && tripData?.driver_id) {
      await erpTx.assignTripResources(
        tripId,
        tripData.vehicle_id,
        tripData.driver_id,
        tripData.vehicle_reg || '',
        tripData.driver_name || '',
        tripData.driver_phone || ''
      );
    }

    // When trip is COMPLETED: release vehicle + driver
    if (newStatus === 'completed' || newStatus === 'settled') {
      await erpTx.completeTrip(tripId, new Date().toISOString().split('T')[0]);
    }

    showToast('success', `Status updated to ${newStatus.replace(/_/g, ' ')}`);
    await refreshTrips();

    // Trigger notification modal
    const foundTrip = trips.find(t => t.id === tripId);
    if (foundTrip) {
      setNotifyTrip({ trip: foundTrip, status: newStatus.replace(/_/g, ' ') });
    }

    // Auto-generate invoice when trip is completed (idempotent via invoice_trips)
    if (newStatus === 'completed') {
      const trip = trips.find(t => t.id === tripId);
      if (trip && organizationId) {
        const invoiceCheck = canGenerateInvoice(trip as unknown as TripRecord);
        if (!invoiceCheck.allowed) {
          showToast('warning', `Trip completed but invoice not generated: ${invoiceCheck.errors[0]}`);
        } else {
          const result = await erpTx.generateInvoiceFromTrip(tripId, generateInvoiceNumber());

          if (result && result.success) {
            await refreshTrips();
            const subtotal = (trip.freight_amount || 0) + (trip.detention_charges || 0) + (trip.other_charges || 0);
            const total_amount = subtotal + Math.round(subtotal * 0.05);
            showToast('success', `Invoice generated (${formatCurrency(total_amount)})`);
            addNotification({
              type: 'invoice_generated',
              title: 'Invoice Auto-Generated',
              message: `Invoice created for trip ${trip.trip_number} (${formatCurrency(total_amount)})`,
              link_module: 'billing',
              is_read: false,
              created_at: new Date().toISOString(),
            });
          } else {
            showToast('error', `Invoice creation failed: ${result?.error || 'Unknown error'}`);
          }
        }
      }
    }
  };


  const handleDuplicateTrip = async (trip: Trip) => {
    const newTrip: Partial<Trip> = {
      ...trip,
      trip_number: generateTripNumber(),
      lr_number: '', // Set by database RPC after trip creation
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
    const dupResult = await addTrip(newTrip);
    if (dupResult.data?.id && organizationId) {
      const { generateLR } = await import('../../../lib/tripEntities');
      await generateLR(organizationId, dupResult.data.id, {
        material: newTrip.material,
        declared_weight: newTrip.weight_tons,
      });
    }
  };

  const handleCancelTrip = async (tripId: string, reason: string) => {
    if (!organizationId) {
      showToast('error', 'No organization found');
      return;
    }
    if (!can('trips.delete')) {
      showToast('error', 'Permission denied: you cannot cancel trips.');
      return;
    }
    const result = await erpTx.cancelTrip(tripId, reason);
    if (result && !result.success) {
      showToast('error', `Cancel failed: ${result.error}`);
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
    if (!can('trips.update')) {
      showToast('error', 'Permission denied: you cannot reopen trips.');
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
          <p className="text-sm text-slate-500 mt-1">{totalCount.toLocaleString()} total trips</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => generateTripReportPDF(trips, company, 'Trip Report')}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Download size={18} />
            Export PDF
          </button>
          <button
            onClick={() => exportTrips(trips)}
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
            onClick={() => handleStatusFilter(tab.key)}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeFilter === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Date Range */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search trip number, customer, vehicle, driver, origin, destination..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateRange(e.target.value, dateTo)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="From"
          />
          <span className="text-slate-400 text-sm">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateRange(dateFrom, e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="To"
          />
        </div>
        {/* Sort */}
        <select
          value={`${sortBy}:${sortDirection}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split(':');
            setSort(col, dir as 'asc' | 'desc');
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="created_at:desc">Newest first</option>
          <option value="created_at:asc">Oldest first</option>
          <option value="booking_date:desc">Booking date (newest)</option>
          <option value="booking_date:asc">Booking date (oldest)</option>
          <option value="total_amount:desc">Amount (high to low)</option>
          <option value="total_amount:asc">Amount (low to high)</option>
        </select>
      </div>


      {/* Trip Cards */}
      <div className="space-y-4">
        {tripsLoading && trips.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            Loading trips...
          </div>
        )}
        {!tripsLoading && tripsError && (
          <div className="text-center py-12 text-red-500">
            Error: {tripsError}
          </div>
        )}
        {trips.map((trip) => (
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
                {/* Close Trip — only for completed/billed trips */}
                {(trip.status === 'completed' || trip.status === 'billed') && canEditTrips && (
                  <button
                    onClick={async () => {
                      if (!organizationId) return;
                      const { validateTripClosure, closeTrip } = await import('../../../lib/workflowService');
                      const { getTripPODState } = await import('../../../lib/tripEntities');
                      const podState = await getTripPODState(organizationId, trip.id);
                      const validation = validateTripClosure(trip, {
                        hasSettlement: true, // Will be checked server-side in closeTrip
                        settlementStatus: 'approved',
                        hasInvoice: trip.status === 'billed',
                        podStatus: podState.status,
                      });
                      if (!validation.valid) {
                        const msgs = validation.blockers.map(b => `• ${b.message}`).join('\n');
                        const overridable = validation.blockers.every(b => b.overridable);
                        if (overridable) {
                          const reason = prompt(`Trip has blockers:\n${msgs}\n\nProvide override reason to close anyway:`);
                          if (!reason) return;
                          const overrides = validation.blockers.map(b => ({ code: b.code, reason }));
                          const result = await closeTrip(organizationId, trip.id, overrides);
                          if (result.success) {
                            showToast('success', 'Trip closed with overrides');
                            await refreshTrips();
                          } else {
                            showToast('error', result.error || 'Closure failed');
                          }
                        } else {
                          showToast('error', `Cannot close trip:\n${validation.blockers[0].message}`);
                        }
                      } else {
                        const result = await closeTrip(organizationId, trip.id);
                        if (result.success) {
                          showToast('success', 'Trip closed successfully');
                          await refreshTrips();
                        } else {
                          showToast('error', result.error || 'Closure failed');
                        }
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="Close Trip"
                  >
                    <CheckCircle size={14} />
                    Close Trip
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

        {!tripsLoading && !tripsError && trips.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No trips found matching your criteria.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          loading={tripsLoading}
        />
      )}

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
