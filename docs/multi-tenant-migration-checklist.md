# Garud AI ERP — Multi-Tenant Migration Checklist

## Overall Status: Partially Complete

The frontend code migration is complete. All 48 routable modules read from Supabase
via `useModuleData`. The Supabase database migrations have **not been executed** on
the live instance — RLS is not active and unauthenticated access to business data
is currently possible (verified: 14 vehicle rows exposed without auth).

**Do not deploy the frontend to production until migrations 000–007 are applied
and the post-migration validation script passes.**

## Architecture

- Canonical tenant field: `organization_id` (UUID, injected by data layer)
- Domain types: no `company_id` field (removed)
- Data source: Supabase PostgreSQL with RLS
- Auth: Supabase Auth (bcrypt, JWT) with session bootstrap on mount
- Frontend state: Zustand for UI only (theme, sidebar, activeModule)
- CRUD: `useModuleData<T>(tableName)` hook — uses `Record<string, unknown>` for
  Supabase insert/update calls (constrained compatibility boundary pending
  generated schema types via `supabase gen types typescript`)

---

## Phase Completion Tracker

| Phase | Description | Status | Evidence |
|-------|-------------|--------|----------|
| 0 | Migration inventory & architecture | ✅ Complete | This document |
| 1 | Database foundation (organizations, members) | ✅ Code ready | `supabase/migrations/001_multi_tenant_foundation.sql` |
| 2 | Tenant helper functions | ✅ Code ready | Functions in migration 001 |
| 3 | Add organization_id to all tables | ✅ Code ready | Migration 001 (ALTER TABLE) |
| 4 | Existing data migration | ✅ Code ready | `supabase/migrations/007_map_existing_data_to_organizations.sql` |
| 5 | RLS policies (role-based) | ✅ Code ready | `supabase/migrations/003_correct_rls_policies.sql` |
| 6 | Secure onboarding (create_organization_for_user) | ✅ Code ready | Function in migration 001 |
| 7 | Organization context/provider | ✅ Complete | `src/contexts/OrganizationContext.tsx` |
| 8 | Data-access layer (repositories) | ✅ Complete | `src/data/` (7 repositories + baseRepository) |
| 9 | Module migration (48 routable modules) | ✅ Complete | All use `useModuleData` — zero useStore business reads |
| 10 | Remove localStorage business persistence | ✅ Complete | Zustand persists only `garud-erp-ui-state` |
| 11 | Remove hardcoded seed data | ✅ Complete | Zero references to comp_garud / TENANT_ID |
| 12 | Realtime isolation | ✅ Complete | `src/hooks/useRealtimeSubscription.ts` (org-scoped) |
| 13 | Storage isolation | ✅ Code ready | `supabase/migrations/004_storage_policies.sql` |
| 14 | API/service-role security | ✅ Complete | No service key in frontend |
| 15 | Relational tenant integrity | ✅ Code ready | Triggers in migration 005 |
| 16 | Dashboard reads from Supabase | ✅ Complete | DashboardModule uses useModuleData |
| 17 | Role permissions | ✅ Complete | `src/lib/permissions.ts` + 24 passing tests |
| 18 | Automated testing | ✅ Complete | 42 unique tests pass (unit + integration) |
| 19 | Build & quality | ✅ Complete | TypeScript 0 errors, build passes |
| 20 | Production readiness | ❌ Blocked | Live RLS not active (14 rows exposed) |

---

## Blocked by External Action

| Item | Blocker | Action Required |
|------|---------|-----------------|
| RLS enforcement | Migrations not run on live Supabase | Run `000` → `007` in SQL Editor |
| Unauthenticated data exposure | 14 vehicle rows visible without auth | Apply RLS (migration 003) |
| Organization tables | Don't exist in live DB | Run migrations 000 + 001 |
| End-to-end tenant isolation | Cannot verify until RLS active | Test after migrations |

---

## Module Audit

**50 component files** = 48 routable modules + 2 sub-components

The `ModuleName` type defines 48 entries. The `moduleComponents` map in App.tsx
routes 48 modules. Two additional files (`DriverAdvanceTracker`, `CustomerTrackingPortal`)
are sub-components rendered inside parent modules, not independently routable.

