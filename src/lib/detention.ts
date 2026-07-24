// ============================================================
// DETENTION CALCULATION ENGINE
//
// Calculates detention charges based on configurable rules.
// In Indian transport: detention = charges for vehicle waiting
// beyond the "free time" allowed for loading/unloading.
//
// Rules:
// - Each organization can set their own detention policies
// - Different rates for loading vs unloading
// - Slab-based pricing (e.g., first 4h free, next 4h at ₹500/hr, after 8h at ₹800/hr)
// - Day-based or hour-based calculation
// - Holiday/Sunday multipliers
// ============================================================

export interface DetentionPolicy {
  /** Free hours allowed before detention kicks in */
  free_hours_loading: number;
  free_hours_unloading: number;
  /** Hourly rate after free period */
  hourly_rate: number;
  /** Daily rate (if day-based instead of hourly) */
  daily_rate: number;
  /** Calculation mode */
  mode: 'hourly' | 'daily' | 'slab';
  /** Slab rates (progressive pricing) */
  slabs?: DetentionSlab[];
  /** Maximum detention per trip (cap) */
  max_per_trip?: number;
  /** Whether to count weekends/holidays at higher rate */
  holiday_multiplier: number;
}

export interface DetentionSlab {
  /** Start hour (inclusive) */
  from_hours: number;
  /** End hour (exclusive, use Infinity for last slab) */
  to_hours: number;
  /** Rate per hour in this slab */
  rate_per_hour: number;
}

export interface DetentionInput {
  /** When the vehicle arrived at loading/unloading point */
  arrival_time: string;
  /** When loading/unloading completed (vehicle released) */
  release_time: string;
  /** Type of stop */
  type: 'loading' | 'unloading';
}

export interface DetentionResult {
  /** Total detention hours (beyond free time) */
  detention_hours: number;
  /** Total free hours used */
  free_hours_used: number;
  /** Total waiting hours (including free time) */
  total_waiting_hours: number;
  /** Calculated detention amount */
  amount: number;
  /** Breakdown of charges per slab */
  breakdown: { hours: number; rate: number; amount: number }[];
  /** Whether detention applies */
  is_applicable: boolean;
}

/** Default detention policy for Indian transport */
export const DEFAULT_DETENTION_POLICY: DetentionPolicy = {
  free_hours_loading: 4,
  free_hours_unloading: 4,
  hourly_rate: 500,
  daily_rate: 3000,
  mode: 'slab',
  slabs: [
    { from_hours: 0, to_hours: 4, rate_per_hour: 0 },      // Free period
    { from_hours: 4, to_hours: 12, rate_per_hour: 500 },    // ₹500/hr for 4-12 hours
    { from_hours: 12, to_hours: 24, rate_per_hour: 750 },   // ₹750/hr for 12-24 hours
    { from_hours: 24, to_hours: Infinity, rate_per_hour: 1000 }, // ₹1000/hr after 24 hours
  ],
  max_per_trip: 50000,
  holiday_multiplier: 1.5,
};

/**
 * Calculate detention charges for a single loading/unloading point.
 */
export function calculateDetention(
  input: DetentionInput,
  policy: DetentionPolicy = DEFAULT_DETENTION_POLICY
): DetentionResult {
  const arrival = new Date(input.arrival_time);
  const release = new Date(input.release_time);

  // Total waiting time in hours
  const totalMs = release.getTime() - arrival.getTime();
  if (totalMs <= 0) {
    return { detention_hours: 0, free_hours_used: 0, total_waiting_hours: 0, amount: 0, breakdown: [], is_applicable: false };
  }

  const totalHours = totalMs / (1000 * 60 * 60);
  const freeHours = input.type === 'loading' ? policy.free_hours_loading : policy.free_hours_unloading;
  const detentionHours = Math.max(0, totalHours - freeHours);
  const freeHoursUsed = Math.min(totalHours, freeHours);

  if (detentionHours <= 0) {
    return {
      detention_hours: 0,
      free_hours_used: freeHoursUsed,
      total_waiting_hours: totalHours,
      amount: 0,
      breakdown: [{ hours: freeHoursUsed, rate: 0, amount: 0 }],
      is_applicable: false,
    };
  }

  let amount = 0;
  const breakdown: { hours: number; rate: number; amount: number }[] = [];

  switch (policy.mode) {
    case 'hourly':
      amount = Math.round(detentionHours * policy.hourly_rate);
      breakdown.push({ hours: detentionHours, rate: policy.hourly_rate, amount });
      break;

    case 'daily': {
      const detentionDays = Math.ceil(detentionHours / 24);
      amount = detentionDays * policy.daily_rate;
      breakdown.push({ hours: detentionHours, rate: policy.daily_rate, amount });
      break;
    }

    case 'slab': {
      if (!policy.slabs || policy.slabs.length === 0) {
        // Fallback to hourly if no slabs defined
        amount = Math.round(detentionHours * policy.hourly_rate);
        breakdown.push({ hours: detentionHours, rate: policy.hourly_rate, amount });
      } else {
        // Apply slab-based calculation
        let remainingHours = totalHours;
        for (const slab of policy.slabs) {
          if (remainingHours <= 0) break;
          const slabWidth = slab.to_hours === Infinity
            ? remainingHours
            : Math.min(slab.to_hours - slab.from_hours, remainingHours);

          const hoursInSlab = Math.max(0, Math.min(slabWidth, remainingHours));
          const slabAmount = Math.round(hoursInSlab * slab.rate_per_hour);

          if (hoursInSlab > 0) {
            breakdown.push({ hours: hoursInSlab, rate: slab.rate_per_hour, amount: slabAmount });
            amount += slabAmount;
          }
          remainingHours -= hoursInSlab;
        }
      }
      break;
    }
  }

  // Apply cap
  if (policy.max_per_trip && amount > policy.max_per_trip) {
    amount = policy.max_per_trip;
  }

  return {
    detention_hours: Math.round(detentionHours * 100) / 100,
    free_hours_used: Math.round(freeHoursUsed * 100) / 100,
    total_waiting_hours: Math.round(totalHours * 100) / 100,
    amount: Math.round(amount),
    breakdown,
    is_applicable: true,
  };
}

/**
 * Calculate total detention for a trip with multiple stops.
 */
export function calculateTripDetention(
  stops: DetentionInput[],
  policy: DetentionPolicy = DEFAULT_DETENTION_POLICY
): { total: number; details: DetentionResult[] } {
  const details = stops.map(stop => calculateDetention(stop, policy));
  const total = details.reduce((sum, d) => sum + d.amount, 0);
  return { total, details };
}

/**
 * Format detention hours for display (e.g., "4h 30m")
 */
export function formatDetentionHours(hours: number): string {
  if (hours <= 0) return '0h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
