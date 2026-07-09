// Utility functions for Transport ERP

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return formatted;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Vehicle statuses
    available: 'bg-green-100 text-green-800',
    on_trip: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    breakdown: 'bg-red-100 text-red-800',
    inactive: 'bg-gray-100 text-gray-800',
    // Trip statuses
    booked: 'bg-purple-100 text-purple-800',
    assigned: 'bg-indigo-100 text-indigo-800',
    loading: 'bg-yellow-100 text-yellow-800',
    in_transit: 'bg-blue-100 text-blue-800',
    reached: 'bg-teal-100 text-teal-800',
    unloading: 'bg-orange-100 text-orange-800',
    pod_pending: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    billed: 'bg-emerald-100 text-emerald-800',
    settled: 'bg-green-200 text-green-900',
    cancelled: 'bg-red-100 text-red-800',
    // Invoice statuses
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    // Driver statuses
    on_leave: 'bg-orange-100 text-orange-800',
    // Customer statuses
    active: 'bg-green-100 text-green-800',
    blocked: 'bg-red-100 text-red-800',
    // Payment statuses
    received: 'bg-blue-100 text-blue-800',
    cleared: 'bg-green-100 text-green-800',
    bounced: 'bg-red-100 text-red-800',
    // Alert severities
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    // Maintenance statuses
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    // Enquiry statuses
    new: 'bg-purple-100 text-purple-800',
    quoted: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    lost: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getDaysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function generateTripNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TRP-${year}-${random}`;
}

export function generateLRNumber(): string {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LR-${random}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${random}`;
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
