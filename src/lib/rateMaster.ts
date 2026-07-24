// ============================================================
// RATE MASTER — Complex Transport Pricing Engine
//
// Supports multiple rate structures used in Indian transport:
// 1. Per Trip (fixed rate regardless of weight/distance)
// 2. Per Ton (rate × weight in tons)
// 3. Per Km (rate × distance in km)
// 4. Per Ton-Km (rate × tons × km — used for long-haul)
// 5. Slab-based (different rates for weight/distance ranges)
// 6. Contract-based (lookup from active contracts)
//
// Also handles:
// - Minimum guarantee (e.g., min ₹15,000 even for light loads)
// - Overweight surcharge
// - Distance-based slabs
// - Material-type surcharges (hazmat, oversized, etc.)
// - Seasonal adjustments
// ============================================================

export type RateType = 'per_trip' | 'per_ton' | 'per_km' | 'per_ton_km' | 'slab_weight' | 'slab_distance';

export interface RateRule {
  id?: string;
  rate_type: RateType;
  /** Base rate (meaning depends on rate_type) */
  base_rate: number;
  /** Minimum charge regardless of calculation */
  minimum_charge: number;
  /** Slabs for slab-based pricing */
  slabs?: RateSlab[];
  /** Surcharges */
  surcharges?: RateSurcharge[];
}

export interface RateSlab {
  /** Start value (inclusive) — tons or km depending on type */
  from: number;
  /** End value (exclusive) */
  to: number;
  /** Rate for this slab */
  rate: number;
}

export interface RateSurcharge {
  /** Condition for applying surcharge */
  condition: 'overweight' | 'hazmat' | 'oversized' | 'reefer' | 'express' | 'weekend';
  /** Type of surcharge */
  type: 'percentage' | 'fixed';
  /** Value (percentage or fixed amount) */
  value: number;
  /** Label for display */
  label: string;
}

export interface RateCalculationInput {
  weight_tons: number;
  distance_km: number;
  vehicle_type?: string;
  material_type?: string;
  is_express?: boolean;
  is_weekend?: boolean;
  is_hazmat?: boolean;
  is_oversized?: boolean;
  is_reefer?: boolean;
}

export interface RateCalculationResult {
  /** Base freight amount */
  base_amount: number;
  /** Surcharges applied */
  surcharges: { label: string; amount: number }[];
  /** Total surcharge amount */
  total_surcharge: number;
  /** Final freight amount (base + surcharges) */
  total_amount: number;
  /** Rate type used */
  rate_type: RateType;
  /** Whether minimum guarantee was applied */
  minimum_applied: boolean;
  /** Calculation breakdown for transparency */
  formula: string;
}

/**
 * Calculate freight rate based on rule and input parameters.
 */
