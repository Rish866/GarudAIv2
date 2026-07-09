# GARUD AI - Enterprise Transport ERP Platform

A premium, multi-tenant SaaS Transport ERP with real-time GPS telematics, AI safety monitoring (ADAS/DSM), and a complete fleet operations suite.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Vite 6
- **Backend:** Express.js + Node.js
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth + Custom login proxy
- **UI:** Lucide Icons + Framer Motion

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file (or copy `.env.example`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Setup Database

Run the SQL schema in your Supabase SQL Editor:

1. Go to: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new`
2. Paste the contents of `supabase-schema.sql`
3. Click "Run"

Or use the setup script:
```bash
npm run db:setup
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 5. Production Build

```bash
npm run build
npm start
```

## Demo Login Credentials

| Account | Email | Password |
|---------|-------|----------|
| Superuser | rishkatiyar1@gmail.com | 123456789 |
| Demo Admin | admin@garud.ai | garud123 |
| Balaji Logistics | admin@balaji.com | balaji123 |
| Hindustan Mining | admin@hindustan.com | hindustan123 |
| Polar Cold Chain | admin@polar.com | polar123 |

## ERP Modules

| # | Module | Features |
|---|--------|----------|
| 1 | **Live Dashboard** | Real-time GPS map, speed monitoring, ADAS/DSM alerts, 4-channel dashcam view |
| 2 | **Masters** | Vehicles, Drivers, Customers CRUD with full KYC/document tracking |
| 3 | **Jobs / Operations** | Trip booking, LR generation, POD upload, trip status lifecycle |
| 4 | **Documents & Alerts** | License/permit expiry tracking, proactive compliance alerts |
| 5 | **Fuel Management** | Fuel logs, mileage calculation, pilferage detection |
| 6 | **Tyre Management** | Tyre lifecycle, retreading, position tracking, replacement alerts |
| 7 | **Maintenance** | Preventive scheduling, breakdown logging, workshop management |
| 8 | **Accounts & Billing** | Invoice generation, payment collection, expense tracking, P&L |
| 9 | **Payroll** | Driver salary, trip allowances, advance deductions |
| 10 | **Reports** | Revenue analytics, fleet utilization, cost per km/trip |
| 11 | **Customer/Vendor Portal** | Self-service booking, tracking, quotation management |
| 12 | **Settings** | Superuser onboarding, tenant management, cache controls |

## Multi-Tenant Architecture

- Each transporter company is an isolated "tenant" with their own data partition
- Row-Level Security (RLS) ensures strict data isolation
- Superuser can onboard new transporters and manage tenant nodes
- Supports: Trailer/Container, Hywa/Tipper, Cold Chain, School Bus, Logistics

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config` | Get public Supabase config |
| GET | `/api/health` | Server health check |
| POST | `/api/auth/login` | Authenticate user |
| POST | `/api/admin/onboard` | Register new transporter |
| POST | `/api/admin/setup-database` | Seed demo data |

## Project Structure

```
GarudAIv2/
├── server.ts                  # Express backend (auth, onboarding, API)
├── src/
│   ├── App.tsx               # Main application with routing & state
│   ├── types.ts              # Complete TypeScript type definitions
│   ├── mockData.ts           # Local storage ERP data manager
│   ├── supabaseClient.ts     # Supabase client + SQL schema
│   ├── supabaseService.ts    # Database service layer
│   └── components/
│       ├── LiveDashboard.tsx       # GPS map & telemetry HUD
│       ├── MastersManager.tsx      # Vehicle/Driver/Customer CRUD
│       ├── JobsOperationsManager.tsx # Trip lifecycle management
│       ├── DocumentsAlertsManager.tsx # Compliance & alerts
│       ├── FuelManagement.tsx      # Fuel logging & analytics
│       ├── TyreManagement.tsx      # Tyre lifecycle tracking
│       ├── MaintenanceManager.tsx  # Workshop & maintenance
│       ├── AccountsManager.tsx     # Billing & finance
│       ├── PayrollManager.tsx      # Driver salary management
│       ├── ReportsManager.tsx      # Analytics & reports
│       ├── CustomerVendorPortal.tsx # External portal
│       ├── SalesManager.tsx        # Enquiry/quotation/contracts
│       ├── FleetManager.tsx        # Fleet operations
│       ├── TripsManager.tsx        # Trip management
│       ├── CustomerPortal.tsx      # Customer self-service
│       └── DriverPortal.tsx        # Driver mobile interface
├── scripts/
│   ├── setup-database.ts     # Database provisioning script
│   └── fix-schema.ts         # Schema migration helper
├── supabase-schema.sql        # Complete SQL schema + seed data
├── .env                       # Environment variables (not committed)
├── .env.example               # Environment template
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies & scripts
```

## License

Proprietary - GARUD AI Platform
