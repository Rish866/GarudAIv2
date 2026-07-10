// All vehicle types available for transporters
// Used across: Fleet, Trips, Enquiries, Indents, Quotations, Market Hire

import type { VehicleType } from '../types';

export const VEHICLE_TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'truck', label: 'Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'container', label: 'Container' },
  { value: 'tanker', label: 'Tanker' },
  { value: 'tipper', label: 'Tipper' },
  { value: 'reefer', label: 'Reefer (Cold Chain)' },
  { value: 'lcv', label: 'LCV (Light Commercial)' },
  { value: 'open_body', label: 'Open Body' },
  { value: 'flatbed', label: 'Flatbed / Trailer Bed' },
  { value: 'bulker', label: 'Bulker (Cement/Powder)' },
  { value: 'car_carrier', label: 'Car Carrier' },
  { value: 'half_body', label: 'Half Body' },
  { value: 'full_body', label: 'Full Body (Closed)' },
  { value: 'jcb_crane', label: 'JCB / Crane / ODC' },
  { value: 'mini_truck', label: 'Mini Truck (Tata Ace/Pickup)' },
];

export function getVehicleTypeLabel(type: string): string {
  return VEHICLE_TYPE_OPTIONS.find(v => v.value === type)?.label || type;
}
