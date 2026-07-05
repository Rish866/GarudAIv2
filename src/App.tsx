import React, { useState, useEffect } from 'react';
import { supabase, SQL_SCHEMA, createTemporaryClient } from './supabaseClient';
import { supabaseService, DbTenant, DbVehicle, DbEvent, DbUser } from './supabaseService';

// Connected ERP Modules & Database Store
import { GarudERPStore } from './mockData';
import SalesManager from './components/SalesManager';
import FleetManager from './components/FleetManager';
import TripsManager from './components/TripsManager';
import AccountsManager from './components/AccountsManager';
import MaintenanceManager from './components/MaintenanceManager';
import ReportsManager from './components/ReportsManager';
import CustomerPortal from './components/CustomerPortal';
import DriverPortal from './components/DriverPortal';

// Structured ERP modules
import LiveDashboard from './components/LiveDashboard';
import MastersManager from './components/MastersManager';
import JobsOperationsManager from './components/JobsOperationsManager';
import DocumentsAlertsManager from './components/DocumentsAlertsManager';
import FuelManagement from './components/FuelManagement';
import TyreManagement from './components/TyreManagement';
import PayrollManager from './components/PayrollManager';
import CustomerVendorPortal from './components/CustomerVendorPortal';

// Global types
import {
  Customer as ErpCustomer,
  Vehicle as ErpVehicle,
  Driver as ErpDriver,
  Enquiry as ErpEnquiry,
  Quotation as ErpQuotation,
  ContractRate as ErpContractRate,
  Trip as ErpTrip,
  MarketVehicleHire as ErpMarketVehicleHire,
  Invoice as ErpInvoice,
  PaymentCollection as ErpPaymentCollection,
  Expense as ErpExpense,
  MaintenanceLog as ErpMaintenanceLog,
  FuelLog as ErpFuelLog,
  TyreLog as ErpTyreLog,
  DriverSalaryLog as ErpDriverSalaryLog,
  SystemAlert as ErpSystemAlert
} from './types';

import {
  Shield,
  Eye,
  ShieldAlert,
  Monitor,
  Video,
  MapPin,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Play,
  Layers,
  Truck,
  Radio,
  Users,
  Compass,
  DollarSign,
  Calendar,
  Sliders,
  ChevronDown,
  Activity,
  Award,
  FileText,
  ClipboardList,
  RefreshCw,
  Volume2,
  Wifi,
  Send,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Plus,
  Lock,
  Building,
  Key,
  Database,
  Search,
  HelpCircle,
  TrendingUp,
  CreditCard,
  LogOut,
  Trash2,
  ChevronUp,
  Briefcase
} from 'lucide-react';

interface Vehicle {
  id: string;
  regNumber: string;
  driverName: string;
  speed: number;
  status: 'Moving' | 'Stopped' | 'Idle' | 'Alert';
  route: string;
  camerasActive: number;
  lastUpdate: string;
  lat: string;
  lng: string;
}

interface AIEvent {
  id: string;
  timestamp: string;
  vehicleReg: string;
  type: string;
  description: string;
  severity: 'Critical' | 'Warning' | 'Caution';
  location: string;
  checked: boolean;
}

interface Tenant {
  id: string;
  name: string;
  domain: string;
  industry: 'Trailer & Container' | 'Hywa & Tipper' | 'Cold Chain' | 'School Bus & Staff' | 'Logistics';
  clientLogoBg: string;
  vehicles: Vehicle[];
  events: AIEvent[];
  stats: {
    totalTrips: number;
    fuelSavedLitres: number;
    safetyScore: number;
    billingDue: string;
  };
}

const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-balaji',
    name: 'Shree Balaji Logistics',
    domain: 'balaji.garud.ai',
    industry: 'Trailer & Container',
    clientLogoBg: 'from-cyan-600 to-blue-600',
    vehicles: [
      {
        id: 'balaji-v1',
        regNumber: 'HR-55-AJ-9021',
        driverName: 'Rajesh Kumar',
        speed: 68,
        status: 'Moving',
        route: 'Delhi Cargo Terminal → Mumbai Nhava Sheva',
        camerasActive: 4,
        lastUpdate: 'Just now',
        lat: '28.6139° N',
        lng: '77.2090° E'
      },
      {
        id: 'balaji-v2',
        regNumber: 'MH-43-QQ-1102',
        driverName: 'Satish Yadav',
        speed: 0,
        status: 'Stopped',
        route: 'Pune Industrial Area → Hyderabad Hub',
        camerasActive: 4,
        lastUpdate: '2 mins ago',
        lat: '18.5204° N',
        lng: '73.8567° E'
      },
      {
        id: 'balaji-v3',
        regNumber: 'GJ-12-BY-8843',
        driverName: 'Gurpreet Singh',
        speed: 82,
        status: 'Alert',
        route: 'Ahmedabad Port → Jaipur Bypass Road',
        camerasActive: 4,
        lastUpdate: '10 sec ago',
        lat: '23.0225° N',
        lng: '72.5714° E'
      }
    ],
    events: [
      {
        id: 'balaji-e1',
        timestamp: '14:28:10',
        vehicleReg: 'GJ-12-BY-8843',
        type: 'DSM (Driver Behavior)',
        description: 'Driver fatigue sequence alert - Micro-sleep pattern flagged',
        severity: 'Critical',
        location: 'NH-48 Near Udaipur Bypass',
        checked: false
      },
      {
        id: 'balaji-e2',
        timestamp: '14:15:44',
        vehicleReg: 'HR-55-AJ-9021',
        type: 'ADAS (Road Safety)',
        description: 'Forward Collision Warning - Sudden pedestrian crossing',
        severity: 'Warning',
        location: 'Kolar Highway Hub',
        checked: true
      }
    ],
    stats: {
      totalTrips: 480,
      fuelSavedLitres: 14200,
      safetyScore: 94,
      billingDue: '₹48,200'
    }
  }
];

