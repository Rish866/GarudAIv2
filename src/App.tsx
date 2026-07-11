import React, { lazy, Suspense, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Truck, BarChart3, Shield, Zap, Loader2 } from 'lucide-react';
import { useStore } from './store/useStore';
import type { ModuleName } from './types';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import { useSupabaseSync } from './lib/useSupabaseSync';
import LandingPage from './components/LandingPage';
import OnboardingWizard from './components/ui/OnboardingWizard';
import ToastContainer from './components/ui/Toast';
import { signIn, signUp, isPlatformAdmin, getAllTenants, switchTenant, getSession } from './lib/auth';
import type { AuthUser } from './lib/auth';

// Lazy-loaded modules
const DashboardModule = lazy(() => import('./components/modules/dashboard/DashboardModule'));
const FleetModule = lazy(() => import('./components/modules/fleet/FleetModule'));
const TripsModule = lazy(() => import('./components/modules/trips/TripsModule'));
const DriversModule = lazy(() => import('./components/modules/drivers/DriversModule'));
const CustomersModule = lazy(() => import('./components/modules/customers/CustomersModule'));
const BillingModule = lazy(() => import('./components/modules/billing/BillingModule'));
const FuelModule = lazy(() => import('./components/modules/fuel/FuelModule'));
const MaintenanceModule = lazy(() => import('./components/modules/maintenance/MaintenanceModule'));
const ReportsModule = lazy(() => import('./components/modules/reports/ReportsModule'));
const SettingsModule = lazy(() => import('./components/modules/settings/SettingsModule'));
const EnquiriesModule = lazy(() => import('./components/modules/enquiries/EnquiriesModule'));
const NotificationsModule = lazy(() => import('./components/modules/notifications/NotificationsModule'));
const TyreModule = lazy(() => import('./components/modules/tyres/TyreModule'));
const PayrollModule = lazy(() => import('./components/modules/payroll/PayrollModule'));
const ContractRateModule = lazy(() => import('./components/modules/contracts/ContractRateModule'));
const MarketHireModule = lazy(() => import('./components/modules/market/MarketHireModule'));
const DocumentVaultModule = lazy(() => import('./components/modules/documents/DocumentVaultModule'));
const GPSSettingsModule = lazy(() => import('./components/modules/gps/GPSSettingsModule'));
const AccountsModule = lazy(() => import('./components/modules/accounts/AccountsModule'));
const PurchaseModule = lazy(() => import('./components/modules/purchases/PurchaseModule'));
const SalesModule = lazy(() => import('./components/modules/sales/SalesModule'));
const InventoryModule = lazy(() => import('./components/modules/inventory/InventoryModule'));
const GeofencingModule = lazy(() => import('./components/modules/geofencing/GeofencingModule'));
const SLAModule = lazy(() => import('./components/modules/sla/SLAModule'));
const DashcamModule = lazy(() => import('./components/modules/dashcam/DashcamModule'));
const FuelTheftModule = lazy(() => import('./components/modules/fueltheft/FuelTheftModule'));
const ChallanModule = lazy(() => import('./components/modules/challans/ChallanModule'));
const WorkOrderModule = lazy(() => import('./components/modules/workorders/WorkOrderModule'));
const EWayBillModule = lazy(() => import('./components/modules/ewaybill/EWayBillModule'));
const AuditTrailModule = lazy(() => import('./components/modules/audittrail/AuditTrailModule'));
const CustomerPortalModule = lazy(() => import('./components/modules/portal/CustomerPortalModule'));
const PnLModule = lazy(() => import('./components/modules/pnl/PnLModule'));
const GSTReportsModule = lazy(() => import('./components/modules/gst/GSTReportsModule'));
const VendorModule = lazy(() => import('./components/modules/vendors/VendorModule'));
const RouteModule = lazy(() => import('./components/modules/routes/RouteModule'));
const IndentModule = lazy(() => import('./components/modules/indents/IndentModule'));
const AttendanceModule = lazy(() => import('./components/modules/attendance/AttendanceModule'));
const CreditBlockModule = lazy(() => import('./components/modules/creditblock/CreditBlockModule'));
const TransferModule = lazy(() => import('./components/modules/transfers/TransferModule'));
const APIModule = lazy(() => import('./components/modules/api/APIModule'));
const PredictiveModule = lazy(() => import('./components/modules/analytics/PredictiveModule'));
const MobileAppModule = lazy(() => import('./components/modules/mobileapp/MobileAppModule'));
const ApprovalsModule = lazy(() => import('./components/modules/approvals/ApprovalsModule'));
const TrackingLinkModule = lazy(() => import('./components/modules/tracking/TrackingLinkModule'));
const ExpiryDashboardModule = lazy(() => import('./components/modules/expiry/ExpiryDashboardModule'));
const ClaimsModule = lazy(() => import('./components/modules/claims/ClaimsModule'));
const VendorPortalModule = lazy(() => import('./components/modules/vendorportal/VendorPortalModule'));
const ProfitabilityModule = lazy(() => import('./components/modules/profitability/ProfitabilityModule'));

