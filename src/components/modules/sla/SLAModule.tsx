import { Clock, AlertTriangle, CheckCircle, TrendingDown, Target, ArrowRight } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { formatDate, classNames } from '../../../lib/utils';

type SLAStatus = 'on_track' | 'at_risk' | 'breached';

function getSLAStatus(trip: { status: string; expected_delivery?: string; actual_delivery?: string }): SLAStatus {
  if (!trip.expected_delivery) return 'on_track';

  const now = new Date();
  const expected = new Date(trip.expected_delivery);

  if (trip.actual_delivery) {
    const actual = new Date(trip.actual_delivery);
    return actual > expected ? 'breached' : 'on_track';
  }

  if (trip.status === 'completed' || trip.status === 'billed' || trip.status === 'settled') {
    return 'on_track';
  }

  const hoursRemaining = (expected.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursRemaining < 0) return 'breached';
  if (hoursRemaining < 4) return 'at_risk';
  return 'on_track';
}

function getTimeRemaining(expectedDelivery: string): string {
  const now = new Date();
  const expected = new Date(expectedDelivery);
  const diffMs = expected.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 0) {
    return `${Math.abs(diffHours)}h overdue`;
  }
  if (diffHours < 24) {
    return `${diffHours}h remaining`;
  }
  const days = Math.floor(diffHours / 24);
  const hrs = diffHours % 24;
  return `${days}d ${hrs}h remaining`;
}

function getSLABadge(status: SLAStatus) {
  switch (status) {
    case 'on_track':
      return <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">On Track</span>;
    case 'at_risk':
      return <span className="px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-800">At Risk</span>;
    case 'breached':
      return <span className="px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-800">Breached</span>;
  }
}

export default function SLAModule() {
  const { trips } = useStore();

  const activeTrips = trips.filter((t) =>
    ['in_transit', 'loading', 'assigned', 'booked'].includes(t.status) && t.expected_delivery
  );

  const completedTrips = trips.filter((t) =>
    ['completed', 'billed', 'settled'].includes(t.status) && t.expected_delivery
  );

  const breachedCompleted = completedTrips.filter((t) => {
    if (!t.actual_delivery || !t.expected_delivery) return false;
    return new Date(t.actual_delivery) > new Date(t.expected_delivery);
  });

  const onTimeCompleted = completedTrips.filter((t) => {
    if (!t.actual_delivery || !t.expected_delivery) return false;
    return new Date(t.actual_delivery) <= new Date(t.expected_delivery);
  });

  const onTimePercent = completedTrips.length > 0
    ? Math.round((onTimeCompleted.length / completedTrips.length) * 100)
    : 100;

  const activeSLAStatuses = activeTrips.map((t) => getSLAStatus(t));
  const atRiskCount = activeSLAStatuses.filter((s) => s === 'at_risk').length;
  const breachedCount = activeSLAStatuses.filter((s) => s === 'breached').length;
  const totalDelayed = breachedCompleted.length + breachedCount;

  const avgDelay = breachedCompleted.length > 0
    ? Math.round(
        breachedCompleted.reduce((sum, t) => {
          const actual = new Date(t.actual_delivery!);
          const expected = new Date(t.expected_delivery!);
          return sum + (actual.getTime() - expected.getTime()) / (1000 * 60 * 60);
        }, 0) / breachedCompleted.length
      )
    : 0;

  const breachRate = trips.length > 0
    ? ((totalDelayed / trips.length) * 100).toFixed(1)
    : '0.0';

  const summaryCards = [
    { label: 'On-Time Deliveries', value: `${onTimePercent}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Delayed Trips', value: totalDelayed.toString(), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Avg Delay', value: `${avgDelay}h`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'SLA Breach Rate', value: `${breachRate}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SLA Monitoring</h1>
        <p className="text-slate-500 mt-1">Track delivery targets and performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              </div>
              <div className={classNames('w-10 h-10 rounded-xl flex items-center justify-center', card.bg)}>
                <card.icon className={classNames('w-5 h-5', card.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active SLA Targets Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Active SLA Targets</h2>
        {activeTrips.length === 0 ? (
          <p className="text-slate-500 text-sm">No active trips with SLA targets.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Trip #</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Customer</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Route</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Promised Delivery</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">Time Remaining</th>
                  <th className="text-left py-3 px-2 font-medium text-slate-600">SLA Status</th>
                </tr>
              </thead>
              <tbody>
                {activeTrips.map((trip) => {
                  const slaStatus = getSLAStatus(trip);
                  return (
                    <tr key={trip.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 font-medium text-slate-900">{trip.trip_number}</td>
                      <td className="py-3 px-2 text-slate-700">{trip.customer_name}</td>
                      <td className="py-3 px-2 text-slate-700">
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[100px]">{trip.origin.split(',')[0]}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[100px]">{trip.destination.split(',')[0]}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-700">{formatDate(trip.expected_delivery!)}</td>
                      <td className="py-3 px-2">
                        <span className="px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-800">
                          {trip.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={classNames(
                          'text-xs font-medium',
                          slaStatus === 'on_track' ? 'text-green-600' : slaStatus === 'at_risk' ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          {getTimeRemaining(trip.expected_delivery!)}
                        </span>
                      </td>
                      <td className="py-3 px-2">{getSLABadge(slaStatus)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Breach History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Breach History
          </div>
        </h2>
        {breachedCompleted.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-500">No SLA breaches found. Great performance!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {breachedCompleted.map((trip) => {
              const actual = new Date(trip.actual_delivery!);
              const expected = new Date(trip.expected_delivery!);
              const delayHours = Math.round((actual.getTime() - expected.getTime()) / (1000 * 60 * 60));
              return (
                <div key={trip.id} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-medium text-slate-900">{trip.trip_number} - {trip.customer_name}</p>
                    <p className="text-sm text-slate-600 mt-1">
                      {trip.origin.split(',')[0]} → {trip.destination.split(',')[0]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-700">Delayed by {delayHours}h</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Expected: {formatDate(trip.expected_delivery!)} | Actual: {formatDate(trip.actual_delivery!)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
