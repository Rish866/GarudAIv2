// Data Access Layer — Central exports
// All business data must go through these repositories
// Every repository enforces organization_id scoping

export { TenantRepository } from './base/tenantRepository';
export type { TenantQueryOptions, TenantRecord } from './base/tenantRepository';

export { vehicleRepository } from './vehicles/vehicleRepository';
export type { VehicleRecord } from './vehicles/vehicleRepository';

export { driverRepository } from './drivers/driverRepository';
export type { DriverRecord } from './drivers/driverRepository';

export { customerRepository } from './customers/customerRepository';
export type { CustomerRecord } from './customers/customerRepository';

export { tripRepository } from './trips/tripRepository';
export type { TripRecord } from './trips/tripRepository';

export { invoiceRepository } from './invoices/invoiceRepository';
export type { InvoiceRecord } from './invoices/invoiceRepository';

export { expenseRepository } from './expenses/expenseRepository';
export type { ExpenseRecord } from './expenses/expenseRepository';
