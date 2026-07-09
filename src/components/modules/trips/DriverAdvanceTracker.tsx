import { useStore } from '../../../store/useStore';
import { formatCurrency } from '../../../lib/utils';

export default function DriverAdvanceTracker() {
  const { trips } = useStore();
  
  // Calculate advances by driver
  const driverAdvances: Record<string, { name: string; total_advance: number; total_freight: number; trips_count: number; unsettled: number }> = {};
  
  trips.forEach(trip => {
    if (!trip.driver_name) return;
    if (!driverAdvances[trip.driver_name]) {
      driverAdvances[trip.driver_name] = { name: trip.driver_name, total_advance: 0, total_freight: 0, trips_count: 0, unsettled: 0 };
    }
    driverAdvances[trip.driver_name].total_advance += trip.advance_amount;
    driverAdvances[trip.driver_name].total_freight += trip.freight_amount;
    driverAdvances[trip.driver_name].trips_count++;
    if (!['settled', 'completed', 'billed'].includes(trip.status)) {
      driverAdvances[trip.driver_name].unsettled += trip.advance_amount;
    }
  });

  const driverList = Object.values(driverAdvances).sort((a, b) => b.unsettled - a.unsettled);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Driver Advance Tracker</h3>
      <div className="space-y-3">
        {driverList.map(driver => (
          <div key={driver.name} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-slate-800">{driver.name}</p>
              <p className="text-xs text-slate-500">{driver.trips_count} trips</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(driver.total_advance)}</p>
              {driver.unsettled > 0 && (
                <p className="text-xs text-amber-600 font-medium">Unsettled: {formatCurrency(driver.unsettled)}</p>
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
