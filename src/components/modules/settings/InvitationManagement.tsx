// InvitationManagement — Manage organization invitations.
// Uses Edge Functions for all mutations (never writes directly to invitation table).

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useOrganization } from '../../../contexts/OrganizationContext';
import { usePermissions } from '../../../hooks/usePermissions';
import { useBranch } from '../../../contexts/BranchContext';
import { showToast } from '../../ui/Toast';
import { Send, RefreshCw, XCircle, Copy, Clock, CheckCircle, Loader2, Plus, X } from 'lucide-react';
import type { OrganizationRole } from '../../../types/organization';

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  send_count: number;
  last_sent_at: string;
  created_at: string;
  has_all_branch_access: boolean;
}

const INVITABLE_ROLES: { value: OrganizationRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'operations_manager', label: 'Operations Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'maintenance_manager', label: 'Maintenance Manager' },
  { value: 'hr_manager', label: 'HR Manager' },
  { value: 'driver', label: 'Driver' },
  { value: 'viewer', label: 'Viewer' },
];

export default function InvitationManagement() {
  const { organizationId, role } = useOrganization();
  const { can } = usePermissions();
  const { accessibleBranches } = useBranch();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('dispatcher');
  const [inviteBranches, setInviteBranches] = useState<string[]>([]);
  const [inviteAllBranches, setInviteAllBranches] = useState(false);

  const canInvite = role === 'organization_owner' || role === 'admin';

  // Load pending invitations
  const loadInvitations = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('organization_invitations')
      .select('id, email, role, status, expires_at, send_count, last_sent_at, created_at, has_all_branch_access')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (!error && data) setInvitations(data);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  // Send invitation via Edge Function
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRole || !organizationId) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast('error', 'Not authenticated'); setSending(false); return; }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-organization-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            organization_id: organizationId,
            email: inviteEmail.toLowerCase().trim(),
            role: inviteRole,
            branch_ids: inviteBranches,
            has_all_branch_access: inviteAllBranches,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('success', `Invitation sent to ${inviteEmail}`);
        setShowModal(false);
        setInviteEmail('');
        setInviteRole('dispatcher');
        setInviteBranches([]);
        setInviteAllBranches(false);
        await loadInvitations();
      } else {
        showToast('error', result.error || 'Failed to send invitation');
      }
    } catch {
      showToast('error', 'Network error');
    }
    setSending(false);
  };

  // Resend invitation
  const handleResend = async (invitationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resend-organization-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ invitation_id: invitationId }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        showToast('success', 'Invitation resent');
        await loadInvitations();
      } else {
        showToast('error', result.error || 'Failed to resend');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  // Revoke invitation
  const handleRevoke = async (invitationId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revoke-organization-invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ invitation_id: invitationId }),
        }
      );

      const result = await response.json();
      if (response.ok && result.success) {
        showToast('success', 'Invitation revoked');
        await loadInvitations();
      } else {
        showToast('error', result.error || 'Failed to revoke');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === 'pending' && new Date(expiresAt) < new Date()) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Expired</span>;
    }
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || ''}`}>{status}</span>;
  };

  if (!canInvite) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        Only organization owners and admins can manage invitations.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Invitations</h3>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> Send Invitation
        </button>
      </div>

      {/* Invitation list */}
      {loading ? (
        <div className="text-center py-8"><Loader2 size={24} className="animate-spin text-blue-600 mx-auto" /></div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No invitations yet</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Sent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Expires</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{inv.email}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{inv.role.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{getStatusBadge(inv.status, inv.expires_at)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {inv.send_count}x
                    <span className="text-xs text-slate-400 ml-1">
                      ({new Date(inv.last_sent_at).toLocaleDateString()})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === 'pending' && (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleResend(inv.id)}
                          className="p-1.5 hover:bg-blue-50 rounded text-blue-600"
                          title="Resend"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-red-600"
                          title="Revoke"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    )}
                    {inv.status === 'accepted' && <CheckCircle size={14} className="text-green-500 ml-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Invitation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Send Invitation</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="colleague@company.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {role === 'organization_owner' && (
                    <option value="organization_owner">Organization Owner</option>
                  )}
                  {INVITABLE_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={inviteAllBranches}
                    onChange={(e) => setInviteAllBranches(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-700">Grant access to all branches</span>
                </label>
              </div>
              {!inviteAllBranches && accessibleBranches.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch Access</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {accessibleBranches.map(branch => (
                      <label key={branch.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={inviteBranches.includes(branch.id)}
                          onChange={(e) => {
                            if (e.target.checked) setInviteBranches([...inviteBranches, branch.id]);
                            else setInviteBranches(inviteBranches.filter(id => id !== branch.id));
                          }}
                          className="rounded border-slate-300"
                        />
                        <span className="text-slate-700">{branch.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
