// ============================================================
// useNavigateModule — Navigation hook for module switching
//
// Usage:
//   const navigateTo = useNavigateModule();
//   navigateTo('trips');    // Navigates to /trips
//   navigateTo('fleet');    // Navigates to /fleet
//
// This replaces the old setActiveModule(module) pattern.
// Zustand activeModule is still updated (for sidebar highlighting)
// but the URL is the source of truth.
// ============================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getPathForModule } from './routes';
import type { ModuleName } from '../types';

/**
 * Returns a function that navigates to a module by its name.
 * Updates both the URL (React Router) and the store (for sidebar highlight).
 */
export function useNavigateModule() {
  const navigate = useNavigate();
  const setActiveModule = useStore((s) => s.setActiveModule);

  return useCallback((module: ModuleName) => {
    setActiveModule(module);
    navigate(getPathForModule(module));
  }, [navigate, setActiveModule]);
}