const moduleComponents: Partial<Record<ModuleName, React.LazyExoticComponent<React.ComponentType>>> = {
  dashboard: DashboardModule,
  fleet: FleetModule,
  trips: TripsModule,
  drivers: DriversModule,
  customers: CustomersModule,
  billing: BillingModule,
  fuel: FuelModule,
  maintenance: MaintenanceModule,
  reports: ReportsModule,
  settings: SettingsModule,
  enquiries: EnquiriesModule,
  notifications: NotificationsModule,
  tyres: TyreModule,
  payroll: PayrollModule,
  contracts: ContractRateModule,
  market: MarketHireModule,
  documents: DocumentVaultModule,
  gps: GPSSettingsModule,
  accounts: AccountsModule,
  purchases: PurchaseModule,
  sales: SalesModule,
  inventory: InventoryModule,
  geofencing: GeofencingModule,
  sla: SLAModule,
  dashcam: DashcamModule,
  fueltheft: FuelTheftModule,
  challans: ChallanModule,
  workorders: WorkOrderModule,
  ewaybill: EWayBillModule,
  audittrail: AuditTrailModule,
  portal: CustomerPortalModule,
  pnl: PnLModule,
  gstreports: GSTReportsModule,
  vendors: VendorModule,
  routes: RouteModule,
  indents: IndentModule,
  attendance: AttendanceModule,
  creditblock: CreditBlockModule,
  transfers: TransferModule,
  restapi: APIModule,
  predictive: PredictiveModule,
  mobileapp: MobileAppModule,
  approvals: ApprovalsModule,
  trackinglinks: TrackingLinkModule,
  expiry: ExpiryDashboardModule,
  claims: ClaimsModule,
  vendorportal: VendorPortalModule,
  profitability: ProfitabilityModule,
};

function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
      <Loader2
        size={32}
        className="animate-spin"
        style={{ color: 'var(--accent)' }}
      />
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Loading module...
      </p>
    </div>
  );
}

function PlaceholderModule({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--accent-light)' }}
      >
        <Zap size={28} style={{ color: 'var(--accent)' }} />
      </div>
      <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {name.charAt(0).toUpperCase() + name.slice(1)} Module
      </h3>
      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Coming soon...
      </p>
    </div>
  );
}

