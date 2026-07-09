import { useState, useEffect } from 'react';
import { useStore } from '../../../store/useStore';
import { testSupabaseConnection } from '../../../lib/supabase';

export default function SettingsModule() {
  const { company, user } = useStore();
  const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string } | null>(null);

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

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Settings</h2>

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

          {/* Plan Card */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
            <h3 className="text-sm font-semibold mb-1">Current Plan</h3>
            <p className="text-2xl font-bold mb-2">Professional</p>
            <p className="text-sm text-blue-100 mb-4">Unlimited vehicles, drivers, and trips. Priority support included.</p>
            <button className="px-4 py-2 bg-white text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50">
              Upgrade Plan
            </button>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Database Connection</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${dbStatus?.connected ? 'bg-green-500 animate-pulse' : dbStatus === null ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span className="text-sm font-medium text-slate-700">
                {dbStatus === null ? 'Checking connection...' : dbStatus.connected ? 'Connected to Supabase' : 'Offline — using localStorage'}
              </span>
            </div>
            {dbStatus && (
              <p className="text-xs text-slate-500">{dbStatus.message}</p>
            )}
            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500">URL: emcynvexbauhohpwcqaw.supabase.co</p>
              <p className="text-xs text-slate-500">Tenant: garud-erp-001</p>
              <p className="text-xs text-slate-500">Tables: tenants, users, vehicles, events</p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-2xl border border-red-200 p-6">
            <h3 className="text-sm font-semibold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-slate-600 mb-4">Reset all demo data back to default. This action cannot be undone.</p>
            <button onClick={handleResetDemo} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
              Reset Demo Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
