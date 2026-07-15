import { useModuleData } from '../../../hooks/useModuleData';
import { formatCurrency } from '../../../lib/utils';

/**
 * DriverAdvanceTracker — Shows driver advance/settlement summary.
 * 
 * Data sources:
 * - trips: for advance_amount and freight totals
 * - driver_settlements: for real persistent settlement status
 * 
 * Displays which drivers have unsettled advances based on:
 * 1. Trip advance amounts given
 * 2. driver_settlements entity status (draft/submitted/approved/settled)
 */
export default function DriverAdvanceTracker() {
  const { data: trips } = useModuleData<any>('trips');
  const { data: settlements } = useModuleData<any>('driver_settlements');
  
  // Build settlement index by trip_id for quick lookup
  const settlementByTrip: Record<string, { status: string; payable_amount: number; recoverable_amount: number }> = {};
  (settlements || []).forEach((s: any) => {
    if (s.status !== 'reversed') {
      settlementByTrip[s.trip_id] = { status: s.status, payable_amount: s.payable_amount || 0, recoverable_amount: s.recoverable_amount || 0 };
    }
  });

  // Calculate advances by driver, enriched with settlement data
  const driverAdvances: Record<string, {
    name: string;
    total_advance: number;
    total_freight: number;
    trips_count: number;
    unsettled_advance: number;
    settled_count: number;
    pending_count: number;
    total_payable: number;
    total_recoverable: number;
  }> = {};
  
  trips.forEach((trip: any) => {
    if (!trip.driver_name) return;
    if (!driverAdvances[trip.driver_name]) {
      driverAdvances[trip.driver_name] = {
        name: trip.driver_name,
        total_advance: 0,
        total_freight: 0,
        trips_count: 0,
        unsettled_advance: 0,
        settled_count: 0,
        pending_count: 0,
        total_payable: 0,
        total_recoverable: 0,
      };
    }
    const d = driverAdvances[trip.driver_name];
    d.total_advance += trip.advance_amount || 0;
    d.total_freight += trip.freight_amount || 0;
    d.trips_count++;

    const settlement = settlementByTrip[trip.id];
    if (settlement) {
      if (['approved', 'settled'].includes(settlement.status)) {
        d.settled_count++;
      } else {
        d.pending_count++;
      }
      d.total_payable += settlement.payable_amount;
      d.total_recoverable += settlement.recoverable_amount;
    } else if (!['settled', 'completed', 'billed'].includes(trip.status)) {
      d.unsettled_advance += trip.advance_amount || 0;
      d.pending_count++;
    }
  });

  const driverList = Object.values(driverAdvances).sort((a, b) => b.unsettled_advance - a.unsettled_advance);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Driver Settlement Tracker</h3>
      <div className="space-y-3">
        {driverList.map(driver => (
          <div key={driver.name} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700 last:border-0">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{driver.name}</p>
              <p className="text-xs text-slate-500">
                {driver.trips_count} trips • {driver.settled_count} settled
                {driver.pending_count > 0 && <span className="text-amber-600"> • {driver.pending_count} pending</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(driver.total_advance)}</p>
              {driver.unsettled_advance > 0 && (
                <p className="text-xs text-amber-600 font-medium">Unsettled: {formatCurrency(driver.unsettled_advance)}</p>
              )}
              {driver.total_payable > 0 && (
                <p className="text-xs text-green-600 font-medium">Payable: {formatCurrency(driver.total_payable)}</p>
              )}
              {driver.total_recoverable > 0 && (
                <p className="text-xs text-red-600 font-medium">Recoverable: {formatCurrency(driver.total_recoverable)}</p>
              )}
            </div>
          </div>
        ))}
        {driverList.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">No advance data yet</p>
        )}
      </div>
    </div>
  );
}
