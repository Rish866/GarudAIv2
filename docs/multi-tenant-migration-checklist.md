# Garud AI ERP — Multi-Tenant Migration Checklist

## Status: IN PROGRESS

## Architecture Decision
- Canonical tenant identifier: `organization_id` (UUID)
- Data source: Supabase PostgreSQL with RLS
- Auth: Supabase Auth (bcrypt, JWT)
- State: Zustand for UI only, NOT for business data

## Phase Completion Tracker

| Phase | Description | Status |
|-------|-------------|--------|
| 0 | Migration inventory | ✅ Complete |
| 1 | Database foundation (organizations, members) | 🔄 In Progress |
| 2 | Tenant helper functions | ⬜ Pending |
| 3 | Add organization_id to all tables | ⬜ Pending |
| 4 | Existing data migration | ⬜ Pending |
| 5 | RLS policies | ⬜ Pending |
| 6 | Secure onboarding | ⬜ Pending |
| 7 | Organization context/provider | ⬜ Pending |
| 8 | Data-access layer (repositories) | ⬜ Pending |
| 9 | Module migration (all batches) | ⬜ Pending |
| 10 | Remove localStorage business persistence | ⬜ Pending |
| 11 | Remove hardcoded seed data | ⬜ Pending |
| 12 | Realtime isolation | ⬜ Pending |
| 13 | Storage isolation | ⬜ Pending |
| 14 | API/service-role security | ⬜ Pending |
| 15 | Relational tenant integrity | ⬜ Pending |
| 16 | Dashboard correction | ⬜ Pending |
| 17 | Role permissions | ⬜ Pending |
| 18 | Automated testing | ⬜ Pending |
| 19 | Build & quality checks | ⬜ Pending |
| 20 | Production readiness | ⬜ Pending |

---

## Module Migration Status

| Module | Current Source | Target Table | org_id | RLS | Repo | Read | Create | Update | Delete | RT | Storage | Tests | Status |
|--------|---------------|-------------|--------|-----|------|------|--------|--------|--------|----|---------| ------|--------|
| Fleet/Vehicles | Zustand+localStorage | vehicles | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Drivers | Zustand+localStorage | drivers | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Customers | Zustand+localStorage | customers | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Vendors | useState(seed) | vendors | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Trips | Zustand+localStorage | trips | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Enquiries | Zustand+localStorage | enquiries | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Quotations | Zustand+localStorage | quotations | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Indents | useState(seed) | indents | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Billing/Invoices | Zustand+localStorage | invoices | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Payments | Zustand+localStorage | payments | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Expenses | Zustand+localStorage | expenses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Fuel | Zustand+localStorage | fuel_entries | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Maintenance | Zustand+localStorage | maintenance_records | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Tyres | useState(seed) | tyres | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Payroll | useState(seed) | payroll_records | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Attendance | useState(seed) | attendance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Documents | Zustand+localStorage | documents | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Contracts | useState(seed) | contracts | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Market Hire | useState(seed) | market_hires | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Routes | useState(seed) | routes | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Transfers | useState(seed) | transfers | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Branches | Zustand+localStorage | branches | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Notifications | Zustand+localStorage | notifications | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Alerts | Zustand+localStorage | alerts | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Activity/Audit | Zustand+localStorage | activity_log | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Cash & Bank | useState(seed) | cash_entries, bank_entries | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Purchases | useState(seed) | purchases | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Sales | useState(seed) | sales | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Inventory | useState(seed) | inventory | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| E-Way Bill | useState(seed) | eway_bills | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Challans | useState(seed) | challans | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Work Orders | useState(seed) | work_orders | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Geofencing | useState(seed) | geofences | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| GPS Settings | useState(seed) | gps_devices | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| SLA | static data | sla_rules | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| AI Dashcam | static data | camera_events | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Fuel Alerts | static data | fuel_anomalies | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Claims | useState(seed) | claims | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Approvals | useState(seed) | approvals | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Mobile App | static data | N/A (config) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| REST API | static UI | N/A (config) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Tracking Links | store trips | trips | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Doc Expiry | derived from vehicles/drivers | vehicles, drivers | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Credit Control | derived from invoices | invoices, customers | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| P&L | derived from invoices/expenses | invoices, expenses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| GST Reports | derived from invoices | invoices | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Profitability | derived from trips/expenses | trips, expenses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Customer Portal | derived from trips/invoices | trips, invoices | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Vendor Portal | useState(seed) | vendor_indents | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Dashboard | Zustand metrics | all tables (aggregated) | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Reports | Zustand data | all tables | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Settings | store + localStorage | organization_settings | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Hardcoded Values to Remove

| Location | Value | Action |
|----------|-------|--------|
| src/lib/supabase.ts | `TENANT_ID = 'garud-erp-001'` | Replace with org context |
| src/lib/supabaseFullSync.ts | `TENANT_ID = 'garud-erp-001'` | Replace with org context |
| src/store/useStore.ts | `COMPANY_ID = 'comp_garud_001'` | Remove, use org |
| src/store/useStore.ts | `IS_DEMO_TENANT` localStorage check | Remove, use org membership |
| src/lib/tenant.ts | `isDemoTenant()` localStorage check | Remove entirely |
| src/lib/auth.ts | Platform admin email fallback | Move to DB |
| 27+ modules | `isDemoTenant() ? seedData : []` | Remove, read from DB |

---

## localStorage Keys to Audit

| Key | Current Use | Decision |
|-----|------------|----------|
| `garud-erp-{tenant}` | All business data | ❌ Remove (move to Supabase) |
| `garud_active_tenant` | Active tenant selection | ❌ Remove (derive from auth) |
| `garud_current_tenant` | Same as above | ❌ Remove |
| `garud_onboarding_done` | Onboarding wizard | ⚠️ Move to org_settings |
| `garud_registered_users` | User DB (old) | ❌ Remove (use Supabase Auth) |
| `garud_tenants` | Tenant list (old) | ❌ Remove |

---

## Continuation Point

If session limit reached, resume from: **Phase 1 — Creating SQL migration file**
