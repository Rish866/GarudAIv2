// Full Supabase Sync Hook — Syncs ALL store data to Supabase
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { testSupabaseConnection } from './supabase';
import { performFullSync, syncVehicles, syncTrips, syncInvoices, syncPayments, syncDrivers, syncCustomers, syncExpenses, syncFuelEntries, syncMaintenance, syncEnquiries, syncQuotations, syncActivityLog, syncNotifications } from './supabaseFullSync';

export function useSupabaseSync() {
  const vehicles = useStore((s) => s.vehicles);
  const drivers = useStore((s) => s.drivers);
  const customers = useStore((s) => s.customers);
  const trips = useStore((s) => s.trips);
  const invoices = useStore((s) => s.invoices);
  const payments = useStore((s) => s.payments);
  const expenses = useStore((s) => s.expenses);
  const fuelEntries = useStore((s) => s.fuelEntries);
  const maintenance = useStore((s) => s.maintenance);
  const enquiries = useStore((s) => s.enquiries);
  const quotations = useStore((s) => s.quotations);
  const activityLog = useStore((s) => s.activityLog);
  const notifications = useStore((s) => s.notifications);
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  const isConnected = useRef(false);
  const initialSyncDone = useRef(false);
  const syncTimeout = useRef<NodeJS.Timeout>();


  // Initial full sync on login
  useEffect(() => {
    if (!isLoggedIn || initialSyncDone.current) return;

    const doSync = async () => {
      const { connected, message } = await testSupabaseConnection();
      if (connected) {
        console.log('🟢 Supabase connected:', message);
        isConnected.current = true;

        // Full sync — push all data to Supabase
        await performFullSync({
          vehicles,
          drivers,
          customers,
          trips,
          invoices,
          payments,
          expenses,
          fuelEntries,
          maintenance,
          enquiries,
          quotations,
          activityLog,
          notifications,
        });
        initialSyncDone.current = true;
      } else {
        console.log('🟡 Supabase offline:', message, '— using localStorage only');
        isConnected.current = false;
      }
    };

    doSync();
  }, [isLoggedIn]);

  // Debounced incremental sync when data changes
  const debouncedSync = useCallback((table: string, syncFn: () => Promise<boolean>) => {
    if (!isConnected.current || !initialSyncDone.current) return;
    clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async () => {
      await syncFn();
    }, 3000); // 3 second debounce
  }, []);

  // Watch vehicles
  const prevVehicleCount = useRef(vehicles.length);
  useEffect(() => {
    if (vehicles.length !== prevVehicleCount.current) {
      debouncedSync('vehicles', () => syncVehicles(vehicles));
      prevVehicleCount.current = vehicles.length;
    }
  }, [vehicles, debouncedSync]);

  // Watch trips
  const prevTripCount = useRef(trips.length);
  useEffect(() => {
    if (trips.length !== prevTripCount.current) {
      debouncedSync('trips', () => syncTrips(trips));
      prevTripCount.current = trips.length;
    }
  }, [trips, debouncedSync]);

  // Watch invoices
  const prevInvCount = useRef(invoices.length);
  useEffect(() => {
    if (invoices.length !== prevInvCount.current) {
      debouncedSync('invoices', () => syncInvoices(invoices));
      prevInvCount.current = invoices.length;
    }
  }, [invoices, debouncedSync]);

  // Watch payments
  const prevPayCount = useRef(payments.length);
  useEffect(() => {
    if (payments.length !== prevPayCount.current) {
      debouncedSync('payments', () => syncPayments(payments));
      prevPayCount.current = payments.length;
    }
  }, [payments, debouncedSync]);

  // Watch drivers
  const prevDrvCount = useRef(drivers.length);
  useEffect(() => {
    if (drivers.length !== prevDrvCount.current) {
      debouncedSync('drivers', () => syncDrivers(drivers));
      prevDrvCount.current = drivers.length;
    }
  }, [drivers, debouncedSync]);

  // Watch customers
  const prevCustCount = useRef(customers.length);
  useEffect(() => {
    if (customers.length !== prevCustCount.current) {
      debouncedSync('customers', () => syncCustomers(customers));
      prevCustCount.current = customers.length;
    }
  }, [customers, debouncedSync]);


  // Watch expenses
  const prevExpCount = useRef(expenses.length);
  useEffect(() => {
    if (expenses.length !== prevExpCount.current) {
      debouncedSync('expenses', () => syncExpenses(expenses));
      prevExpCount.current = expenses.length;
    }
  }, [expenses, debouncedSync]);

  // Watch fuel entries
  const prevFuelCount = useRef(fuelEntries.length);
  useEffect(() => {
    if (fuelEntries.length !== prevFuelCount.current) {
      debouncedSync('fuel_entries', () => syncFuelEntries(fuelEntries));
      prevFuelCount.current = fuelEntries.length;
    }
  }, [fuelEntries, debouncedSync]);

  // Watch maintenance
  const prevMaintCount = useRef(maintenance.length);
  useEffect(() => {
    if (maintenance.length !== prevMaintCount.current) {
      debouncedSync('maintenance', () => syncMaintenance(maintenance));
      prevMaintCount.current = maintenance.length;
    }
  }, [maintenance, debouncedSync]);

  // Watch enquiries
  const prevEnqCount = useRef(enquiries.length);
  useEffect(() => {
    if (enquiries.length !== prevEnqCount.current) {
      debouncedSync('enquiries', () => syncEnquiries(enquiries));
      prevEnqCount.current = enquiries.length;
    }
  }, [enquiries, debouncedSync]);

  // Watch quotations
  const prevQuotCount = useRef(quotations.length);
  useEffect(() => {
    if (quotations.length !== prevQuotCount.current) {
      debouncedSync('quotations', () => syncQuotations(quotations));
      prevQuotCount.current = quotations.length;
    }
  }, [quotations, debouncedSync]);

  // Watch activity log
  const prevLogCount = useRef(activityLog.length);
  useEffect(() => {
    if (activityLog.length !== prevLogCount.current) {
      debouncedSync('activity_log', () => syncActivityLog(activityLog));
      prevLogCount.current = activityLog.length;
    }
  }, [activityLog, debouncedSync]);

  // Watch notifications
  const prevNotifCount = useRef(notifications.length);
  useEffect(() => {
    if (notifications.length !== prevNotifCount.current) {
      debouncedSync('notifications', () => syncNotifications(notifications));
      prevNotifCount.current = notifications.length;
    }
  }, [notifications, debouncedSync]);
}
