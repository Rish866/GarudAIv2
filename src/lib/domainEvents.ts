// ============================================================
// DOMAIN EVENT BUS
//
// Pure event-driven architecture. The Domain Service emits events
// after successful transactions. Consumers subscribe and react.
//
// WHY:
// - Transaction engine doesn't know about notifications, dashboards, reports
// - Consumers can be added/removed without changing the transaction code
// - Events are the CONTRACT between the domain layer and the application layer
//
// CONSUMERS:
// - NotificationConsumer: creates user notifications from domain events
// - CacheConsumer: invalidates TanStack Query caches
// - (Future) AuditConsumer: writes to audit trail
// - (Future) WebhookConsumer: fires outbound webhooks
//
// PATTERN:
//   domainEvents.emit('payment.recorded', { customerId, amount, ... })
//   → NotificationConsumer: creates "Payment received" notification
//   → CacheConsumer: invalidates payments, invoices, customers, dashboard caches
// ============================================================

import { queryClient, queryKeys } from './queryClient';
import * as notificationEngine from './notificationEngine';
import type { BusinessEvent } from './notificationEngine';

// ============================================================
// EVENT TYPES
// ============================================================

export type DomainEvent = {
  organizationId: string;
  timestamp: string;
} & (
  | { name: 'customer.created'; data: { customerId: string; customerName: string } }
  | { name: 'vendor.created'; data: { vendorId: string; vendorName: string } }
  | { name: 'vehicle.created'; data: { vehicleId: string; regNumber: string } }
  | { name: 'driver.created'; data: { driverId: string; driverName: string } }
  | { name: 'trip.created'; data: { tripId: string; tripNumber: string; origin: string; destination: string; customerName: string; vehicleReg: string; driverName: string } }
  | { name: 'trip.assigned'; data: { tripId: string; tripNumber: string; vehicleReg: string; driverName: string } }
  | { name: 'trip.completed'; data: { tripId: string; tripNumber: string; customerName: string; freightAmount: number } }
  | { name: 'trip.cancelled'; data: { tripId: string; tripNumber: string; reason: string } }
  | { name: 'invoice.created'; data: { invoiceId: string; invoiceNumber: string; customerName: string; totalAmount: number } }
  | { name: 'payment.recorded'; data: { paymentId: string; customerName: string; amount: number; mode: string } }
  | { name: 'expense.recorded'; data: { expenseId: string; category: string; amount: number; tripId?: string; vehicleReg?: string } }
  | { name: 'fuel.recorded'; data: { fuelEntryId: string; vehicleReg: string; litres: number; amount: number } }
  | { name: 'maintenance.recorded'; data: { maintenanceId: string; vehicleReg: string; description: string; cost: number } }
  | { name: 'maintenance.completed'; data: { maintenanceId: string; vehicleReg: string; actualCost: number } }
  | { name: 'challan.recorded'; data: { challanId: string; vehicleReg: string; offence: string; amount: number } }
  | { name: 'workorder.created'; data: { workOrderId: string; vehicleReg: string; woType: string } }
  | { name: 'vendor.payment.recorded'; data: { vendorName: string; amount: number } }
);

// ============================================================
// EVENT BUS
// ============================================================

type EventHandler = (event: DomainEvent) => void | Promise<void>;

const handlers: EventHandler[] = [];

/**
 * Subscribe a consumer to ALL domain events.
 * Returns unsubscribe function.
 */
export function subscribe(handler: EventHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx >= 0) handlers.splice(idx, 1);
  };
}

/**
 * Emit a domain event to all subscribers.
 * Called by the Domain Service after successful transaction.
 * Errors in consumers do NOT fail the transaction (fire-and-forget).
 */
export async function emit(event: DomainEvent): Promise<void> {
  for (const handler of handlers) {
    try {
      await handler(event);
    } catch (e) {
      console.error('[DomainEvent] Consumer error:', e);
      // Consumers must not crash the domain service
    }
  }
}

// ============================================================
// BUILT-IN CONSUMERS (registered on import)
// ============================================================

/**
 * CONSUMER 1: Cache Invalidation
 * Invalidates TanStack Query caches so UI auto-refreshes.
 */
function cacheConsumer(event: DomainEvent): void {
  const orgId = event.organizationId;

  // Always invalidate dashboard
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(orgId) });

  switch (event.name) {
    case 'customer.created':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('customers', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('ledger_accounts', orgId) });
      break;
    case 'vendor.created':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('vendors', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('ledger_accounts', orgId) });
      break;
    case 'vehicle.created':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('vehicles', orgId) });
      break;
    case 'driver.created':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('drivers', orgId) });
      break;
    case 'trip.created':
    case 'trip.assigned':
    case 'trip.completed':
    case 'trip.cancelled':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('trips', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('vehicles', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('drivers', orgId) });
      break;
    case 'invoice.created':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('invoices', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('customers', orgId) });
      break;
    case 'payment.recorded':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('payments', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('invoices', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('customers', orgId) });
      break;
    case 'expense.recorded':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('expenses', orgId) });
      break;
    case 'fuel.recorded':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('fuel_entries', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('vehicles', orgId) });
      break;
    case 'maintenance.recorded':
    case 'maintenance.completed':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('maintenance_records', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('vehicles', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('expenses', orgId) });
      break;
    case 'challan.recorded':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('challans', orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.table('expenses', orgId) });
      break;
    case 'workorder.created':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('work_orders', orgId) });
      break;
    case 'vendor.payment.recorded':
      queryClient.invalidateQueries({ queryKey: queryKeys.table('vendors', orgId) });
      break;
  }
}

/**
 * CONSUMER 2: Notification Engine
 * Maps domain events to user-facing notifications.
 */
async function notificationConsumer(event: DomainEvent): Promise<void> {
  // Map domain events to notification engine events
  let businessEvent: BusinessEvent | null = null;

  switch (event.name) {
    case 'trip.created':
      businessEvent = { type: 'trip.created', tripNumber: event.data.tripNumber, origin: event.data.origin, destination: event.data.destination, customerName: event.data.customerName };
      break;
    case 'trip.completed':
      businessEvent = { type: 'trip.completed', tripNumber: event.data.tripNumber, customerName: event.data.customerName, freightAmount: event.data.freightAmount };
      break;
    case 'trip.cancelled':
      businessEvent = { type: 'trip.cancelled', tripNumber: event.data.tripNumber, reason: event.data.reason };
      break;
    case 'invoice.created':
      businessEvent = { type: 'invoice.created', invoiceNumber: event.data.invoiceNumber, customerName: event.data.customerName, amount: event.data.totalAmount };
      break;
    case 'payment.recorded':
      businessEvent = { type: 'payment.received', customerName: event.data.customerName, amount: event.data.amount, mode: event.data.mode };
      break;
    case 'challan.recorded':
      businessEvent = { type: 'challan.recorded', vehicleReg: event.data.vehicleReg, offence: event.data.offence, amount: event.data.amount };
      break;
    case 'maintenance.recorded':
      businessEvent = { type: 'maintenance.created', vehicleReg: event.data.vehicleReg, description: event.data.description };
      break;
  }

  if (businessEvent) {
    await notificationEngine.emit(event.organizationId, businessEvent);
  }
}

// Register built-in consumers
subscribe(cacheConsumer);
subscribe(notificationConsumer);
