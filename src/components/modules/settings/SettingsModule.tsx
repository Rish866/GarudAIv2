import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { testSupabaseConnection } from '../../../lib/supabase';
import { canAccessModule, getRoleLabel } from '../../../lib/rbac';
import type { UserRole, ModuleName } from '../../../types';
import { Plus, X, Trash2, Edit, Users, Shield, CheckCircle } from 'lucide-react';

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
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
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'roles'>('company');

  // User management state
  const [users, setUsers] = useState<ManagedUser[]>([
    { id: 'user_001', name: 'Rajesh Sharma', email: 'rajesh@garudtransport.in', phone: '+91 98765 43210', role: 'super_admin', status: 'active' },
    { id: 'user_002', name: 'Priya Mehta', email: 'priya@garudtransport.in', phone: '+91 98765 54321', role: 'admin', status: 'active' },
    { id: 'user_003', name: 'Amit Sharma', email: 'amit@garudtransport.in', phone: '+91 98765 65432', role: 'operations', status: 'active' },
    { id: 'user_004', name: 'Kavita Desai', email: 'kavita@garudtransport.in', phone: '+91 98765 76543', role: 'accounts', status: 'active' },
    { id: 'user_005', name: 'Suresh Kumar', email: 'suresh.driver@garudtransport.in', phone: '+91 98765 11111', role: 'driver', status: 'active' },
  ]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', role: 'operations' as UserRole });
  const [selectedRole, setSelectedRole] = useState<UserRole>('super_admin');

  useEffect(() => {
    testSupabaseConnection().then(setDbStatus);
  }, []);

  const [companyForm, setCompanyForm] = useState({
    name: company.name,
    address: company.address,
    city: company.city,
    state: company.state,
    gstin: company.gstin,
    pan: company.pan,
    phone: company.phone,
    email: company.email,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetDemo = () => {
    window.location.reload();
  };

  const handleAddUser = () => {
    if (!userForm.name || !userForm.email) return;
    setUsers([...users, { id: 'user_' + Date.now().toString(36), ...userForm, status: 'active' }]);
    setShowUserModal(false);
    setUserForm({ name: '', email: '', phone: '', role: 'operations' });
  };

  const handleDeleteUser = (id: string) => {
    if (id === user.id) return;
    setUsers(users.filter(u => u.id !== id));
  };

  const handleChangeRole = (id: string, role: UserRole) => {
    setUsers(users.map(u => u.id === id ? { ...u, role } : u));
  };

  const handleToggleStatus = (id: string) => {
    if (id === user.id) return;
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u));
  };

  const roleColors: Record<UserRole, string> = {
    super_admin: 'bg-red-100 text-red-800',
    admin: 'bg-blue-100 text-blue-800',
    operations: 'bg-purple-100 text-purple-800',
    fleet_manager: 'bg-teal-100 text-teal-800',
    accounts: 'bg-green-100 text-green-800',
    driver: 'bg-gray-100 text-gray-800',
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage users who can access your ERP. Assign roles to control what they see.</p>
            <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Name</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Email</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Role</th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                  <th className="text-center px-4 py-3 text-xs font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name} {u.id === user.id && <span className="text-xs text-blue-600">(You)</span>}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>{u.phone}</td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)} disabled={u.id === user.id} className="px-2 py-1 border rounded text-xs" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                        {ALL_ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggleStatus(u.id)} disabled={u.id === user.id} className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.status}</button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.id !== user.id && <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 rounded hover:bg-red-50"><Trash2 className="w-4 h-4 text-red-400" /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add User Modal */}
          {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowUserModal(false)} />
              <div className="relative rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Add User</h2>
                  <button onClick={() => setShowUserModal(false)} className="p-1 rounded-lg hover:opacity-70"><X className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                    <input type="text" value={userForm.name} onChange={(e) => setUserForm({...userForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email *</label>
                    <input type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                    <input type="text" value={userForm.phone} onChange={(e) => setUserForm({...userForm, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role *</label>
                    <select value={userForm.role} onChange={(e) => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {ALL_ROLES.map(r => <option key={r} value={r}>{getRoleLabel(r)}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAddUser} className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create User</button>
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
