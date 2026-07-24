// ============================================================
// MULTI-POINT TRIP ENGINE
//
// Real logistics trips are rarely A→B. Common patterns:
// - Multiple loading points (hub collection)
// - Multiple unloading points (distribution)
// - Both (consolidation + distribution)
//
// This module manages trip stops (waypoints) for:
// 1. Route planning (ordered sequence of loading/unloading points)
// 2. Status tracking per stop (arrived, loading/unloading, departed)
// 3. Detention calculation per stop
// 4. Total distance calculation across segments
// 5. ETA computation for remaining stops
// ============================================================

export type StopType = 'loading' | 'unloading' | 'transit_hub' | 'fuel_stop' | 'rest_stop';
export type StopStatus = 'pending' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'skipped';

export interface TripStop {
  id: string;
  trip_id: string;
  /** Sequence number (1-based, determines order) */
  sequence: number;
  type: StopType;
  /** Location name */
  location: string;
  /** Full address */
  address?: string;
  /** GPS coordinates */
  lat?: number;
  lng?: number;
  /** Distance from previous stop (km) */
  distance_from_prev_km: number;
  /** Planned arrival time */
  planned_arrival?: string;
  /** Actual arrival time */
  actual_arrival?: string;
  /** Actual departure time */
  actual_departure?: string;
  /** Status of this stop */
  status: StopStatus;
  /** Material/goods at this stop */
  material?: string;
  /** Weight loaded/unloaded at this stop (tons) */
  weight_tons: number;
  /** Number of packages */
  packages?: number;
  /** Contact person at this stop */
  contact_name?: string;
  contact_phone?: string;
  /** Notes/instructions */
  remarks?: string;
  /** Detention applicable at this stop */
  detention_hours?: number;
  detention_amount?: number;
}

export interface MultiPointTripSummary {
  /** Total number of stops */
  total_stops: number;
  /** Stops completed */
  completed_stops: number;
  /** Total loading points */
  loading_points: number;
  /** Total unloading points */
  unloading_points: number;
  /** Total planned distance across all segments */
  total_distance_km: number;
  /** Total weight across all stops */
  total_weight_tons: number;
  /** Total detention charges across all stops */
  total_detention: number;
  /** Current stop (first non-completed) */
  current_stop?: TripStop;
  /** Progress percentage */
  progress_percent: number;
}

/**
 * Calculate summary metrics for a multi-point trip.
 */
export function calculateTripSummary(stops: TripStop[]): MultiPointTripSummary {
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const completedStops = sorted.filter(s => s.status === 'completed').length;
  const loadingPoints = sorted.filter(s => s.type === 'loading').length;
  const unloadingPoints = sorted.filter(s => s.type === 'unloading').length;
  const totalDistance = sorted.reduce((sum, s) => sum + (s.distance_from_prev_km || 0), 0);
  const totalWeight = sorted.reduce((sum, s) => sum + (s.weight_tons || 0), 0);
  const totalDetention = sorted.reduce((sum, s) => sum + (s.detention_amount || 0), 0);
  const currentStop = sorted.find(s => s.status !== 'completed' && s.status !== 'skipped');

  return {
    total_stops: sorted.length,
    completed_stops: completedStops,
    loading_points: loadingPoints,
    unloading_points: unloadingPoints,
    total_distance_km: totalDistance,
    total_weight_tons: totalWeight,
    total_detention: totalDetention,
    current_stop: currentStop,
    progress_percent: sorted.length > 0 ? Math.round((completedStops / sorted.length) * 100) : 0,
  };
}

/**
 * Get the next valid status transitions for a stop.
 */
export function getNextStopStatuses(current: StopStatus): StopStatus[] {
  switch (current) {
    case 'pending': return ['en_route', 'skipped'];
    case 'en_route': return ['arrived'];
    case 'arrived': return ['in_progress'];
    case 'in_progress': return ['completed'];
    case 'completed': return []; // Terminal
    case 'skipped': return []; // Terminal
    default: return [];
  }
}

/**
 * Validate stop sequence for a trip.
 * Rules:
 * - Must have at least 1 loading + 1 unloading point
 * - Loading points should come before unloading (warning, not error)
 * - Sequence numbers must be contiguous (1, 2, 3, ...)
 */
export function validateStopSequence(stops: TripStop[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (stops.length === 0) {
    errors.push('At least one loading and one unloading point is required');
    return { valid: false, errors, warnings };
  }

  const loadingStops = stops.filter(s => s.type === 'loading');
  const unloadingStops = stops.filter(s => s.type === 'unloading');

  if (loadingStops.length === 0) {
    errors.push('At least one loading point is required');
  }
  if (unloadingStops.length === 0) {
    errors.push('At least one unloading point is required');
  }

  // Check sequence is contiguous
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].sequence !== i + 1) {
      errors.push(`Stop sequence gap at position ${i + 1}`);
      break;
    }
  }

  // Warning: loading after unloading (unusual but not invalid for distribution trips)
  if (loadingStops.length > 0 && unloadingStops.length > 0) {
    const lastLoading = Math.max(...loadingStops.map(s => s.sequence));
    const firstUnloading = Math.min(...unloadingStops.map(s => s.sequence));
    if (lastLoading > firstUnloading) {
      warnings.push('Loading point appears after unloading point. Verify stop order is correct.');
    }
  }

  // Check all stops have a location
  const noLocation = stops.filter(s => !s.location || !s.location.trim());
  if (noLocation.length > 0) {
    errors.push(`${noLocation.length} stop(s) missing location name`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Calculate ETA for remaining stops based on average speed.
 */
export function calculateETAs(
  stops: TripStop[],
  averageSpeedKmh: number = 40,
  startTime?: string
): { stopId: string; eta: string }[] {
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const etas: { stopId: string; eta: string }[] = [];
  let currentTime = startTime ? new Date(startTime).getTime() : Date.now();

  for (const stop of sorted) {
    if (stop.status === 'completed' || stop.status === 'skipped') continue;

    // Travel time to this stop
    const travelHours = stop.distance_from_prev_km / averageSpeedKmh;
    currentTime += travelHours * 60 * 60 * 1000;

    etas.push({ stopId: stop.id, eta: new Date(currentTime).toISOString() });

    // Add estimated stop time (1 hour for loading/unloading)
    if (stop.type === 'loading' || stop.type === 'unloading') {
      currentTime += 60 * 60 * 1000; // 1 hour
    }
  }

  return etas;
}
