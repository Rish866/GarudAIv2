// ============================================================
// APPROVAL WORKFLOW ENGINE
//
// Configurable rules that determine which operations require
// approval before execution. Based on amount thresholds,
// operation type, and role hierarchy.
//
// WORKFLOW:
// 1. User initiates action (e.g., expense > ₹5000)
// 2. approvalEngine.checkApproval() evaluates rules
// 3. If approval required → creates approval_request record
// 4. Notifies approver(s) via notification engine
// 5. Approver reviews and approves/rejects
// 6. On approval → ERP Transaction Engine executes the operation
// 7. On rejection → operation blocked, requestor notified
//
// RULE TYPES:
// ─────────────────────────────────────────────────────
// EXPENSE:      amount > threshold → requires manager/director
// CREDIT:       booking when outstanding > limit → requires admin
// CANCELLATION: trip cancellation → requires operations_manager
// PAYMENT:      vendor payment > threshold → requires accountant+admin
// MAINTENANCE:  cost > threshold → requires fleet_manager
// WRITE-OFF:    any amount → requires director/owner
// ============================================================

import type { OrganizationRole } from '../types/organization';

// ============================================================
// TYPES
// ============================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ApprovalCategory = 'expense' | 'credit_override' | 'trip_cancellation' | 'vendor_payment' | 'maintenance' | 'write_off' | 'invoice_cancellation';

export interface ApprovalRule {
  category: ApprovalCategory;
  /** Condition: amount threshold (operation blocked if amount exceeds this) */
  amountThreshold: number;
  /** Who can approve (role hierarchy) */
  approverRoles: OrganizationRole[];
  /** Description for the approval request */
  description: string;
  /** Auto-expire after this many hours (0 = no expiry) */
  expiryHours: number;
}

export interface ApprovalRequest {
  id?: string;
  organization_id: string;
  category: ApprovalCategory;
  /** What is being approved (human-readable) */
  title: string;
  /** Details */
  description: string;
  /** Amount involved */
  amount: number;
  /** Who requested */
  requested_by: string;
  /** Current status */
  status: ApprovalStatus;
  /** Who approved/rejected */
  actioned_by?: string;
  /** Approval/rejection reason */
  action_reason?: string;
  /** Serialized payload to execute on approval */
  payload?: Record<string, unknown>;
  /** When it expires */
  expires_at?: string;
}

// ============================================================
// DEFAULT APPROVAL RULES (Indian Transport Company Standards)
// ============================================================

export const DEFAULT_APPROVAL_RULES: ApprovalRule[] = [
  // Expenses
  {
    category: 'expense',
    amountThreshold: 5000,
    approverRoles: ['operations_manager', 'admin', 'organization_owner'],
    description: 'Expense exceeds ₹5,000 — requires manager approval',
    expiryHours: 48,
  },
  {
    category: 'expense',
    amountThreshold: 25000,
    approverRoles: ['admin', 'organization_owner'],
    description: 'Expense exceeds ₹25,000 — requires admin/owner approval',
    expiryHours: 72,
  },

  // Credit override
  {
    category: 'credit_override',
    amountThreshold: 0, // Any credit override requires approval
    approverRoles: ['accountant', 'admin', 'organization_owner'],
    description: 'Customer credit limit exceeded — requires finance approval',
    expiryHours: 24,
  },

  // Trip cancellation
  {
    category: 'trip_cancellation',
    amountThreshold: 0,
    approverRoles: ['operations_manager', 'admin', 'organization_owner'],
    description: 'Trip cancellation requires operations manager approval',
    expiryHours: 24,
  },

  // Vendor payment
  {
    category: 'vendor_payment',
    amountThreshold: 50000,
    approverRoles: ['accountant', 'admin', 'organization_owner'],
    description: 'Vendor payment exceeds ₹50,000 — requires finance approval',
    expiryHours: 48,
  },

  // Maintenance
  {
    category: 'maintenance',
    amountThreshold: 10000,
    approverRoles: ['fleet_manager', 'admin', 'organization_owner'],
    description: 'Maintenance cost exceeds ₹10,000 — requires fleet manager approval',
    expiryHours: 24,
  },

  // Write-off
  {
    category: 'write_off',
    amountThreshold: 0,
    approverRoles: ['organization_owner'],
    description: 'Write-off requires owner approval',
    expiryHours: 0, // Never expires
  },

  // Invoice cancellation
  {
    category: 'invoice_cancellation',
    amountThreshold: 0,
    approverRoles: ['admin', 'organization_owner'],
    description: 'Invoice cancellation requires admin approval',
    expiryHours: 48,
  },
];

// ============================================================
// APPROVAL CHECKS
// ============================================================

/**
 * Check if an operation requires approval.
 * Returns the matching rule if approval is needed, null if operation can proceed.
 */
export function checkApprovalRequired(
  category: ApprovalCategory,
  amount: number,
  userRole: OrganizationRole | null,
  rules: ApprovalRule[] = DEFAULT_APPROVAL_RULES
): ApprovalRule | null {
  // Find matching rules for this category (sorted by threshold descending)
  const matchingRules = rules
    .filter(r => r.category === category && amount >= r.amountThreshold)
    .sort((a, b) => b.amountThreshold - a.amountThreshold);

  if (matchingRules.length === 0) return null;

  // Take the highest-threshold matching rule
  const rule = matchingRules[0];

  // Check if the user's role IS one of the approvers (self-approval for authorized roles)
  if (userRole && rule.approverRoles.includes(userRole)) {
    return null; // User can self-approve — no approval needed
  }

  // Owner and admin can always self-approve everything
  if (userRole === 'organization_owner' || userRole === 'admin') {
    return null;
  }

  return rule;
}

/**
 * Get the display label for an approval category
 */
export function getApprovalCategoryLabel(category: ApprovalCategory): string {
  const labels: Record<ApprovalCategory, string> = {
    expense: 'Expense Approval',
    credit_override: 'Credit Override',
    trip_cancellation: 'Trip Cancellation',
    vendor_payment: 'Vendor Payment',
    maintenance: 'Maintenance Approval',
    write_off: 'Write-Off',
    invoice_cancellation: 'Invoice Cancellation',
  };
  return labels[category] || category;
}

/**
 * Check if a role can approve a specific category
 */
export function canApprove(role: OrganizationRole | null, category: ApprovalCategory): boolean {
  if (!role) return false;
  if (role === 'organization_owner' || role === 'admin') return true;
  
  const rules = DEFAULT_APPROVAL_RULES.filter(r => r.category === category);
  return rules.some(r => r.approverRoles.includes(role));
}
