# Garud AI ERP — Database Migration Order

## Prerequisites

- Supabase project with auth enabled
- At least one user in `auth.users` (the platform admin)
- Access to Supabase SQL Editor or `psql`

## Execution Order

Run these migrations **in exact order** in the Supabase SQL Editor.
Each migration depends on the one before it.

| # | File | Purpose |
|---|------|---------|
| 0 | `000_prerequisite_base_tables.sql` | Creates 16 base business tables (vehicles, drivers, etc.) |
| 1 | `001_multi_tenant_foundation.sql` | Creates organizations, members, helper functions; adds `organization_id` to base tables |
| 2 | `002_complete_tenant_tables.sql` | Creates 20 additional business tables with `organization_id` |
| 3 | `003_correct_rls_policies.sql` | Drops all unsafe policies; applies role-based RLS to all 42 tables |
| 4 | `004_storage_policies.sql` | Creates `erp-documents` bucket with org-scoped storage policies |
| 5 | `005_api_security_and_relational_integrity.sql` | Cross-org validation triggers + composite unique constraints |
| 6 | `006-audit-log-and-constraints.sql` | Audit log enhancements + single-active-membership constraint |
| 7 | `007_map_existing_data_to_organizations.sql` | Maps legacy rows to an organization; adds NOT NULL constraints |

## Before Running

Run `scripts/pre_migration_diagnostic.sql` to understand your current database state.

## After Running

Run `scripts/post_migration_validation.sql` to verify everything is correct.

## Scenarios

### Fresh Database (no existing data)

Run all 8 migrations in order (000 → 007). Migration 007 will create a default
organization automatically.

### Database with Existing Legacy Data

Run all 8 migrations in order. Migration 007 will:
1. Create a default organization (or use existing one)
2. Map all rows with `organization_id IS NULL` to that organization
3. Add `NOT NULL` constraints where safe
4. Log the mapping operation

### Re-running After Partial Failure

All migrations use idempotent patterns (`IF NOT EXISTS`, `CREATE OR REPLACE`).
If a migration fails mid-way, fix the issue and re-run from the failed migration.

## Platform Admin Setup

After migrations complete, insert your admin user:

```sql
INSERT INTO public.platform_admins (user_id, level)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'rishkatiyar1@gmail.com'),
  'super_admin'
)
ON CONFLICT (user_id) DO NOTHING;
```

## Creating Your First Organization

Option A — Use the RPC function:

```sql
SELECT public.create_organization_for_user(
  'Your Company Name',
  'your-company-slug',
  'YOUR-GSTIN',
  'Your City',
  'Your State'
);
```

Option B — The app's onboarding flow handles this automatically.
