import React, { Suspense, useState } from 'react';
import { useStore } from './store/useStore';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { Truck, Shield, BarChart3, Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';

// Lazy load modules
const DashboardModule = React.lazy(() => import('./components/modules/dashboard/DashboardModule'));
const FleetModule = React.lazy(() => import('./components/modules/fleet/FleetModule'));
const TripsModule = React.lazy(() => import('./components/modules/trips/TripsModule'));
const DriversModule = React.lazy(() => import('./components/modules/drivers/DriversModule'));
const CustomersModule = React.lazy(() => import('./components/modules/customers/CustomersModule'));
const BillingModule = React.lazy(() => import('./components/modules/billing/BillingModule'));
const FuelModule = React.lazy(() => import('./components/modules/fuel/FuelModule'));
const MaintenanceModule = React.lazy(() => import('./components/modules/maintenance/MaintenanceModule'));
const ReportsModule = React.lazy(() => import('./components/modules/reports/ReportsModule'));
const SettingsModule = React.lazy(() => import('./components/modules/settings/SettingsModule'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

function ModuleContent() {
  const activeModule = useStore((s) => s.activeModule);

  return (
    <Suspense fallback={<LoadingFallback />}>
      {activeModule === 'dashboard' && <DashboardModule />}
      {activeModule === 'fleet' && <FleetModule />}
      {activeModule === 'trips' && <TripsModule />}
      {activeModule === 'drivers' && <DriversModule />}
      {activeModule === 'customers' && <CustomersModule />}
      {activeModule === 'billing' && <BillingModule />}
      {activeModule === 'fuel' && <FuelModule />}
      {activeModule === 'maintenance' && <MaintenanceModule />}
      {activeModule === 'reports' && <ReportsModule />}
      {activeModule === 'settings' && <SettingsModule />}
    </Suspense>
  );
}

function LoginPage() {
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      login({
        id: 'user_001',
        company_id: 'comp_garud_001',
        name: 'Rajesh Sharma',
        email,
        role: 'super_admin',
        phone: '+91 98765 43210',
        status: 'active',
      });
    }
  };

  const features = [
    { icon: <Truck size={20} />, title: 'Fleet Tracking', desc: 'Real-time GPS tracking for all vehicles' },
    { icon: <Shield size={20} />, title: 'Compliance', desc: 'Automated document & permit management' },
    { icon: <BarChart3 size={20} />, title: 'Analytics', desc: 'Revenue, expense & profit insights' },
    { icon: <Zap size={20} />, title: 'Automation', desc: 'Trip booking to billing in one flow' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl shadow-2xl shadow-blue-900/10 overflow-hidden bg-white">
        {/* Left Panel - Gradient */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center font-bold text-lg">
                G
              </div>
              <span className="text-xl font-bold tracking-tight">Garud AI</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              Transport ERP Platform
            </h2>
            <p className="text-blue-200 text-sm leading-relaxed">
              Complete fleet management, trip operations, billing, and analytics — all in one place.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-9 h-9 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-blue-200">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="relative z-10 text-xs text-blue-300">
            © 2025 Garud AI. All rights reserved.
          </p>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex flex-col justify-center p-8 lg:p-10">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              G
            </div>
            <span className="text-lg font-bold text-slate-900">Garud AI</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
            >
              Sign in
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-xs font-medium text-slate-600 mb-1">Demo Credentials</p>
            <p className="text-xs text-slate-500">
              Email: <span className="font-mono text-slate-700">rajesh@garudtransport.in</span>
            </p>
            <p className="text-xs text-slate-500">
              Password: <span className="font-mono text-slate-700">any password works</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isLoggedIn = useStore((s) => s.isLoggedIn);

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <ModuleContent />
        </main>
      </div>
    </div>
  );
}