function LoginPage({ onBackToHome }: { onBackToHome?: () => void }) {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', company_name: '', phone: '' });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    signIn(email, password).then(result => {
      setLoading(false);
      if (result.success && result.user) {
        const currentTenant = localStorage.getItem('garud_active_tenant');
        const newTenant = result.user.tenant_id;

        // Set the active tenant for this user
        localStorage.setItem('garud_active_tenant', newTenant);

        // If switching to a different tenant, reload to use correct storage
        if (currentTenant && currentTenant !== newTenant) {
          login({
            id: result.user.id,
            company_id: result.user.tenant_id,
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            phone: result.user.phone,
            status: 'active',
          });
          window.location.reload();
          return;
        }

        login({
          id: result.user.id,
          company_id: result.user.tenant_id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          phone: result.user.phone,
          status: 'active',
        });
      } else {
        setError(result.error || 'Login failed. If you just deployed, make sure Supabase Auth is enabled in your dashboard.');
      }
    }).catch(() => {
      setLoading(false);
      setError('Cannot connect to authentication server. Please try again.');
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regForm.name || !regForm.email || !regForm.password || !regForm.company_name) {
      setRegError('Please fill all required fields');
      return;
    }
    if (regForm.password.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    signUp(regForm).then(result => {
      setLoading(false);
      if (!result.success) {
        setRegError(result.error || 'Registration failed');
        return;
      }

      setRegSuccess('Account created! You can now login with your credentials.');
      setIsRegistering(false);
      setEmail(regForm.email);
      setRegForm({ name: '', email: '', password: '', company_name: '', phone: '' });
    });
  };

  const features = [
    { icon: Truck, title: 'Fleet Tracking', description: 'Real-time GPS tracking for all vehicles' },
    { icon: BarChart3, title: 'Smart Analytics', description: 'AI-powered insights and reporting' },
    { icon: Shield, title: 'Compliance Ready', description: 'E-way bill, GST, and document management' },
    { icon: Zap, title: 'Automation', description: 'Automated billing, alerts, and workflows' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Truck size={22} className="text-white" />
            </div>
            <span className="text-white text-xl font-bold">Garud AI</span>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-white leading-tight"
            >
              India&apos;s Smartest<br />Transport ERP
            </motion.h2>
            <div className="space-y-4">
              {features.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{feat.title}</p>
                      <p className="text-blue-200 text-xs">{feat.description}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Stats & Testimonial */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">2000+</p>
                <p className="text-blue-200 text-xs">Trucks Tracked</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{'\u20B9'}50Cr+</p>
                <p className="text-blue-200 text-xs">Freight Managed</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="bg-white/10 backdrop-blur rounded-xl p-4"
            >
              <p className="text-white/90 text-sm italic">
                &ldquo;Garud AI transformed our operations. We saved 20% on fuel costs and reduced billing time by 80%.&rdquo;
              </p>
              <p className="text-blue-200 text-xs mt-2">— Amit Patel, CEO, Patel Logistics</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Truck size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Garud AI
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Sign in to your Transport ERP account
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleLogin}
            className="mt-8 space-y-5"
          >
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 rounded-xl border text-sm outline-none transition-all focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ color: 'var(--accent)' }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl text-white text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Sign In
            </button>
          </motion.form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {regSuccess && (
            <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-xs text-green-700 font-medium">{regSuccess}</p>
            </div>
          )}

          {/* Register Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Register your company
              </button>
            </p>
          </motion.div>

          {/* Registration Modal */}
          {isRegistering && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="rounded-2xl shadow-xl w-full max-w-md p-6 m-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Create Account</h2>
                <p className="text-xs mb-4" style={{ color: 'var(--text-tertiary)' }}>Register your transport company to get started</p>
                {regError && <p className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">{regError}</p>}
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                    <input type="text" value={regForm.name} onChange={(e) => setRegForm({...regForm, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Company Name *</label>
                    <input type="text" value={regForm.company_name} onChange={(e) => setRegForm({...regForm, company_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Your transport company name" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email *</label>
                    <input type="email" value={regForm.email} onChange={(e) => setRegForm({...regForm, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="you@company.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                    <input type="text" value={regForm.phone} onChange={(e) => setRegForm({...regForm, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password * (min 6 chars)</label>
                    <input type="password" value={regForm.password} onChange={(e) => setRegForm({...regForm, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} placeholder="Create a password" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsRegistering(false)} className="flex-1 py-2.5 border rounded-lg text-sm font-medium" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Register</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="text-sm text-blue-600 hover:underline mt-4 block text-center w-full"
            >
              ← Back to Homepage
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const { activeModule, sidebarCollapsed, setActiveModule } = useStore();
  useSupabaseSync();

  // Browser history management — prevents back button from leaving the app
  useEffect(() => {
    // Push initial state
    window.history.pushState({ module: activeModule }, '', `#${activeModule}`);
  }, []);

  useEffect(() => {
    // Push state when module changes (but not on popstate)
    const currentHash = window.location.hash.replace('#', '');
    if (currentHash !== activeModule) {
      window.history.pushState({ module: activeModule }, '', `#${activeModule}`);
    }
  }, [activeModule]);

  useEffect(() => {
    // Listen for back/forward button
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.module) {
        setActiveModule(event.state.module);
      } else {
        // If no state, push current state to prevent leaving
        window.history.pushState({ module: activeModule }, '', `#${activeModule}`);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeModule, setActiveModule]);

  const ActiveComponent = moduleComponents[activeModule];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-[68px]' : 'lg:ml-[260px]'
        }`}
      >
        {/* Topbar */}
        <Topbar />

        {/* Onboarding Wizard */}
        <OnboardingWizard />

        {/* Page Content */}
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6 bg-mesh noise"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <Suspense fallback={<LoadingFallback />}>
            {ActiveComponent ? (
              <ActiveComponent />
            ) : (
              <PlaceholderModule name={activeModule} />
            )}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { isLoggedIn, theme, user, login, logout } = useStore();
  const [showLanding, setShowLanding] = useState(true);

  if (!isLoggedIn) {
    if (showLanding) {
      return (
        <div className={theme === 'dark' ? 'dark' : ''}>
          <LandingPage onGetStarted={() => setShowLanding(false)} />
        </div>
      );
    }
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <LoginPage onBackToHome={() => setShowLanding(true)} />
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <MainLayout />
      <ToastContainer />
    </div>
  );
}
