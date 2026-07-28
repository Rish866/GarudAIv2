// ============================================================
// AUTH CONTEXT — Single source of truth for authentication state
//
// ARCHITECTURE:
// - onAuthStateChange is the ONLY source of truth
// - NO separate getSession() call (avoids race conditions)
// - Session persists across refresh/back/hard-reload (Supabase handles storage)
// - Loading guard prevents flash of login page
// - Protected routes render ONLY when auth is confirmed
//
// WHY THIS FIXES THE REDIRECT BUG:
// Old approach: getSession() + onAuthStateChange = race condition
// New approach: onAuthStateChange fires INITIAL_SESSION on mount with
//   the restored session — this is the ONLY place we read auth state.
// ============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, supabaseConfigurationError } from '../lib/supabase';
import { useStore } from '../store/useStore';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthState {
  /** Whether we're still waiting for the initial auth check */
  loading: boolean;
  /** The current Supabase session (null if not authenticated) */
  session: Session | null;
  /** The current Supabase user (null if not authenticated) */
  user: SupabaseUser | null;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Sign out the user */
  signOut: () => Promise<void>;
  /** Configuration error (Supabase not configured) */
  configError: string | null;
  /** Password recovery mode */
  isPasswordRecovery: boolean;
  /** Clear password recovery mode */
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  session: null,
  user: null,
  isAuthenticated: false,
  signOut: async () => {},
  configError: null,
  isPasswordRecovery: false,
  clearPasswordRecovery: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const { login, logout } = useStore();

  useEffect(() => {
    if (supabaseConfigurationError) {
      setLoading(false);
      return;
    }

    // onAuthStateChange is the SINGLE source of truth.
    // It fires INITIAL_SESSION on mount with the restored session.
    // It fires SIGNED_IN after login.
    // It fires SIGNED_OUT after logout.
    // It fires TOKEN_REFRESHED when the JWT is refreshed.
    // It fires PASSWORD_RECOVERY when user clicks reset link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      // Always update session state
      setSession(currentSession);

      if (event === 'INITIAL_SESSION') {
        // This fires ONCE on mount with the restored session (or null if not authenticated)
        if (currentSession?.user) {
          login({
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || '',
            email: currentSession.user.email || '',
            role: 'operations',
            phone: '',
            status: 'active',
          });
        } else {
          logout();
        }
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        if (currentSession?.user) {
          login({
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || '',
            email: currentSession.user.email || '',
            role: 'operations',
            phone: '',
            status: 'active',
          });
        }
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        logout();
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed silently — update session but don't change UI
        if (currentSession?.user) {
          login({
            id: currentSession.user.id,
            name: currentSession.user.user_metadata?.name || currentSession.user.email?.split('@')[0] || '',
            email: currentSession.user.email || '',
            role: 'operations',
            phone: '',
            status: 'active',
          });
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Empty deps — subscribe once on mount

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    // State will be cleared by the SIGNED_OUT event handler above
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const value: AuthState = {
    loading,
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    signOut: handleSignOut,
    configError: supabaseConfigurationError,
    isPasswordRecovery,
    clearPasswordRecovery,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state. Must be used within AuthProvider.
 */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
