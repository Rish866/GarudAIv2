import React from 'react';
import { Settings, Building2, User, Shield, Bell, Database } from 'lucide-react';
import { Company, User as UserType } from '../../../types';

interface SettingsModuleProps { company: Company; user: UserType; }

export default function SettingsModule({ company, user }: SettingsModuleProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and company settings</p>
      </div>

      {/* Company Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">Company Profile</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Company Name</label>
            <input type="text" defaultValue={company.name} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Industry</label>
            <input type="text" defaultValue={company.industry} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">GSTIN</label>
            <input type="text" defaultValue={company.gstin} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">PAN</label>
            <input type="text" defaultValue={company.pan} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Address</label>
            <input type="text" defaultValue={company.address} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Phone</label>
            <input type="text" defaultValue={company.phone} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Email</label>
            <input type="text" defaultValue={company.email} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all">Save Changes</button>
        </div>
      </div>

      {/* User Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <User className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">User Account</h2>
        </div>
        <div className="p-6 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            {user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{user.role.replace('_', ' ')} • {company.plan} plan</p>
          </div>
        </div>
      </div>

      {/* Plan */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Professional Plan</h3>
            <p className="text-sm text-blue-100 mt-1">Unlimited vehicles • All modules • Priority support</p>
          </div>
          <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-xl border border-white/20 transition-all">
            Upgrade to Enterprise
          </button>
        </div>
      </div>
    </div>
  );
}