export function calculateRate(
  rule: RateRule,
  input: RateCalculationInput
): RateCalculationResult {
  let baseAmount = 0;
  let formula = '';

  switch (rule.rate_type) {
    case 'per_trip':
      baseAmount = rule.base_rate;
      formula = `Fixed: ₹${rule.base_rate.toLocaleString()}`;
      break;

    case 'per_ton':
      baseAmount = rule.base_rate * input.weight_tons;
      formula = `₹${rule.base_rate}/ton × ${input.weight_tons} tons`;
      break;

    case 'per_km':
      baseAmount = rule.base_rate * input.distance_km;
      formula = `₹${rule.base_rate}/km × ${input.distance_km} km`;
      break;

    case 'per_ton_km':
      baseAmount = rule.base_rate * input.weight_tons * input.distance_km;
      formula = `₹${rule.base_rate}/ton-km × ${input.weight_tons}t × ${input.distance_km}km`;
      break;

    case 'slab_weight': {
      if (rule.slabs && rule.slabs.length > 0) {
        const slab = rule.slabs.find(s => input.weight_tons >= s.from && input.weight_tons < s.to);
        if (slab) {
          baseAmount = slab.rate * input.weight_tons;
          formula = `Weight slab [${slab.from}-${slab.to}t]: ₹${slab.rate}/ton × ${input.weight_tons}t`;
        } else {
          // Use last slab rate for oversized
          const lastSlab = rule.slabs[rule.slabs.length - 1];
          baseAmount = lastSlab.rate * input.weight_tons;
          formula = `Weight slab (max): ₹${lastSlab.rate}/ton × ${input.weight_tons}t`;
        }
      } else {
        baseAmount = rule.base_rate * input.weight_tons;
        formula = `₹${rule.base_rate}/ton × ${input.weight_tons}t (no slabs)`;
      }
      break;
    }

    case 'slab_distance': {
      if (rule.slabs && rule.slabs.length > 0) {
        const slab = rule.slabs.find(s => input.distance_km >= s.from && input.distance_km < s.to);
        if (slab) {
          baseAmount = slab.rate;
          formula = `Distance slab [${slab.from}-${slab.to}km]: ₹${slab.rate.toLocaleString()}`;
        } else {
          const lastSlab = rule.slabs[rule.slabs.length - 1];
          baseAmount = lastSlab.rate;
          formula = `Distance slab (max): ₹${lastSlab.rate.toLocaleString()}`;
        }
      } else {
        baseAmount = rule.base_rate * input.distance_km;
        formula = `₹${rule.base_rate}/km × ${input.distance_km}km (no slabs)`;
      }
      break;
    }
  }

  // Apply minimum guarantee
  let minimumApplied = false;
  if (rule.minimum_charge > 0 && baseAmount < rule.minimum_charge) {
    baseAmount = rule.minimum_charge;
    minimumApplied = true;
    formula += ` → Minimum ₹${rule.minimum_charge.toLocaleString()} applied`;
  }

  // Apply surcharges
  const appliedSurcharges: { label: string; amount: number }[] = [];

  if (rule.surcharges) {
    for (const surcharge of rule.surcharges) {
      let applies = false;

      switch (surcharge.condition) {
        case 'overweight': applies = input.weight_tons > 25; break;
        case 'hazmat': applies = input.is_hazmat === true; break;
        case 'oversized': applies = input.is_oversized === true; break;
        case 'reefer': applies = input.is_reefer === true; break;
        case 'express': applies = input.is_express === true; break;
        case 'weekend': applies = input.is_weekend === true; break;
      }

      if (applies) {
        const surchargeAmount = surcharge.type === 'percentage'
          ? Math.round(baseAmount * surcharge.value / 100)
          : surcharge.value;
        appliedSurcharges.push({ label: surcharge.label, amount: surchargeAmount });
      }
    }
  }

  const totalSurcharge = appliedSurcharges.reduce((sum, s) => sum + s.amount, 0);
  const totalAmount = Math.round(baseAmount + totalSurcharge);

  return {
    base_amount: Math.round(baseAmount),
    surcharges: appliedSurcharges,
    total_surcharge: totalSurcharge,
    total_amount: totalAmount,
    rate_type: rule.rate_type,
    minimum_applied: minimumApplied,
    formula,
  };
}

/**
 * Find the best matching rate rule for a trip based on route contracts.
 * Returns the contract rate if found, otherwise falls back to the provided default.
 */
export function findBestRate(
  contracts: { origin: string; destination: string; vehicle_type: string; rate_type: string; rate: number; status: string }[],
  origin: string,
  destination: string,
  vehicleType: string,
  defaultRule: RateRule
): RateRule {
  // Find active contract matching origin → destination → vehicle type
  const match = contracts.find(c =>
    c.status === 'active' &&
    c.origin.toLowerCase() === origin.toLowerCase() &&
    c.destination.toLowerCase() === destination.toLowerCase() &&
    c.vehicle_type === vehicleType
  );

  if (match) {
    return {
      rate_type: match.rate_type as RateType,
      base_rate: match.rate,
      minimum_charge: 0,
    };
  }

  // Try partial match (same route, any vehicle type)
  const routeMatch = contracts.find(c =>
    c.status === 'active' &&
    c.origin.toLowerCase() === origin.toLowerCase() &&
    c.destination.toLowerCase() === destination.toLowerCase()
  );

  if (routeMatch) {
    return {
      rate_type: routeMatch.rate_type as RateType,
      base_rate: routeMatch.rate,
      minimum_charge: 0,
    };
  }

  return defaultRule;
}
