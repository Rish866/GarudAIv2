import React, { useState } from 'react';
import { useStore, generateId } from '../../../store/useStore';
import type { Trip, TripStatus } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, classNames, generateTripNumber, generateLRNumber } from '../../../lib/utils';
import { generateLRPDF, generateTripReportPDF } from '../../../lib/pdf';
import { Plus, Search, MapPin, Truck, User, Package, ChevronDown, X, FileText, Download } from 'lucide-react';

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
] as const;

function getNextStatuses(current: TripStatus): TripStatus[] {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return [];
  return STATUS_FLOW.slice(idx + 1, idx + 3);
}

export default function TripsModule() {
  const { trips, customers, vehicles, drivers, company, addTrip, updateTripStatus } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null);

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

  const handleStatusUpdate = (tripId: string, newStatus: TripStatus) => {
    updateTripStatus(tripId, newStatus);
    setStatusDropdown(null);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip Management</h1>
          <p className="text-sm text-slate-500 mt-1">{trips.length} total trips</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus size={18} />
          New Trip
        </button>
        <button
          onClick={() => generateTripReportPDF(filteredTrips, company, 'Trip Report')}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
        >
          <Download size={18} />
          Export PDF
        </button>
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
                  onClick={() => generateLRPDF(trip, useStore.getState().company)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Print Lorry Receipt"
                >
                  <FileText size={14} />
                  LR
                </button>
                <button
                  onClick={() => setStatusDropdown(statusDropdown === trip.id ? null : trip.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Update Status
                  <ChevronDown size={14} />
                </button>
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

      {/* New Trip Modal */}
      {showModal && <NewTripModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function NewTripModal({ onClose }: { onClose: () => void }) {
  const { customers, vehicles, drivers, addTrip } = useStore();
  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const availableDrivers = drivers.filter((d) => d.status === 'available');

  const [form, setForm] = useState({
    customer_id: '',
    vehicle_id: '',
    driver_id: '',
    origin: '',
    destination: '',
    distance_km: '',
    material: '',
    weight_tons: '',
    freight_amount: '',
    advance_amount: '',
    booking_date: new Date().toISOString().split('T')[0],
    expected_delivery: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
      company_id: 'comp_garud_001',
      trip_number: generateTripNumber(),
      lr_number: generateLRNumber(),
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
                {availableVehicles.map((v) => (<option key={v.id} value={v.id}>{v.reg_number}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Driver</label>
              <select name="driver_id" value={form.driver_id} onChange={handleChange} required className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select driver</option>
                {availableDrivers.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
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