### Full CRUD — 11 modules
Create + Update + Remove via `useModuleData`:
- AccountsModule
- ApprovalsModule
- AttendanceModule
- ClaimsModule
- CustomersModule
- EnquiriesModule
- FleetModule
- IndentModule
- TransferModule
- TripsModule
- VendorModule

### Partial CRUD — 15 modules
Create via `useModuleData` (update/remove not yet wired for all operations):
- BillingModule
- ChallanModule
- ContractRateModule
- DriversModule
- EWayBillModule
- FuelModule
- GeofencingModule
- InventoryModule
- MaintenanceModule
- MarketHireModule
- PurchaseModule
- RouteModule
- SalesModule
- TyreModule
- WorkOrderModule

### Read-only / Derived — 22 components
Read from Supabase via `useModuleData`, display aggregated or filtered views:
- AuditTrailModule
- CreditBlockModule
- CustomerPortalModule
- CustomerTrackingPortal (sub-component)
- DashboardModule
- DashcamModule
- DocumentVaultModule
- DriverAdvanceTracker (sub-component)
- ExpiryDashboardModule
- FuelTheftModule
- GPSSettingsModule
- GSTReportsModule
- MobileAppModule
- NotificationsModule
- PayrollModule
- PnLModule
- PredictiveModule
- ProfitabilityModule
- ReportsModule
- SLAModule
- TrackingLinkModule
- VendorPortalModule

### Configuration UI — 2 modules
No business table access (static docs / org settings):
- APIModule
- SettingsModule

---

## Test Structure

| Script | Scope | Files | Unique Tests |
|--------|-------|-------|--------------|
| `npm test` | unit + integration | 3 files | **42** |
| `npm run test:integration` | integration only | 2 files | 30 (subset of above) |
| `npm run test:rls` | live RLS verification | 1 file | 11 (separate) |

The 42 tests from `npm test` include the 30 integration tests plus 12 unit tests.
Running `npm run test:integration` re-runs a subset — it does not add unique tests.

Total unique tests: **42 (unit+integration) + 11 (RLS) = 53**

---

## Type Safety Boundary

The `useModuleData` hook and `TenantRepository` class use `Record<string, unknown>`
for Supabase `.insert()` and `.update()` calls. This is a **constrained compatibility
boundary**, not full type safety:

- It prevents accidental primitive or array insertion
- It does NOT validate column names or value types at compile time
- Full compile-time safety requires generating Supabase types via:
  ```bash
  supabase gen types typescript --project-id <id> > src/types/supabase.ts
  ```
  This is blocked until migrations are applied to the live instance.

---

## Migration Files (Execution Order)

See `supabase/MIGRATION_ORDER.md` for full details.

| # | File | Purpose |
|---|------|---------|
| 0 | `000_prerequisite_base_tables.sql` | Creates 16 base business tables |
| 1 | `001_multi_tenant_foundation.sql` | organizations, members, helpers, org_id columns |
| 2 | `002_complete_tenant_tables.sql` | 20 additional business tables |
| 3 | `003_correct_rls_policies.sql` | Role-based RLS on all 42 tables |
| 4 | `004_storage_policies.sql` | Private storage bucket |
| 5 | `005_api_security_and_relational_integrity.sql` | Cross-org validation triggers |
| 6 | `006-audit-log-and-constraints.sql` | Audit log + single-membership constraint |
| 7 | `007_map_existing_data_to_organizations.sql` | Legacy data mapping + NOT NULL |

---

## Definition of Done

| Criteria | Frontend | Database |
|----------|----------|----------|
| No module uses localStorage for business data | ✅ | N/A |
| No hardcoded tenant ID | ✅ | N/A |
| Every module reads from Supabase | ✅ | ⚠️ Tables must exist |
| RLS enforces tenant isolation | ✅ (code ready) | ❌ Not deployed |
| Build passes | ✅ | N/A |
| TypeScript clean (0 errors) | ✅ | N/A |
| Tests pass (42 unit+integration) | ✅ | N/A |
| RLS tests pass (11 live) | N/A | ❌ Fails — 14 rows exposed |
