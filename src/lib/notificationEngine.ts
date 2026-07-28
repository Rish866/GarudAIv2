// ============================================================
// NOTIFICATION ENGINE — Event-Driven Business Notifications
//
// Every business event automatically creates notifications for
// the relevant roles/users. No manual notification creation needed.
//
// ARCHITECTURE:
// 1. ERP Transaction Engine performs a business operation
// 2. After success, calls notificationEngine.emit(event)
// 3. The engine matches the event against notification rules
// 4. Creates notification records for target roles
// 5. UI auto-refreshes via cache invalidation
//
// EVENT TYPES:
// ─────────────────────────────────────────────────
// OPERATIONAL:
//   trip.created        → dispatcher, operations_manager
//   trip.assigned       → driver (future), fleet_manager
//   trip.started        → customer (future), operations_manager
//   trip.completed      → accountant, operations_manager
//   trip.cancelled      → operations_manager, admin
//
// FINANCIAL:
//   invoice.created     → accountant, customer (future)
//   payment.received    → accountant, operations_manager
//   expense.recorded    → accountant (if > threshold)
//   credit.exceeded     → dispatcher, accountant, admin
//
// FLEET:
//   vehicle.breakdown   → fleet_manager, operations_manager
//   maintenance.due     → fleet_manager
//   document.expiring   → fleet_manager, admin
//   challan.recorded    → fleet_manager, driver (future)
//
// HR:
//   driver.license_expiry → hr_manager, fleet_manager
// ============================================================

import { supabase } from './supabase';
import { queryClient, queryKeys } from './queryClient';

// ============================================================
// EVENT TYPES
// ============================================================

export type BusinessEvent =
  // Trip lifecycle
  | { type: 'trip.created'; tripNumber: string; origin: string; destination: string; customerName: string }
  | { type: 'trip.assigned'; tripNumber: string; vehicleReg: string; driverName: string }
  | { type: 'trip.completed'; tripNumber: string; customerName: string; freightAmount: number }
  | { type: 'trip.cancelled'; tripNumber: string; reason: string }
  // Financial
  | { type: 'invoice.created'; invoiceNumber: string; customerName: string; amount: number }
  | { type: 'payment.received'; customerName: string; amount: number; mode: string }
  | { type: 'expense.recorded'; category: string; amount: number; description: string }
  | { type: 'credit.exceeded'; customerName: string; outstanding: number; limit: number }
  // Fleet
  | { type: 'vehicle.breakdown'; vehicleReg: string; location: string }
  | { type: 'maintenance.created'; vehicleReg: string; description: string }
  | { type: 'maintenance.completed'; vehicleReg: string; cost: number }
  | { type: 'document.expiring'; entityType: string; entityName: string; documentType: string; daysRemaining: number }
  | { type: 'challan.recorded'; vehicleReg: string; offence: string; amount: number }
  // Work orders
  | { type: 'workorder.created'; woNumber: string; vehicleReg: string; woType: string };

// ============================================================
// NOTIFICATION RULES — which events create which notifications
// ============================================================

interface NotificationRule {
  event: BusinessEvent['type'];
  /** Notification type stored in DB */
  notificationType: string;
  /** Title template (supports {placeholders}) */
  titleTemplate: string;
  /** Message template */
  messageTemplate: string;
  /** Which module to link to */
  linkModule: string;
  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'critical';
}

const NOTIFICATION_RULES: NotificationRule[] = [
  // Trip events
  {
    event: 'trip.created',
    notificationType: 'trip_update',
    titleTemplate: 'New Trip Created',
    messageTemplate: 'Trip {tripNumber}: {origin} → {destination} for {customerName}',
    linkModule: 'trips',
    priority: 'normal',
  },
  {
    event: 'trip.completed',
    notificationType: 'trip_update',
    titleTemplate: 'Trip Completed',
    messageTemplate: 'Trip {tripNumber} delivered to {customerName}. Revenue: ₹{freightAmount}',
    linkModule: 'trips',
    priority: 'normal',
  },
  {
    event: 'trip.cancelled',
    notificationType: 'system',
    titleTemplate: 'Trip Cancelled',
    messageTemplate: 'Trip {tripNumber} cancelled. Reason: {reason}',
    linkModule: 'trips',
    priority: 'high',
  },
  // Financial events
  {
    event: 'invoice.created',
    notificationType: 'invoice_generated',
    titleTemplate: 'Invoice Generated',
    messageTemplate: 'Invoice {invoiceNumber} for {customerName}: ₹{amount}',
    linkModule: 'billing',
    priority: 'normal',
  },
  {
    event: 'payment.received',
    notificationType: 'payment_received',
    titleTemplate: 'Payment Received',
    messageTemplate: '₹{amount} received from {customerName} via {mode}',
    linkModule: 'billing',
    priority: 'normal',
  },
  {
    event: 'credit.exceeded',
    notificationType: 'system',
    titleTemplate: '⚠️ Credit Limit Exceeded',
    messageTemplate: '{customerName} outstanding ₹{outstanding} exceeds limit ₹{limit}',
    linkModule: 'creditblock',
    priority: 'critical',
  },
  // Fleet events
  {
    event: 'maintenance.created',
    notificationType: 'maintenance_due',
    titleTemplate: 'Maintenance Scheduled',
    messageTemplate: '{vehicleReg}: {description}',
    linkModule: 'maintenance',
    priority: 'normal',
  },
  {
    event: 'challan.recorded',
    notificationType: 'system',
    titleTemplate: 'Traffic Challan',
    messageTemplate: '{vehicleReg}: {offence} — ₹{amount}',
    linkModule: 'challans',
    priority: 'high',
  },
  {
    event: 'document.expiring',
    notificationType: 'document_expiry',
    titleTemplate: 'Document Expiring Soon',
    messageTemplate: '{entityType} {entityName}: {documentType} expires in {daysRemaining} days',
    linkModule: 'expiry',
    priority: 'high',
  },
];

// ============================================================
// ENGINE
// ============================================================

/**
 * Emit a business event. The notification engine matches it against
 * rules and creates notification records in the database.
 * 
 * Called by the ERP Transaction Engine after successful operations.
 */
export async function emit(
  organizationId: string,
  event: BusinessEvent
): Promise<void> {
  // Find matching rules
  const matchingRules = NOTIFICATION_RULES.filter(rule => rule.event === event.type);

  if (matchingRules.length === 0) return;

  // Build notifications
  const notifications = matchingRules.map(rule => {
    // Interpolate placeholders in templates
    let title = rule.titleTemplate;
    let message = rule.messageTemplate;
    const data = event as Record<string, unknown>;

    for (const [key, value] of Object.entries(data)) {
      if (key === 'type') continue;
      const placeholder = `{${key}}`;
      const displayValue = typeof value === 'number'
        ? value.toLocaleString('en-IN')
        : String(value || '');
      title = title.replace(placeholder, displayValue);
      message = message.replace(placeholder, displayValue);
    }

    return {
      organization_id: organizationId,
      type: rule.notificationType,
      title,
      message,
      link_module: rule.linkModule,
      is_read: false,
    };
  });

  // Insert all notifications (best-effort — don't fail the parent transaction)
  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
    // Invalidate notification cache so UI updates
    queryClient.invalidateQueries({ queryKey: queryKeys.table('notifications', organizationId) });
  }
}

/**
 * Emit multiple events at once (batch).
 */
export async function emitBatch(
  organizationId: string,
  events: BusinessEvent[]
): Promise<void> {
  for (const event of events) {
    await emit(organizationId, event);
  }
}
