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
// Implementation notes:
// - Uses refs for mutable state to avoid useEffect dependency cycles
// - Single interval (10s) checks idle status — no multiple timers
// - Activity handlers use ref-based showWarning check (no re-registration)
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

  // Use refs for mutable state to avoid dependency cycles
  const lastActivityRef = useRef<number>(Date.now());
  const showWarningRef = useRef(false);
  const isLoggedInRef = useRef(isLoggedIn);

  // Keep refs in sync with state
  showWarningRef.current = showWarning;
  isLoggedInRef.current = isLoggedIn;

  // Activity handler — uses ref so it never needs to be re-created
  const handleActivity = useCallback(() => {
    // Only reset if warning is NOT showing
    if (!showWarningRef.current) {
      lastActivityRef.current = Date.now();
    }
  }, []); // Empty deps — stable function reference

  // Extend session (dismiss warning and reset timer)
  const extendSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setSecondsRemaining(0);
  }, []);

  // Logout action
  const doLogout = useCallback(async () => {
    setShowWarning(false);
    setSecondsRemaining(0);
    await performLogout();
    logout();
  }, [logout]);

  // Main effect — registers listeners and starts idle check interval
  useEffect(() => {
    if (!isLoggedIn) {
      setShowWarning(false);
      setSecondsRemaining(0);
      return;
    }

    // Reset activity timestamp on login
    lastActivityRef.current = Date.now();

    // Register activity listeners (stable handler, never re-registered)
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Single interval checks idle status every second when warning is showing,
    // every 10 seconds otherwise
    const checkInterval = setInterval(() => {
      if (!isLoggedInRef.current) return;

      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = timeoutMs - elapsed;

      if (remaining <= 0) {
        // Timeout reached — force logout
        doLogout();
      } else if (remaining <= WARNING_BEFORE_MS) {
        // Show/update warning
        if (!showWarningRef.current) {
          setShowWarning(true);
        }
        setSecondsRemaining(Math.ceil(remaining / 1000));
      } else {
        // Normal state — ensure warning is hidden
        if (showWarningRef.current) {
          setShowWarning(false);
          setSecondsRemaining(0);
        }
      }
    }, 1000); // Check every second for smooth countdown

    return () => {
      clearInterval(checkInterval);
      ACTIVITY_EVENTS.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isLoggedIn, timeoutMs, handleActivity, doLogout]);

  return { showWarning, secondsRemaining, extendSession };
}
