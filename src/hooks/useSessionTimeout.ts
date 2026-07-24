// ============================================================
// SESSION TIMEOUT HOOK
//
// Automatically logs out users after a period of inactivity.
// Default: 30 minutes of no mouse/keyboard/touch activity.
//
// Security rationale:
// - Transport offices have shared terminals
// - Prevents unauthorized access on unattended devices
// - Shows warning 2 minutes before timeout
//
// Activity events tracked: mouse, keyboard, touch, scroll, click
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { performLogout } from '../lib/auth';
import { useStore } from '../store/useStore';

/** Default timeout: 30 minutes (in milliseconds) */
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/** Warning shown 2 minutes before timeout */
const WARNING_BEFORE_MS = 2 * 60 * 1000;

/** Activity events that reset the idle timer */
const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'mousemove',
  'keydown',
  'touchstart',
  'scroll',
  'click',
];

export interface SessionTimeoutState {
  /** Whether the warning modal should be displayed */
  showWarning: boolean;
  /** Seconds remaining before auto-logout */
  secondsRemaining: number;
  /** Dismiss the warning and reset the timer */
  extendSession: () => void;
}

/**
 * Hook that monitors user activity and triggers logout on idle timeout.
 * Only active when user is logged in.
 */
export function useSessionTimeout(
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): SessionTimeoutState {
  const { isLoggedIn, logout } = useStore();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setSecondsRemaining(0);

    // Clear existing timers
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const handleActivity = useCallback(() => {
    // Only reset if warning is not showing (once warning shows, user must explicitly extend)
    if (!showWarning) {
      lastActivityRef.current = Date.now();
    }
  }, [showWarning]);

  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  const doLogout = useCallback(async () => {
    resetTimers();
    await performLogout();
    logout();
  }, [resetTimers, logout]);

  useEffect(() => {
    if (!isLoggedIn) {
      resetTimers();
      return;
    }

    // Register activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Check idle status every 10 seconds
    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // Timeout reached — force logout
        doLogout();
      } else if (remaining <= WARNING_BEFORE_MS && !showWarning) {
        // Show warning
        setShowWarning(true);
        setSecondsRemaining(Math.ceil(remaining / 1000));

        // Start countdown
        warningTimerRef.current = setInterval(() => {
          const nowRemaining = timeoutMs - (Date.now() - lastActivityRef.current);
          if (nowRemaining <= 0) {
            doLogout();
          } else {
            setSecondsRemaining(Math.ceil(nowRemaining / 1000));
          }
        }, 1000);
      }
    }, 10_000);

    return () => {
      clearInterval(checkInterval);
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      resetTimers();
    };
  }, [isLoggedIn, timeoutMs, handleActivity, showWarning, doLogout, resetTimers]);

  return { showWarning, secondsRemaining, extendSession };
}
