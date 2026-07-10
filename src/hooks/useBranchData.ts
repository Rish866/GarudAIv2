import { useStore } from '../store/useStore';

/**
 * Hook that returns all store data filtered by the active branch.
 * If activeBranch is empty or 'all', returns all data (no filter).
 * Entities without a branch_id are shown in all branches (shared data).
 */
export function useBranchData() {
  const {
    vehicles,
    drivers,
    customers,
    trips,
    invoices,
    payments,
    expenses,
    fuelEntries,
    maintenance,
    alerts,
    enquiries,
    quotations,
    notifications,
    activeBranch,
  } = useStore();

  const filterByBranch = <T extends { branch_id?: string }>(items: T[]): T[] => {
    if (!activeBranch || activeBranch === 'all') return items;
    return items.filter(item => !item.branch_id || item.branch_id === activeBranch);
  };

  return {
    vehicles: filterByBranch(vehicles),
    drivers: filterByBranch(drivers),
    customers: filterByBranch(customers),
    trips: filterByBranch(trips),
    invoices: filterByBranch(invoices),
    payments: filterByBranch(payments),
    expenses: filterByBranch(expenses),
    fuelEntries: filterByBranch(fuelEntries),
    maintenance: filterByBranch(maintenance),
    alerts, // alerts are company-wide
    enquiries: filterByBranch(enquiries),
    quotations, // quotations are company-wide
    notifications, // notifications are company-wide
    activeBranch,
  };
}
