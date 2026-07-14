// InviteAcceptPage — Handles the /invite/accept?token=... route.
//
// States:
// 1. Token missing → show error
// 2. User not signed in → show login form, preserve token
// 3. Processing → loading spinner
// 4. Success → redirect to dashboard
// 5. Error (expired/revoked/invalid/mismatch) → show specific message
//
// Security:
// - Raw token is sent only to the Edge Function (never logged or stored in DB)
// - Token cleared from sessionStorage after successful acceptance
// - Duplicate acceptance is idempotent

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { signIn } from '../lib/auth';
import { CheckCircle, XCircle, Clock, Loader2, LogIn, UserPlus, AlertTriangle } from 'lucide-react';

type AcceptState = 'loading' | 'needs_auth' | 'processing' | 'success' | 'error';

const TOKEN_STORAGE_KEY = 'garud_invite_token';

export default function InviteAcceptPage() {
  const [state, setState] = useState<AcceptState>('loading');
  const [error, setError] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('');
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Get token from URL or sessionStorage (preserved across login redirect)
  const getToken = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      // Preserve in sessionStorage for post-login flow
      sessionStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
      return urlToken;
    }
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  };

  useEffect(() => {
    checkAuthAndProcess();
  }, []);

  const checkAuthAndProcess = async () => {
    const token = getToken();
    if (!token) {
      setState('error');
      setError('No invitation token found. Please use the link from your invitation email.');
      return;
    }

    // Check if user is signed in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setState('needs_auth');
      return;
    }

    // User is signed in — process the invitation
    await processInvitation(token);
  };

  const processInvitation = async (token: string) => {
    setState('processing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState('needs_auth');
        return;
      }

      // Call the accept Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-organization-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ token }),
        }
      );

      const result = await response.json();

      if (result.success) {
        // Clear stored token
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);

        setAlreadyMember(result.already_member === true);
        setOrgName(result.organization_name || '');
        setRole(result.role || '');
        setState('success');

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          window.location.href = '/#dashboard';
          window.location.reload();
        }, 3000);
      } else {
        setState('error');
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (e: any) {
      setState('error');
      setError('Network error. Please try again.');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        const result = await signIn(email, password);
        if (!result.success) {
          setAuthError(result.error || 'Login failed');
          setAuthLoading(false);
          return;
        }
      } else {
        // Signup
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: email.split('@')[0] } },
        });
        if (error) {
          setAuthError(error.message);
          setAuthLoading(false);
          return;
        }
      }

      // After successful auth, process the invitation
      const token = getToken();
      if (token) {
        await processInvitation(token);
      }
    } catch (e: any) {
      setAuthError('Authentication failed. Please try again.');
    }
    setAuthLoading(false);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UserPlus size={24} className="text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Organization Invitation</h1>
        </div>

        {/* Loading */}
        {state === 'loading' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Verifying invitation...</p>
          </div>
        )}

        {/* Processing */}
        {state === 'processing' && (
          <div className="flex flex-col items-center py-8">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Accepting invitation...</p>
          </div>
        )}

        {/* Needs Authentication */}
        {state === 'needs_auth' && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-700">
              Please sign in or create an account to accept this invitation.
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {authError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : authMode === 'login' ? (
                  <><LogIn size={16} /> Sign In & Accept</>
                ) : (
                  <><UserPlus size={16} /> Create Account & Accept</>
                )}
              </button>

              <p className="text-center text-sm text-slate-500">
                {authMode === 'login' ? (
                  <>Don't have an account? <button type="button" onClick={() => setAuthMode('signup')} className="text-blue-600 font-medium">Sign up</button></>
                ) : (
                  <>Already have an account? <button type="button" onClick={() => setAuthMode('login')} className="text-blue-600 font-medium">Sign in</button></>
                )}
              </p>
            </form>
          </div>
        )}

        {/* Success */}
        {state === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              {alreadyMember ? 'Already a Member' : 'Invitation Accepted!'}
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              {alreadyMember
                ? 'You are already a member of this organization.'
                : `You've joined${orgName ? ` ${orgName}` : ''} as ${role ? role.replace(/_/g, ' ') : 'a team member'}.`
              }
            </p>
            <p className="text-xs text-slate-400">Redirecting to dashboard...</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {error.includes('expired') ? (
                <Clock size={32} className="text-red-600" />
              ) : (
                <XCircle size={32} className="text-red-600" />
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Invitation Error</h2>
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <a href="/" className="text-sm text-blue-600 font-medium hover:underline">
              Go to homepage
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
