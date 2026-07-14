import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../../store/useStore';
import { supabase, testSupabaseConnection } from '../../../lib/supabase';
import { canAccessModule, getRoleLabel, getOrgRoleLabel, getAllOrganizationRoles } from '../../../lib/rbac';
import type { UserRole, ModuleName } from '../../../types';
import type { OrganizationRole } from '../../../types/organization';
import { Plus, X, Trash2, Edit, Users, Shield, CheckCircle, Mail, Clock, RefreshCw, Ban, UserCheck } from 'lucide-react';
import { useOrganization } from '../../../hooks/useOrganization';
import { inviteUser, updateOrganization } from '../../../services/organizationService';
import { showToast } from '../../ui/Toast';

interface OrgMember {
  id: string;
  user_id: string;
  role: OrganizationRole;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  user_profiles?: { full_name: string | null; phone: string | null } | null;
  email?: string;
}

interface OrgInvitation {
  id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
}

const ALL_ROLES: UserRole[] = ['super_admin', 'admin', 'operations', 'fleet_manager', 'accounts', 'driver'];

const ALL_MODULES: { id: ModuleName; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' }, { id: 'fleet', label: 'Fleet' }, { id: 'trips', label: 'Trips' },
  { id: 'drivers', label: 'Drivers' }, { id: 'customers', label: 'Customers' }, { id: 'billing', label: 'Billing' },
  { id: 'fuel', label: 'Fuel' }, { id: 'maintenance', label: 'Maintenance' }, { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' }, { id: 'enquiries', label: 'Enquiries' }, { id: 'tyres', label: 'Tyres' },
  { id: 'payroll', label: 'Payroll' }, { id: 'documents', label: 'Documents' }, { id: 'gps', label: 'GPS' },
  { id: 'accounts', label: 'Cash & Bank' }, { id: 'purchases', label: 'Purchases' }, { id: 'sales', label: 'Sales' },
  { id: 'inventory', label: 'Inventory' }, { id: 'ewaybill', label: 'E-Way Bill' }, { id: 'audittrail', label: 'Audit Trail' },
  { id: 'portal', label: 'Customer Portal' }, { id: 'pnl', label: 'P&L' }, { id: 'gstreports', label: 'GST Reports' },
  { id: 'vendors', label: 'Vendors' }, { id: 'routes', label: 'Routes' }, { id: 'indents', label: 'Indents' },
  { id: 'attendance', label: 'Attendance' }, { id: 'creditblock', label: 'Credit Control' },
  { id: 'transfers', label: 'Transfers' }, { id: 'restapi', label: 'REST API' },
  { id: 'predictive', label: 'AI Analytics' }, { id: 'mobileapp', label: 'Mobile App' },
];

export default function SettingsModule() {
  const { company, user } = useStore();
  const { organizationId, organization, role: currentUserRole } = useOrganization();
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'roles'>('company');

  // Real Supabase-backed user management
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<OrgInvitation[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'dispatcher' as OrganizationRole });
  const [inviting, setInviting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');

  // Load members from Supabase
  const loadMembers = useCallback(async () => {
    if (!organizationId) return;
    setMembersLoading(true);

    // Load members with user profiles
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, created_at, user_profiles(full_name, phone)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (memberData) {
      // Get emails from auth metadata where possible
      const enriched: OrgMember[] = memberData.map((m: any) => ({
        ...m,
        user_profiles: m.user_profiles,
        email: '', // Email comes from auth, not accessible via client - show user_id prefix
      }));
      setMembers(enriched);
    }

    // Load pending invitations
    const { data: invData } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });

    if (invData) setInvitations(invData);
    setMembersLoading(false);
  }, [organizationId]);

  useEffect(() => {
    testSupabaseConnection().then(setDbStatus);
  }, []);

  useEffect(() => {
    if (activeTab === 'users') loadMembers();
  }, [activeTab, loadMembers]);

  // Invite a new user
  const handleInviteUser = async () => {
    if (!inviteForm.email || !organizationId) return;
    setInviting(true);
    const result = await inviteUser(organizationId, inviteForm.email, inviteForm.role);
    setInviting(false);
    if (result.success) {
      showToast('success', `Invitation sent to ${inviteForm.email}`);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'dispatcher' });
      loadMembers();
    } else {
      showToast('error', result.error || 'Failed to send invitation');
    }
  };

  // Revoke invitation
  const handleRevokeInvitation = async (invId: string) => {
    await supabase.from('organization_invitations').update({ status: 'cancelled' }).eq('id', invId);
    showToast('success', 'Invitation revoked');
    loadMembers();
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: OrganizationRole) => {
    // Prevent unauthorized role escalation
    if (currentUserRole !== 'organization_owner' && currentUserRole !== 'admin') {
      showToast('error', 'Only owners and admins can change roles');
      return;
    }
    // Prevent changing own role
    const member = members.find(m => m.id === memberId);
    if (member?.user_id === user.id) {
      showToast('error', 'Cannot change your own role');
      return;
    }
    await supabase.from('organization_members').update({ role: newRole }).eq('id', memberId);
    showToast('success', 'Role updated');
    loadMembers();
  };

  // Deactivate/reactivate member
  const handleToggleMemberStatus = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (member.user_id === user.id) {
      showToast('error', 'Cannot deactivate yourself');
      return;
    }
    const newStatus = member.status === 'active' ? 'inactive' : 'active';
    await supabase.from('organization_members').update({ status: newStatus }).eq('id', memberId);
    showToast('success', newStatus === 'active' ? 'Member reactivated' : 'Member deactivated');
    loadMembers();
  };

  // Remove member (with owner protection)
  const handleRemoveMember = async (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (member.user_id === user.id) {
      showToast('error', 'Cannot remove yourself');
      return;
    }
    // Prevent removing the last owner
    if (member.role === 'organization_owner') {
      const ownerCount = members.filter(m => m.role === 'organization_owner' && m.status === 'active').length;
      if (ownerCount <= 1) {
        showToast('error', 'Cannot remove the last organization owner');
        return;
      }
    }
    await supabase.from('organization_members').delete().eq('id', memberId);
    showToast('success', 'Member removed');
    loadMembers();
  };

  const roleColors: Record<UserRole, string> = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-blue-100 text-blue-800',
    operations: 'bg-purple-100 text-purple-800',
    fleet_manager: 'bg-teal-100 text-teal-800',
    accounts: 'bg-green-100 text-green-800',
    driver: 'bg-gray-100 text-gray-800',
  };

  // Company profile form (persists to Supabase organizations table)
  const [companyForm, setCompanyForm] = useState({
    name: organization?.name || company.name || '',
    address: organization?.address || company.address || '',
    city: organization?.city || company.city || '',
    state: organization?.state || company.state || '',
    gstin: organization?.gstin || company.gstin || '',
    pan: organization?.pan || company.pan || '',
    phone: organization?.phone || company.phone || '',
    email: organization?.email || company.email || '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!organizationId) return;
    const result = await updateOrganization(organizationId, {
      name: companyForm.name,
      address: companyForm.address,
      city: companyForm.city,
      state: companyForm.state,
      gstin: companyForm.gstin,
      pan: companyForm.pan,
      phone: companyForm.phone,
      email: companyForm.email,
    });
    if (result.success) {
      setSaved(true);
      showToast('success', 'Company profile updated');
      setTimeout(() => setSaved(false), 2000);
    } else {
      showToast('error', result.error || 'Failed to save');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: 'var(--border-color)' }}>
        {([
          { id: 'company', label: 'Company Profile' },
          { id: 'users', label: 'User Management' },
          { id: 'roles', label: 'Roles & Permissions' },
        ] as { id: 'company' | 'users' | 'roles'; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 text-sm rounded-lg font-medium ${activeTab === t.id ? 'bg-blue-600 text-white' : ''}`} style={activeTab !== t.id ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Company Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
              <input type="text" value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
              <input type="text" value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>


            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input type="text" value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <input type="text" value={companyForm.state} onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
                <input type="text" value={companyForm.gstin} onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">PAN</label>
                <input type="text" value={companyForm.pan} onChange={(e) => setCompanyForm({ ...companyForm, pan: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input type="text" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="text" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-3">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700">
              Save Changes
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">Saved successfully!</span>}
          </div>
        </div>


        {/* User Profile */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">User Profile</h3>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xl font-bold text-blue-600">{user.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Role</span>
                <span className="font-medium text-slate-700 capitalize">{user.role.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Phone</span>
                <span className="font-medium text-slate-700">{user.phone}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Status</span>
                <span className="font-medium text-green-600 capitalize">{user.status}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* USER MANAGEMENT TAB */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Team Members</h3>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Manage who can access your organization</p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadMembers} className="p-2 border rounded-lg hover:bg-slate-50" style={{ borderColor: 'var(--border-color)' }} title="Refresh">
                <RefreshCw size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Mail size={16} /> Invite User
              </button>
            </div>
          </div>

          {/* Active Members */}
          {membersLoading ? (
            <div className="text-center py-8 text-slate-400">Loading members...</div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Member</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Role</th>
                    <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                    <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(m => (
                    <tr key={m.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {m.user_profiles?.full_name || 'User'}
                          {m.user_id === user.id && <span className="ml-1 text-xs text-blue-600">(You)</span>}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>ID: {m.user_id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value as OrganizationRole)}
                          disabled={m.user_id === user.id}
                          className="px-2 py-1 border rounded text-xs"
                          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        >
                          {getAllOrganizationRoles().map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.user_id !== user.id && (
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleToggleMemberStatus(m.id)} className="p-1.5 rounded hover:bg-slate-100" title={m.status === 'active' ? 'Deactivate' : 'Reactivate'}>
                              {m.status === 'active' ? <Ban size={14} className="text-orange-500" /> : <UserCheck size={14} className="text-green-500" />}
                            </button>
                            <button onClick={() => handleRemoveMember(m.id)} className="p-1.5 rounded hover:bg-red-50" title="Remove">
                              <Trash2 size={14} className="text-red-400" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No members found</div>
              )}
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                <Clock size={14} className="inline mr-1.5" />Pending Invitations
              </h4>
              <div className="space-y-2">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between px-4 py-3 rounded-lg border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{inv.email}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Role: {inv.role} &bull; Expires: {new Date(inv.expires_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => handleRevokeInvitation(inv.id)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 font-medium">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite User Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
              <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Invite Team Member</h2>
                  <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-lg hover:opacity-70"><X size={18} style={{ color: 'var(--text-tertiary)' }} /></button>
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>They will receive an email invitation to join your organization.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email Address *</label>
                    <input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})} placeholder="colleague@company.com" className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role *</label>
                    <select value={inviteForm.role} onChange={(e) => setInviteForm({...inviteForm, role: e.target.value as OrganizationRole})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {getAllOrganizationRoles().map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleInviteUser} disabled={inviting || !inviteForm.email} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {inviting ? 'Sending...' : 'Send Invitation'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ROLES & PERMISSIONS TAB */}
      {activeTab === 'roles' && (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View module access for each role. Permissions are enforced across the entire ERP.</p>

          {/* Role Selector */}
          <div className="flex gap-2 flex-wrap">
            {ALL_ROLES.map(r => (
              <button key={r} onClick={() => setSelectedRole(r)} className={`px-4 py-2 text-sm rounded-lg font-medium ${selectedRole === r ? 'bg-blue-600 text-white' : ''}`} style={selectedRole !== r ? { color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' } : undefined}>
                <Shield className="w-3.5 h-3.5 inline mr-1.5" />{getRoleLabel(r)}
              </button>
            ))}
          </div>

          {/* Permission Matrix */}
          <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{getRoleLabel(selectedRole)}</h3>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {canAccessModule(selectedRole, 'settings') ? 'Full admin access' : `Access to ${ALL_MODULES.filter(m => canAccessModule(selectedRole, m.id)).length} of ${ALL_MODULES.length} modules`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {ALL_MODULES.map(mod => {
                const hasAccess = canAccessModule(selectedRole, mod.id);
                return (
                  <div key={mod.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${hasAccess ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-400'}`}>
                    {hasAccess ? <CheckCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    {mod.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role Descriptions */}
          <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Role Descriptions</h3>
            <div className="space-y-3">
              {[
                { role: 'super_admin', desc: 'Full system access. Can manage users, roles, settings, and all modules.' },
                { role: 'admin', desc: 'Same as Super Admin but cannot modify other Super Admins.' },
                { role: 'operations', desc: 'Manages fleet operations — trips, vehicles, drivers, documents, GPS.' },
                { role: 'fleet_manager', desc: 'Focused on fleet health — vehicles, maintenance, fuel, tyres, GPS.' },
                { role: 'accounts', desc: 'Handles financial modules — billing, payments, GST, P&L, payroll.' },
                { role: 'driver', desc: 'Minimal access — can only view their own trips and notifications.' },
              ].map(item => (
                <div key={item.role} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium shrink-0 ${roleColors[item.role as UserRole]}`}>{getRoleLabel(item.role as UserRole)}</span>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