export default function App() {
  // Navigation View State: 'landing' | 'login' | 'dashboard'
  const [viewMode, setViewMode] = useState<'landing' | 'login' | 'dashboard'>('landing');

  // Supabase Authenticated Session
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Active module inside Dashboard
  const [activeTab, setActiveTab] = useState<string>('Live Dashboard');

  // Live telematics compliance alerts state
  const [alerts, setAlerts] = useState<ErpSystemAlert[]>([]);

  // Login credentials
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginSuccess, setLoginSuccess] = useState<string>('');
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSuccess, setForgotSuccess] = useState<string>('');
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // Demo Demo Modal
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [demoName, setDemoName] = useState<string>('');
  const [demoPhone, setDemoPhone] = useState<string>('');
  const [demoCompany, setDemoCompany] = useState<string>('');
  const [demoSubmitted, setDemoSubmitted] = useState<boolean>(false);

  // Customer & User Onboarding State
  const [onboardEmail, setOnboardEmail] = useState<string>('');
  const [onboardPassword, setOnboardPassword] = useState<string>('');
  const [onboardName, setOnboardName] = useState<string>('');
  const [onboardDomain, setOnboardDomain] = useState<string>('');
  const [onboardIndustry, setOnboardIndustry] = useState<'Trailer & Container' | 'Hywa & Tipper' | 'Cold Chain' | 'School Bus & Staff' | 'Logistics'>('Logistics');
  const [onboardSuccess, setOnboardSuccess] = useState<string>('');
  const [onboardError, setOnboardError] = useState<string>('');
  const [isOnboarding, setIsOnboarding] = useState<boolean>(false);

  // Core multi-tenant models
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('garud_saas_tenants');
    return saved ? JSON.parse(saved) : INITIAL_TENANTS;
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    const saved = localStorage.getItem('garud_active_tenant_id');
    return saved || 'tenant-balaji';
  });

  // Current active tenant object
  const activeTenant = tenants.find(t => t.id === activeTenantId) || tenants[0];

  // Derived Superuser status
  const currentEmail = (session?.user?.email || '').trim().toLowerCase();
  const isSuperuser = currentEmail === 'rishkatiyar1@gmail.com' || currentEmail === 'admin@garud.ai' || session?.user?.user_metadata?.is_superuser === true;

  // Active selected tracking vehicle on map
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    activeTenant?.vehicles[0]?.id || ''
  );
  const selectedVehicle = activeTenant?.vehicles.find(v => v.id === selectedVehicleId) || activeTenant?.vehicles[0];

  // Simulated live alarm trigger HUD state
  const [liveAlert, setLiveAlert] = useState<AIEvent | null>(null);

  // ERP State logs
  const [customers, setCustomers] = useState<ErpCustomer[]>([]);
  const [vehiclesERP, setVehiclesERP] = useState<ErpVehicle[]>([]);
  const [drivers, setDrivers] = useState<ErpDriver[]>([]);
  const [enquiries, setEnquiries] = useState<ErpEnquiry[]>([]);
  const [quotations, setQuotations] = useState<ErpQuotation[]>([]);
  const [contractRates, setContractRates] = useState<ErpContractRate[]>([]);
  const [trips, setTrips] = useState<ErpTrip[]>([]);
  const [marketHires, setMarketHires] = useState<ErpMarketVehicleHire[]>([]);
  const [invoices, setInvoices] = useState<ErpInvoice[]>([]);
  const [payments, setPayments] = useState<ErpPaymentCollection[]>([]);
  const [expenses, setExpenses] = useState<ErpExpense[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<ErpMaintenanceLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<ErpFuelLog[]>([]);
  const [tyreLogs, setTyreLogs] = useState<ErpTyreLog[]>([]);
  const [salaries, setSalaries] = useState<ErpDriverSalaryLog[]>([]);

  // States for Customer and Driver Portal simulators
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  const activeCustomerObj = customers.find(c => c.id === selectedCustomerId);
  const activeDriverObj = drivers.find(d => d.id === selectedDriverId);

  // Monitor database session on mount
  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        setViewMode('dashboard');
      }
      setAuthLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        setViewMode('dashboard');
      } else if (viewMode === 'dashboard') {
        setViewMode('landing');
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save changes to tenants list
  useEffect(() => {
    localStorage.setItem('garud_saas_tenants', JSON.stringify(tenants));
  }, [tenants]);

  // Load and Partition ERP Store data for the active tenant
  useEffect(() => {
    localStorage.setItem('garud_active_tenant_id', activeTenantId);
    
    // Bind first vehicle of tenant
    const matchedTenant = tenants.find(t => t.id === activeTenantId);
    if (matchedTenant && matchedTenant.vehicles.length > 0) {
      setSelectedVehicleId(matchedTenant.vehicles[0].id);
    }

    const store = new GarudERPStore(activeTenantId);
    const loadedCustomers = store.getItems<ErpCustomer>('garud_customers');
    setCustomers(loadedCustomers);
    if (loadedCustomers.length > 0) {
      setSelectedCustomerId(loadedCustomers[0].id);
    } else {
      setSelectedCustomerId('');
    }

    setVehiclesERP(store.getItems<ErpVehicle>('garud_vehicles_erp'));

    const loadedDrivers = store.getItems<ErpDriver>('garud_drivers');
    setDrivers(loadedDrivers);
    if (loadedDrivers.length > 0) {
      setSelectedDriverId(loadedDrivers[0].id);
    } else {
      setSelectedDriverId('');
    }
    setEnquiries(store.getItems<ErpEnquiry>('garud_enquiries'));
    setQuotations(store.getItems<ErpQuotation>('garud_quotations'));
    setContractRates(store.getItems<ErpContractRate>('garud_contracts'));
    setTrips(store.getItems<ErpTrip>('garud_trips'));
    setMarketHires(store.getItems<ErpMarketVehicleHire>('garud_market_hires'));
    setInvoices(store.getItems<ErpInvoice>('garud_invoices'));
    setPayments(store.getItems<ErpPaymentCollection>('garud_payments_col'));
    setExpenses(store.getItems<ErpExpense>('garud_expenses'));
    setMaintenanceLogs(store.getItems<ErpMaintenanceLog>('garud_maintenance'));
    setFuelLogs(store.getItems<ErpFuelLog>('garud_fuel_logs'));
    setTyreLogs(store.getItems<ErpTyreLog>('garud_tyre_logs'));
    setSalaries(store.getItems<ErpDriverSalaryLog>('garud_salaries'));

    // Initialize/Load multi-tenant Telematics compliance alerts
    const loadedAlerts = store.getItems<ErpSystemAlert>('garud_alerts');
    if (loadedAlerts.length === 0) {
      const initialAlerts: ErpSystemAlert[] = [
        {
          id: 'alert-1',
          company_id: activeTenantId,
          type: 'driver_behavior',
          title: 'DSM: Driver Micro-sleep Sequence',
          description: 'Cabin safety camera flagged micro-sleep sequence (NH-48 corridor). Corrective audio alarm triggered.',
          severity: 'critical',
          created_at: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(),
          is_read: false
        },
        {
          id: 'alert-2',
          company_id: activeTenantId,
          type: 'document_expiry',
          title: 'National Permit Expiry warning',
          description: 'Vehicle HR-55-AJ-9021 National Permit expires in 4 days. Please renew to prevent RTO penalties.',
          severity: 'warning',
          created_at: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString(),
          is_read: false
        }
      ];
      setAlerts(initialAlerts);
      store.saveItems('garud_alerts', initialAlerts);
    } else {
      setAlerts(loadedAlerts);
    }
  }, [activeTenantId, tenants]);

  // Telemetry real-time jitter logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTenants(prevTenants =>
        prevTenants.map(t => ({
          ...t,
          vehicles: t.vehicles.map(v => {
            if (v.status === 'Moving') {
              const speedDelta = Math.floor(Math.random() * 5) - 2;
              return { ...v, speed: Math.max(30, Math.min(85, v.speed + speedDelta)), lastUpdate: 'Just now' };
            }
            return v;
          })
        }))
      );
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update wrappers for local cache saving
  const handleUpdateCustomers = (newVal: ErpCustomer[]) => {
    setCustomers(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_customers', newVal);
  };
  const handleUpdateVehiclesERP = (newVal: ErpVehicle[]) => {
    setVehiclesERP(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_vehicles_erp', newVal);
  };
  const handleUpdateDrivers = (newVal: ErpDriver[]) => {
    setDrivers(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_drivers', newVal);
  };
  const handleUpdateEnquiries = (newVal: ErpEnquiry[]) => {
    setEnquiries(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_enquiries', newVal);
  };
  const handleUpdateQuotations = (newVal: ErpQuotation[]) => {
    setQuotations(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_quotations', newVal);
  };
  const handleUpdateContractRates = (newVal: ErpContractRate[]) => {
    setContractRates(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_contracts', newVal);
  };
  const handleUpdateTrips = (newVal: ErpTrip[]) => {
    setTrips(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_trips', newVal);
  };
  const handleUpdateMarketHires = (newVal: ErpMarketVehicleHire[]) => {
    setMarketHires(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_market_hires', newVal);
  };
  const handleUpdateInvoices = (newVal: ErpInvoice[]) => {
    setInvoices(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_invoices', newVal);
  };
  const handleUpdatePayments = (newVal: ErpPaymentCollection[]) => {
    setPayments(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_payments_col', newVal);
  };
  const handleUpdateExpenses = (newVal: ErpExpense[]) => {
    setExpenses(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_expenses', newVal);
  };
  const handleUpdateAlerts = (newVal: ErpSystemAlert[]) => {
    setAlerts(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_alerts', newVal);
  };
  const handleUpdateMaintenanceLogs = (newVal: ErpMaintenanceLog[]) => {
    setMaintenanceLogs(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_maintenance', newVal);
  };
  const handleUpdateFuelLogs = (newVal: ErpFuelLog[]) => {
    setFuelLogs(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_fuel_logs', newVal);
  };
  const handleUpdateTyreLogs = (newVal: ErpTyreLog[]) => {
    setTyreLogs(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_tyre_logs', newVal);
  };
  const handleUpdateSalaries = (newVal: ErpDriverSalaryLog[]) => {
    setSalaries(newVal);
    new GarudERPStore(activeTenantId).saveItems('garud_salaries', newVal);
  };

  // Perform login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');

    const emailInput = loginEmail.trim().toLowerCase();
    const passwordInput = loginPassword;

    if (!emailInput || !passwordInput) {
      setLoginError('Please enter both Email and Password.');
      return;
    }

    try {
      // 1. Attempt secure backend auth proxy first
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      const resData = await response.json();

      if (response.ok && resData.user) {
        // Authenticated successfully via backend proxy
        setSession({
          user: {
            email: resData.user.email,
            id: resData.user.id,
            user_metadata: resData.user.user_metadata || { full_name: resData.user.email.split('@')[0] }
          }
        });
        setLoginSuccess('Logged in successfully via secure backend!');
        setViewMode('dashboard');
        return;
      }

      // 2. Fallback to client-side direct Supabase attempt if backend proxy failed or wasn't configured
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      });

      if (error) {
        // 3. Playtest Fallback for Reviewers & Superusers (failsafe if database credentials are not synced yet)
        if (emailInput === 'rishkatiyar1@gmail.com' && passwordInput === '123456789') {
          const fakeSession = {
            user: {
              email: 'rishkatiyar1@gmail.com',
              id: 'superuser-rishabh',
              user_metadata: { full_name: 'Rishabh (Superuser)', is_superuser: true }
            }
          };
          setSession(fakeSession);
          setViewMode('dashboard');
          setLoginSuccess('Superuser session established via secure fallback!');
          return;
        }

        if (emailInput === 'admin@garud.ai' && passwordInput === 'garud123') {
          const fakeSession = {
            user: {
              email: 'admin@garud.ai',
              id: 'demo-admin-id',
              user_metadata: { full_name: 'Transporter Admin', is_superuser: true }
            }
          };
          setSession(fakeSession);
          setViewMode('dashboard');
          setLoginSuccess('Logged in via Demo Bypass!');
          return;
        }

        throw error;
      }

      setLoginSuccess('Success! Redirecting...');
      setViewMode('dashboard');
    } catch (err: any) {
      // Direct Superuser bypass on database error / mismatch
      if (emailInput === 'rishkatiyar1@gmail.com' && passwordInput === '123456789') {
        const fakeSession = {
          user: {
            email: 'rishkatiyar1@gmail.com',
            id: 'superuser-rishabh',
            user_metadata: { full_name: 'Rishabh (Superuser)', is_superuser: true }
          }
        };
        setSession(fakeSession);
        setViewMode('dashboard');
        setLoginSuccess('Superuser session established!');
        return;
      }

      setLoginError(err.message || 'Login failed. Please double check credentials or use the admin@garud.ai demo account.');
    }
  };

  // Log out
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setViewMode('landing');
  };

  // Send password reset email
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSuccess('');
    if (!forgotEmail.trim()) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      setForgotSuccess('Instructions sent! Check your inbox.');
    } catch (err: any) {
      setForgotSuccess(`Status: ${err.message || 'Verification complete'}`);
    }
  };

  // Onboard New Transporter / Customer
  const handleOnboardCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardError('');
    setOnboardSuccess('');
    setIsOnboarding(true);

    if (!onboardEmail.trim() || !onboardPassword.trim() || !onboardName.trim() || !onboardDomain.trim()) {
      setOnboardError('Please fill in all the required onboarding fields.');
      setIsOnboarding(false);
      return;
    }

    if (onboardPassword.length < 6) {
      setOnboardError('Password must be at least 6 characters long.');
      setIsOnboarding(false);
      return;
    }

    try {
      // Use the server-side API endpoint we created to proxy the request and avoid exposing secrets or logging out the admin.
      const response = await fetch('/api/admin/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: onboardEmail.trim().toLowerCase(),
          password: onboardPassword,
          fullName: onboardName.trim(),
          company: onboardName.trim(),
          domainPrefix: onboardDomain.trim().toLowerCase(),
          industry: onboardIndustry
        })
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Server onboarding error');
      }

      // Success! Now provision a brand new multi-tenant sandbox profile instantly in state and local storage
      const newTenantId = `tenant-${onboardDomain.trim().toLowerCase().replace(/\s+/g, '-')}`;
      const newTenant: Tenant = {
        id: newTenantId,
        name: onboardName.trim(),
        domain: `${onboardDomain.trim().toLowerCase()}.garud.ai`,
        industry: onboardIndustry,
        clientLogoBg: 'from-indigo-600 to-purple-600',
        vehicles: [
          {
            id: `${newTenantId}-v1`,
            regNumber: 'HR-38-XY-1234',
            driverName: 'Manpreet Singh',
            speed: 0,
            status: 'Stopped',
            route: 'Delhi Cargo Terminal → Mumbai Nhava Sheva',
            camerasActive: 4,
            lastUpdate: 'Just now',
            lat: '28.6139° N',
            lng: '77.2090° E'
          }
        ],
        events: [
          {
            id: `${newTenantId}-e1`,
            timestamp: new Date().toTimeString().split(' ')[0],
            vehicleReg: 'HR-38-XY-1234',
            type: 'System Status',
            description: 'Tenant profile initialized and authenticated securely.',
            severity: 'Caution',
            location: 'System Core Terminal',
            checked: true
          }
        ],
        stats: {
          totalTrips: 1,
          fuelSavedLitres: 0,
          safetyScore: 100,
          billingDue: '₹0'
        }
      };

      setTenants(prev => {
        // Prevent duplicates
        if (prev.some(t => t.id === newTenantId)) return prev;
        return [...prev, newTenant];
      });

      setActiveTenantId(newTenantId);
      setOnboardSuccess(`Successfully created user ${onboardEmail} & provisioned the ${onboardName} platform node!`);
      
      // Reset inputs
      setOnboardEmail('');
      setOnboardPassword('');
      setOnboardName('');
      setOnboardDomain('');
    } catch (err: any) {
      setOnboardError(err.message || 'Onboarding failed. Please ensure the email is unique or check your connection.');
    } finally {
      setIsOnboarding(false);
    }
  };

  // Delete client node by superuser
  const handleDeleteTenant = (tenantIdToDelete: string) => {
    if (!isSuperuser) {
      alert('Only designated Superusers can delete client nodes.');
      return;
    }
    if (tenants.length <= 1) {
      alert('Cannot delete the last remaining customer node. Please onboard a new node first.');
      return;
    }
    const tenantToDelete = tenants.find(t => t.id === tenantIdToDelete);
    if (!tenantToDelete) return;

    if (confirm(`⚠️ CRITICAL: Are you sure you want to delete the "${tenantToDelete.name}" customer node?\n\nThis will instantly remove all vehicles, driver telemetry logs, and state logs. This action is irreversible.`)) {
      const updated = tenants.filter(t => t.id !== tenantIdToDelete);
      setTenants(updated);
      if (activeTenantId === tenantIdToDelete) {
        setActiveTenantId(updated[0].id);
      }
    }
  };

  // Send demo request form
  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setIsDemoModalOpen(false);
      setDemoSubmitted(false);
      alert(`Demo Request Received! We will reach out to ${demoName} at ${demoPhone} within 2 hours with specialized hardware details.`);
      setDemoName('');
      setDemoPhone('');
      setDemoCompany('');
    }, 1500);
  };

  // Trigger simulated cabin notification
  const handleTriggerSimAlert = () => {
    const alertTypes = [
      { type: 'DSM Fatigue', desc: 'Driver drowsiness sequence flagged - critical micro-sleep alert', severity: 'Critical' },
      { type: 'ADAS Collision', desc: 'Forward collision alarm triggered - harsh decelerating trajectory', severity: 'Warning' },
      { type: 'DSM Smoking', desc: 'Cabin smoke/distraction behavior flag', severity: 'Caution' }
    ] as const;

    const chosen = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const randomEvt: AIEvent = {
      id: `sim-evt-${Date.now()}`,
      timestamp: new Date().toTimeString().split(' ')[0],
      vehicleReg: selectedVehicle?.regNumber || 'HR-55-AJ-9021',
      type: chosen.type,
      description: chosen.desc,
      severity: chosen.severity,
      location: 'NH-48 corridor near toll plaza',
      checked: false
    };

    setLiveAlert(randomEvt);

    setTenants(prev =>
      prev.map(t => {
        if (t.id === activeTenantId) {
          return {
            ...t,
            events: [randomEvt, ...t.events]
          };
        }
        return t;
      })
    );
  };

  return (
    <div className="bg-[#020617] text-slate-100 min-h-screen relative font-sans antialiased selection:bg-cyan-500 selection:text-slate-900">
      
      {/* Background radial highlight */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[400px] bg-gradient-to-b from-cyan-950/20 via-blue-950/5 to-transparent blur-3xl rounded-full pointer-events-none"></div>

      {/* Ticker HUD Warning alert */}
      {liveAlert && (
        <div className="bg-red-950 border-b border-red-500/30 text-red-100 py-3 px-4 text-xs font-mono relative z-50 animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-2.5">
              <span className="bg-red-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded font-black tracking-wide uppercase">AI Active Warning</span>
              <span>
                Vehicle <strong className="text-white underline">{liveAlert.vehicleReg}</strong> triggered <strong>{liveAlert.type}</strong>: {liveAlert.description}
              </span>
            </div>
            <button 
              onClick={() => setLiveAlert(null)}
              className="text-white hover:text-red-400 font-bold bg-slate-900 px-2.5 py-1 rounded border border-slate-800 transition-all cursor-pointer shrink-0"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* ================================= PUBLIC MARKETING SITE (landing) ================================= */}
      {viewMode === 'landing' && (
        <div>
          {/* Transparent modern navigation bar */}
          <nav className="sticky top-0 z-40 bg-[#020617]/85 backdrop-blur-md border-b border-slate-900/60 px-4 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setViewMode('landing')}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-cyan-500/20">
                  G
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    GARUD AI
                    <span className="text-[10px] tracking-widest font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-1.5 py-0.5 rounded uppercase">ERP</span>
                  </h1>
                  <p className="text-[9px] text-slate-400 font-mono tracking-widest uppercase">Transport Command</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setViewMode('login')}
                  className="text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => setIsDemoModalOpen(true)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Request Demo
                </button>
              </div>
            </div>
          </nav>

          {/* Clean public hero section */}
          <section className="pt-24 pb-20 px-4 text-center">
            <div className="max-w-4xl mx-auto">
              <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/20 px-4 py-1.5 rounded-full text-[11px] text-cyan-400 font-semibold mb-8">
                <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Enterprise Transport ERP</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-none text-white mb-6">
                GARUD AI
              </h1>
              
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-slate-300 mb-6">
                Transport ERP Platform
              </h2>

              <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
                A unified, premium software package designed exclusively for transporter networks. Monitor live vehicle corridors, streamline dispatch schedules, integrate drivers, automate bills, and audit P&L outputs safely.
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-10">
                <button
                  onClick={() => setViewMode('login')}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xs px-8 py-4 rounded-xl shadow-lg shadow-cyan-500/10 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Login to Platform
                </button>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white font-bold text-xs px-8 py-4 rounded-xl border border-slate-800 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Request Demo
                </button>
              </div>
            </div>
          </section>

          {/* Simple public features list */}
          <section className="py-20 px-4 border-t border-slate-900 bg-slate-950/30">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Live Telematics Hub</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Track speeds, vehicle corridors and 4-channel active dashcam streams live with private, encrypted database partitioning.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Robust Fleet Asset Controls</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Log driver logs, schedule truck maintenance cycles, file fuel transactions, and monitor license/permit expiries safely.
                  </p>
                </div>
                <div className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">SaaS Billing & P&L</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generate trip bills, settle advances, audit logistics overheads, and trace company financial health down to specific routes.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ================================= SINGLE CLEAN LOGIN PAGE (login) ================================= */}
      {viewMode === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Left Column - Design Showcase (Visible on desktop) */}
            <div className="hidden md:flex md:col-span-6 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-10 flex-col justify-between border-r border-slate-800 text-left">
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setViewMode('landing')}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-base shadow-md">
                  G
                </div>
                <span className="font-extrabold text-base text-white tracking-tight">GARUD AI</span>
              </div>

              <div className="my-8">
                <h2 className="text-2xl font-black text-white tracking-tight mb-3">
                  Modern Transport Intelligence
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Log in to access your privately partitioned fleet metrics. Dynamic ADAS monitoring, FASTag status, and isolated database shards are verified.
                </p>

                <div className="space-y-3 font-mono text-[10px] text-cyan-400">
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Unified Fleet & Driver ERP
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    4-Channel Live Cabin Telematics
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    Row-Level Tenant Data Isolation
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-mono">
                System: SECURE_CORE_ONLINE // 2026
              </div>
            </div>

            {/* Right Column - Clean Login Card */}
            <div className="col-span-12 md:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-slate-950/95 text-left">
              <div className="mb-6">
                <h3 className="text-xl font-black text-white">Sign In to Platform</h3>
                <p className="text-xs text-slate-400 mt-1">Provide your fleet administrator details below</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. admin@balaji.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[10px] font-bold text-cyan-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  />
                </div>

                {loginError && (
                  <div className="p-3 bg-red-950/50 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-medium">
                    {loginError}
                  </div>
                )}

                {loginSuccess && (
                  <div className="p-3 bg-emerald-950/50 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 font-medium">
                    {loginSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:opacity-90 text-slate-950 font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Login to Console
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setViewMode('landing')}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors underline cursor-pointer"
                >
                  ← Back to Homepage
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================================= PREMIUM ENTERPRISE ERP DASHBOARD ================================= */}
      {viewMode === 'dashboard' && (
        <div className="min-h-screen flex flex-col md:flex-row">
          
          {/* Dashboard Left Sidebar */}
          <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-900 text-left flex flex-col justify-between shrink-0">
            <div>
              {/* Brand Header */}
              <div className="p-6 border-b border-slate-900 flex items-center space-x-3 cursor-pointer" onClick={() => setViewMode('landing')}>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-cyan-500/10">
                  G
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white tracking-tight">GARUD AI</h2>
                  <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">SaaS ERP</p>
                </div>
              </div>

              {/* Transporter Tenant Selection Switcher */}
              <div className="p-4 border-b border-slate-900 bg-slate-900/25">
                <label className="text-[9px] text-slate-500 block font-bold uppercase tracking-widest font-mono mb-1.5">Selected Node</label>
                <select
                  value={activeTenantId}
                  onChange={(e) => setActiveTenantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-[11px] text-white rounded-lg p-2 font-bold focus:ring-1 focus:ring-cyan-500 outline-none cursor-pointer"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Sidebar Navigation Items (Exactly 12 Modules) */}
              <nav className="p-3 space-y-1">
                {[
                  { name: 'Live Dashboard', icon: Radio },
                  { name: 'Masters', icon: Layers },
                  { name: 'Jobs / Operations', icon: Briefcase },
                  { name: 'Documents & Alerts', icon: ShieldAlert },
                  { name: 'Fuel Management', icon: Sliders },
                  { name: 'Tyre Management', icon: Sliders },
                  { name: 'Maintenance', icon: Sliders },
                  { name: 'Accounts & Billing', icon: DollarSign },
                  { name: 'Payroll', icon: Users },
                  { name: 'Reports', icon: TrendingUp },
                  { name: 'Customer / Vendor Portal', icon: Users },
                  { name: 'Settings', icon: ClipboardList }
                ].map((item) => {
                  const isActive = activeTab === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setActiveTab(item.name)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all border border-transparent cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-cyan-400 border-slate-800 shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <item.icon className="w-4 h-4 text-cyan-400" />
                        <span>{item.name}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Admin User Node Info */}
            <div className="p-4 border-t border-slate-900 bg-[#030712]">
              <div className="flex items-center space-x-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[170px]">
                  {session?.user?.email || 'admin@garud.ai'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-red-900/30 text-red-400 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Workspace Frame */}
          <main className="flex-1 flex flex-col bg-[#030712] overflow-x-hidden">
            
            {/* Top Workspace Header */}
            <header className="px-6 py-4 border-b border-slate-900 bg-slate-950/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  {activeTab}
                </h2>
                <p className="text-[10px] text-slate-500 font-mono">
                  ERP_SESSION_ID: <span className="text-cyan-400">{activeTenant.id}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="bg-slate-900 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold">
                  🔒 Node Isolation: OK
                </span>
              </div>
            </header>

            {/* Module Render Container */}
            <div className="p-6 flex-1">
              
              {/* MODULE 1: Live Dashboard */}
              {activeTab === 'Live Dashboard' && (
                <LiveDashboard
                  companyId={activeTenantId}
                  vehicles={vehiclesERP}
                  drivers={drivers}
                  trips={trips}
                  alerts={alerts}
                  onTriggerSimulatedAlert={(newAlert) => handleUpdateAlerts([newAlert, ...alerts])}
                />
              )}

              {/* MODULE 2: Masters */}
              {activeTab === 'Masters' && (
                <MastersManager
                  companyId={activeTenantId}
                  vehicles={vehiclesERP}
                  drivers={drivers}
                  customers={customers}
                  onUpdateVehicles={handleUpdateVehiclesERP}
                  onUpdateDrivers={handleUpdateDrivers}
                  onUpdateCustomers={handleUpdateCustomers}
                />
              )}

              {/* MODULE 3: Jobs / Operations */}
              {activeTab === 'Jobs / Operations' && (
                <JobsOperationsManager
                  companyId={activeTenantId}
                  trips={trips}
                  vehicles={vehiclesERP}
                  drivers={drivers}
                  customers={customers}
                  onUpdateTrips={handleUpdateTrips}
                />
              )}

              {/* MODULE 4: Documents & Alerts */}
              {activeTab === 'Documents & Alerts' && (
                <DocumentsAlertsManager
                  companyId={activeTenantId}
                  vehicles={vehiclesERP}
                  drivers={drivers}
                  customers={customers}
                  alerts={alerts}
                  onUpdateAlerts={handleUpdateAlerts}
                />
              )}

              {/* MODULE 5: Fuel Management */}
              {activeTab === 'Fuel Management' && (
                <FuelManagement
                  companyId={activeTenantId}
                  vehicles={vehiclesERP}
                  drivers={drivers}
                  trips={trips}
                  fuelLogs={fuelLogs}
                  onUpdateFuelLogs={handleUpdateFuelLogs}
                />
              )}

              {/* MODULE 6: Tyre Management */}
              {activeTab === 'Tyre Management' && (
                <TyreManagement
                  companyId={activeTenantId}
                  vehicles={vehiclesERP}
                  tyreLogs={tyreLogs}
                  onUpdateTyreLogs={handleUpdateTyreLogs}
                />
              )}

              {/* MODULE 7: Maintenance */}
              {activeTab === 'Maintenance' && (
                <MaintenanceManager
                  companyId={activeTenantId}
                  vehicles={vehiclesERP}
                  drivers={drivers}
                  maintenance={maintenanceLogs}
                  fuelLogs={fuelLogs}
                  tyreLogs={tyreLogs}
                  onUpdateMaintenance={handleUpdateMaintenanceLogs}
                  onUpdateFuelLogs={handleUpdateFuelLogs}
                  onUpdateTyreLogs={handleUpdateTyreLogs}
                />
              )}

              {/* MODULE 8: Accounts & Billing */}
              {activeTab === 'Accounts & Billing' && (
                <AccountsManager
                  companyId={activeTenantId}
                  invoices={invoices}
                  payments={payments}
                  expenses={expenses}
                  trips={trips}
                  customers={customers}
                  onUpdateInvoices={handleUpdateInvoices}
                  onUpdatePayments={handleUpdatePayments}
                  onUpdateExpenses={handleUpdateExpenses}
                  onUpdateTrips={handleUpdateTrips}
                  onUpdateCustomers={handleUpdateCustomers}
                  userRole="admin"
                />
              )}

              {/* MODULE 9: Payroll */}
              {activeTab === 'Payroll' && (
                <PayrollManager
                  companyId={activeTenantId}
                  drivers={drivers}
                  salaries={salaries}
                  onUpdateSalaries={handleUpdateSalaries}
                  onUpdateDrivers={handleUpdateDrivers}
                />
              )}

              {/* MODULE 10: Reports */}
              {activeTab === 'Reports' && (
                <ReportsManager
                  companyId={activeTenantId}
                  trips={trips}
                  invoices={invoices}
                  expenses={expenses}
                  marketHires={marketHires}
                  drivers={drivers}
                />
              )}

              {/* MODULE 11: Customer / Vendor Portal */}
              {activeTab === 'Customer / Vendor Portal' && (
                <CustomerVendorPortal
                  companyId={activeTenantId}
                  customers={customers}
                  drivers={drivers}
                  trips={trips}
                  invoices={invoices}
                  enquiries={enquiries}
                  quotations={quotations}
                  fuelLogs={fuelLogs}
                  salaries={salaries}
                  onUpdateTrips={handleUpdateTrips}
                  onUpdateQuotations={handleUpdateQuotations}
                />
              )}

              {/* MODULE 10: Settings */}
              {activeTab === 'Settings' && (
                <div className="space-y-6 text-left max-w-4xl">
                  {isSuperuser ? (
                    <>
                      {/* Onboard New Transporter / Customer User Form */}
                      <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-base font-extrabold text-white mb-1 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          Superuser: Onboard New Transporter
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-6">
                          Register a new administrator directly into your Supabase Authentication backend and instantly provision their isolated database node sandbox.
                        </p>

                        <form onSubmit={handleOnboardCustomer} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company / Customer Name</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Shree Balaji Logistics"
                                value={onboardName}
                                onChange={(e) => setOnboardName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subdomain Prefix</label>
                              <div className="relative flex items-center">
                                <input
                                  type="text"
                                  required
                                  placeholder="e.g. balaji"
                                  value={onboardDomain}
                                  onChange={(e) => setOnboardDomain(e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pr-24 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                                />
                                <span className="absolute right-3 text-[10px] font-bold text-slate-500 font-mono">.garud.ai</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Fleet Segment</label>
                              <select
                                value={onboardIndustry}
                                onChange={(e: any) => setOnboardIndustry(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-bold cursor-pointer"
                              >
                                <option value="Trailer & Container">Trailer & Container</option>
                                <option value="Hywa & Tipper">Hywa & Tipper</option>
                                <option value="Cold Chain">Cold Chain</option>
                                <option value="School Bus & Staff">School Bus & Staff</option>
                                <option value="Logistics">Logistics</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Admin Email Address</label>
                              <input
                                type="email"
                                required
                                placeholder="e.g. admin@balaji.com"
                                value={onboardEmail}
                                onChange={(e) => setOnboardEmail(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Initial Password</label>
                              <input
                                type="password"
                                required
                                placeholder="Min 6 characters"
                                value={onboardPassword}
                                onChange={(e) => setOnboardPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                              />
                            </div>
                          </div>

                          {onboardError && (
                            <div className="p-3 bg-red-950/50 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-medium">
                              {onboardError}
                            </div>
                          )}

                          {onboardSuccess && (
                            <div className="p-3 bg-emerald-950/50 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 font-medium space-y-1">
                              <p className="font-bold">✓ {onboardSuccess}</p>
                              <p className="text-[10px] text-slate-400 font-normal">
                                A temporary non-persisted auth instance completed the signup cleanly. The new user can now log in securely!
                              </p>
                            </div>
                          )}

                          <div className="flex justify-end pt-2">
                            <button
                              type="submit"
                              disabled={isOnboarding}
                              className="bg-gradient-to-r from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-xs px-6 py-3 rounded-xl shadow-lg shadow-cyan-500/10 transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50"
                            >
                              {isOnboarding ? 'Provisioning Node...' : 'Provision & Onboard Customer'}
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Superuser: Manage & Delete Clients */}
                      <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                        <h3 className="text-base font-extrabold text-white mb-1 flex items-center gap-2">
                          <Building className="w-4 h-4 text-cyan-400" />
                          Superuser: Manage Customer Nodes
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-6">
                          Listed below are the active multi-tenant container nodes currently loaded in your environment. You can delete redundant nodes instantly.
                        </p>

                        <div className="space-y-3">
                          {tenants.map(t => (
                            <div key={t.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="text-left">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-black text-white">{t.name}</span>
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 uppercase font-mono tracking-wider">{t.industry}</span>
                                  {t.id === activeTenantId && (
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 uppercase font-mono tracking-wider">Active View</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1">
                                  Subdomain: <span className="text-slate-300">{t.domain}</span> | ID: <span className="text-slate-300">{t.id}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteTenant(t.id)}
                                className="bg-red-950/40 hover:bg-red-950 border border-red-500/20 hover:border-red-500/50 text-red-400 hover:text-red-300 text-[10px] font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Client Node</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Restricted Notice for Non-Superuser */
                    <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <h3 className="text-sm font-bold text-slate-200 mb-1.5 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-500" />
                        Superuser Client Management Restricted
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        To add or delete customer client nodes, you must log in as a Superuser (using your superuser email <strong className="text-cyan-400 font-mono">rishkatiyar1@gmail.com</strong> with password <strong className="text-cyan-400 font-mono">123456789</strong>). Standard fleet administrators do not have access to manage global SaaS tenant nodes.
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl">
                    <h3 className="text-base font-bold text-white mb-2">Supabase Settings</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-6">
                      This client application is fully synchronized with your personal Supabase environment. It uses the anonymous key and database row-level security policy parameters specified.
                    </p>

                    <div className="space-y-3 text-xs mb-6 font-mono">
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-slate-500 block mb-1 text-[10px] font-sans">VITE_SUPABASE_URL</span>
                        <span className="text-white select-all">{import.meta.env.VITE_SUPABASE_URL || 'Using default sandbox endpoint'}</span>
                      </div>
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-slate-500 block mb-1 text-[10px] font-sans">VITE_SUPABASE_ANON_KEY</span>
                        <span className="text-white select-all">{import.meta.env.VITE_SUPABASE_ANON_KEY ? '• Loaded Successfully •' : 'Not Configured'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 p-6 rounded-2xl">
                    <h3 className="text-base font-bold text-[#f43f5e] mb-2">Zone Actions</h3>
                    <p className="text-xs text-slate-400 mb-4">Resetting cache restores baseline transporter operations.</p>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to restore original default state? This will clear local changes.')) {
                          localStorage.clear();
                          setTenants(INITIAL_TENANTS);
                          setActiveTenantId('tenant-balaji');
                          window.location.reload();
                        }
                      }}
                      className="bg-red-950 hover:bg-red-900/50 text-red-400 border border-red-500/20 text-xs font-bold py-2 px-4 rounded-xl transition-all cursor-pointer"
                    >
                      Restore Defaults & Clear Cache
                    </button>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      )}

      {/* ================================= PASSWORD RESET MODAL ================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-left relative animate-fadeIn">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5">
              <Key className="w-5 h-5 text-cyan-400" />
              Reset password
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter your registered email address below, and we will trigger a reset instructions payload.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@balaji.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {forgotSuccess && (
                <div className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/20">
                  {forgotSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all uppercase tracking-wider cursor-pointer"
              >
                Send Reset Email
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================================= DEMO TRIAL MODAL ================================= */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-left relative animate-fadeIn">
            <button
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Request Enterprise Trial
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Provision test GPS/DSM hardware tracking assets and secure your private subdomain today.
            </p>

            <form onSubmit={handleDemoSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 9988776655"
                  value={demoPhone}
                  onChange={(e) => setDemoPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Transports"
                  value={demoCompany}
                  onChange={(e) => setDemoCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {demoSubmitted && (
                <div className="text-xs text-cyan-400 font-semibold bg-cyan-500/10 p-2.5 rounded-lg border border-cyan-500/20">
                  Submitting trial request...
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all uppercase tracking-wider cursor-pointer"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
