import React, { useState } from 'react';
import { ModuleName } from './types';
import { DEMO_USER, DEMO_COMPANY, VEHICLES, DRIVERS, CUSTOMERS, TRIPS, INVOICES, PAYMENTS, EXPENSES, FUEL_ENTRIES, MAINTENANCE_RECORDS, ALERTS, getDashboardMetrics } from './store/data';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import Dashboard from './components/modules/dashboard/Dashboard';
import FleetModule from './components/modules/fleet/FleetModule';
import TripsModule from './components/modules/trips/TripsModule';
import DriversModule from './components/modules/drivers/DriversModule';
import BillingModule from './components/modules/billing/BillingModule';
import FuelModule from './components/modules/fuel/FuelModule';
import CustomersModule from './components/modules/crm/CustomersModule';
import ReportsModule from './components/modules/reports/ReportsModule';
import SettingsModule from './components/modules/settings/SettingsModule';

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleName>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const metrics = getDashboardMetrics();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo login - accept any credentials or specific ones
    if (loginEmail && loginPassword) {
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Please enter email and password');
    }
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl mx-auto shadow-xl shadow-blue-600/20 mb-4">
              G
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Garud AI</h1>
            <p className="text-sm text-slate-500 mt-1">Transport ERP Platform</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-sm text-slate-500 mb-6">Sign in to your account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Email address</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1.5">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>

              {loginError && (
                <p className="text-xs text-red-500 font-medium">{loginError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 text-center mb-3">Demo credentials (any email + password works)</p>
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 space-y-1 font-mono">
                <p>Email: admin@balajitransport.in</p>
                <p>Password: demo123</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">Garud AI Transport ERP v2.0 • Enterprise Edition</p>
        </div>
      </div>
    );
  }

  // Main ERP Layout
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-[72px]' : 'ml-[240px]'}`}>
        <Topbar user={DEMO_USER} company={DEMO_COMPANY} alerts={ALERTS} onLogout={() => setIsLoggedIn(false)} />

        <main className="p-6">
          {activeModule === 'dashboard' && <Dashboard metrics={metrics} trips={TRIPS} alerts={ALERTS} vehicles={VEHICLES} />}
          {activeModule === 'fleet' && <FleetModule vehicles={VEHICLES} />}
          {activeModule === 'trips' && <TripsModule trips={TRIPS} />}
          {activeModule === 'drivers' && <DriversModule drivers={DRIVERS} />}
          {activeModule === 'customers' && <CustomersModule customers={CUSTOMERS} />}
          {activeModule === 'billing' && <BillingModule invoices={INVOICES} payments={PAYMENTS} expenses={EXPENSES} />}
          {activeModule === 'fuel' && <FuelModule fuelEntries={FUEL_ENTRIES} maintenanceRecords={MAINTENANCE_RECORDS} />}
          {activeModule === 'maintenance' && <FuelModule fuelEntries={FUEL_ENTRIES} maintenanceRecords={MAINTENANCE_RECORDS} />}
          {activeModule === 'reports' && <ReportsModule trips={TRIPS} invoices={INVOICES} expenses={EXPENSES} vehicles={VEHICLES} />}
          {activeModule === 'settings' && <SettingsModule company={DEMO_COMPANY} user={DEMO_USER} />}
        </main>
      </div>
    </div>
  );
}
