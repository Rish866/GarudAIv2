import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import type { Trip, TripStatus } from '../../../types';
import { formatCurrency, formatDate, getStatusColor, classNames } from '../../../lib/utils';
import { Search, MapPin, Truck, Phone, Package, ChevronDown, ChevronUp, Navigation, Clock, CheckCircle2 } from 'lucide-react';

const ALL_STATUSES: TripStatus[] = [
  'booked', 'assigned', 'loading', 'in_transit', 'reached', 'unloading', 'pod_pending', 'completed', 'billed', 'settled'
];

const STATUS_LABELS: Record<TripStatus, string> = {
  booked: 'Booked',
  assigned: 'Assigned',
  loading: 'Loading',
  in_transit: 'In Transit',
  reached: 'Reached',
  unloading: 'Unloading',
  pod_pending: 'POD Pending',
  completed: 'Completed',
  billed: 'Billed',
  settled: 'Settled',
  cancelled: 'Cancelled',
};


function StatusProgressBar({ currentStatus }: { currentStatus: TripStatus }) {
  const currentIdx = ALL_STATUSES.indexOf(currentStatus);

  return (
    <div className="flex items-center w-full gap-0.5">
      {ALL_STATUSES.map((status, idx) => {
        const isCompleted = idx <= currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={status} className="flex-1 flex flex-col items-center">
            <div
              className={classNames(
                'h-2 w-full rounded-full transition-colors',
                isCompleted ? (isCurrent ? 'bg-blue-500' : 'bg-green-400') : 'bg-slate-200'
              )}
              title={STATUS_LABELS[status]}
            />
            {(idx === 0 || isCurrent || idx === ALL_STATUSES.length - 1) && (
              <span className={classNames(
                'text-[9px] mt-1 whitespace-nowrap',
                isCurrent ? 'text-blue-600 font-semibold' : 'text-slate-400'
              )}>
                {STATUS_LABELS[status]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}


function TrackingCard({ trip }: { trip: Trip; key?: React.Key }) {
  const { vehicles } = useStore();
  const vehicle = vehicles.find(v => v.id === trip.vehicle_id);
  const lastLocation = vehicle?.last_location || null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-slate-900">{trip.trip_number}</span>
          <span className="text-sm text-slate-500">LR: {trip.lr_number}</span>
        </div>
        <span className={classNames('px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(trip.status))}>
          {trip.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <StatusProgressBar currentStatus={trip.status} />
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

      {/* Estimated Delivery */}
      {trip.expected_delivery && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
          <Clock size={14} className="text-slate-400" />
          <span>Est. Delivery: <span className="font-medium">{formatDate(trip.expected_delivery)}</span></span>
        </div>
      )}


      {/* Vehicle, Driver, Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Truck size={14} className="text-slate-400" />
          <span>{trip.vehicle_reg}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Navigation size={14} className="text-slate-400" />
          <span>{trip.driver_name}</span>
        </div>
        <a
          href={`tel:${trip.driver_phone}`}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <Phone size={14} />
          <span>{trip.driver_phone}</span>
        </a>
      </div>

      {/* Current Location */}
      {lastLocation && (
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-3 bg-blue-50 px-3 py-2 rounded-lg">
          <MapPin size={14} className="text-blue-500" />
          <span className="text-blue-700">Current: <span className="font-medium">{lastLocation}</span></span>
        </div>
      )}

      {/* Material + Weight */}
      <div className="flex items-center gap-4 text-sm text-slate-500 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Package size={13} className="text-slate-400" />
          <span>{trip.material}</span>
        </div>
        <span>{trip.weight_tons} tons</span>
        <span>{trip.distance_km} km</span>
      </div>
    </div>
  );
}


export default function CustomerTrackingPortal() {
  const { trips } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const activeStatuses: TripStatus[] = ['in_transit', 'loading', 'pod_pending', 'booked', 'assigned', 'reached', 'unloading'];
  const completedStatuses: TripStatus[] = ['completed', 'billed', 'settled'];

  const allTrips = trips.filter((trip) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      trip.trip_number.toLowerCase().includes(q) ||
      trip.lr_number.toLowerCase().includes(q) ||
      trip.customer_name.toLowerCase().includes(q)
    );
  });

  const activeTrips = allTrips.filter(t => activeStatuses.includes(t.status));
  const completedTrips = allTrips.filter(t => completedStatuses.includes(t.status));

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Customer Shipment Tracking</h1>
        <p className="text-sm text-slate-500 mt-1">Track your shipments in real-time</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md mx-auto">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Trip # or LR #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm"
        />
      </div>


      {/* Active Shipments */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-blue-500" />
          Active Shipments
          <span className="text-sm font-normal text-slate-500">({activeTrips.length})</span>
        </h2>
        {activeTrips.length > 0 ? (
          <div className="space-y-4">
            {activeTrips.map((trip) => (
              <TrackingCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
            No active shipments found.
          </div>
        )}
      </div>

      {/* Completed Shipments */}
      <div>
        <button
          onClick={() => setShowCompleted(!showCompleted)}
          className="flex items-center gap-2 text-lg font-semibold text-slate-700 hover:text-slate-900 transition-colors"
        >
          {showCompleted ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          Completed Shipments
          <span className="text-sm font-normal text-slate-500">({completedTrips.length})</span>
        </button>
        {showCompleted && (
          <div className="mt-4 space-y-4">
            {completedTrips.length > 0 ? (
              completedTrips.map((trip) => (
                <TrackingCard key={trip.id} trip={trip} />
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl">
                No completed shipments found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
