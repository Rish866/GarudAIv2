// Hook to sync Zustand store with Supabase
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { performInitialSync, syncVehicleToSupabase, syncAlertToSupabase, testSupabaseConnection } from './supabase';
import { formatCurrency } from './utils';

export function useSupabaseSync() {
  const vehicles = useStore((s) => s.vehicles);
  const alerts = useStore((s) => s.alerts);
  const trips = useStore((s) => s.trips);
  const invoices = useStore((s) => s.invoices);
  const isLoggedIn = useStore((s) => s.isLoggedIn);
  const initialSyncDone = useRef(false);

  // Initial sync on login
  useEffect(() => {
    if (!isLoggedIn || initialSyncDone.current) return;
    
    const doSync = async () => {
      const { connected, message } = await testSupabaseConnection();
      if (connected) {
        console.log('🟢 Supabase:', message);
        const outstanding = invoices.reduce((sum, inv) => sum + inv.balance_amount, 0);
        await performInitialSync(
          vehicles,
          alerts,
          trips.length,
          formatCurrency(outstanding)
        );
        initialSyncDone.current = true;
      } else {
        console.log('🟡 Supabase offline:', message, '— using localStorage only');
      }
    };

    doSync();
  }, [isLoggedIn]);

  // Sync vehicles when they change (debounced)
  const vehicleSyncTimeout = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (!initialSyncDone.current) return;
    
    clearTimeout(vehicleSyncTimeout.current);
    vehicleSyncTimeout.current = setTimeout(() => {
      vehicles.forEach(v => {
        syncVehicleToSupabase(v);
      });
    }, 2000); // 2 second debounce

    return () => clearTimeout(vehicleSyncTimeout.current);
  }, [vehicles]);

  // Sync new alerts
  const prevAlertCount = useRef(alerts.length);
  useEffect(() => {
    if (!initialSyncDone.current) return;
    
    if (alerts.length > prevAlertCount.current) {
      // New alert added - sync it
      const newAlert = alerts[0]; // Most recent
      syncAlertToSupabase(newAlert);
    }
    prevAlertCount.current = alerts.length;
  }, [alerts]);
}
