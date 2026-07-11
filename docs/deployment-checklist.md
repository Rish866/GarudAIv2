# Garud AI ERP — Production Deployment Checklist

## Pre-Deployment Steps

### 1. Supabase Database Setup

Run the pre-migration diagnostic first:
```
supabase/scripts/pre_migration_diagnostic.sql
```

Then run all migrations **in order** (see `supabase/MIGRATION_ORDER.md`):

- [ ] `000_prerequisite_base_tables.sql` — Creates 16 base business tables
- [ ] `001_multi_tenant_foundation.sql` — Multi-tenant foundation (organizations, members, helpers)
- [ ] `002_complete_tenant_tables.sql` — 20 additional business tables
- [ ] `003_correct_rls_policies.sql` — Role-based RLS on all 42 tables
- [ ] `004_storage_policies.sql` — Private storage bucket + org-scoped policies
- [ ] `005_api_security_and_relational_integrity.sql` — Cross-org validation triggers
- [ ] `006-audit-log-and-constraints.sql` — Audit log FK + single-membership constraint
- [ ] `007_map_existing_data_to_organizations.sql` — Maps legacy data + NOT NULL

Run post-migration validation:
```
supabase/scripts/post_migration_validation.sql
```

### 2. Supabase Auth Configuration
- [ ] Enable Email provider (Authentication → Providers → Email)
- [ ] Set email verification: ON
- [ ] Configure password reset email template
- [ ] Set minimum password length: 6 characters
- [ ] Disable "Confirm email" for development (optional)

### 3. Platform Admin Setup
- [ ] Insert platform admin into `platform_admins` table:
```sql
INSERT INTO public.platform_admins (user_id, level)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'rishkatiyar1@gmail.com'),
  'super_admin'
) ON CONFLICT (user_id) DO NOTHING;
```

### 4. Vercel Environment Variables
- [ ] `VITE_SUPABASE_URL` = Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` = Supabase anon key (publishable)
- [ ] `VITE_PLATFORM_ADMIN_EMAIL` = platform admin email
- [ ] Verify: **NO** service role key in any `VITE_` variable

### 5. Security Verification
- [ ] GitHub repo is PRIVATE
- [ ] No hardcoded passwords in source code
- [ ] No service role key in frontend code
- [ ] `npm audit` shows 0 vulnerabilities
- [ ] RLS enabled on ALL 42 tables (verify via post_migration_validation.sql)
- [ ] Storage bucket `erp-documents` is PRIVATE (not public)

### 6. Build Verification
- [ ] `npm run typecheck` passes (0 TypeScript errors)
- [ ] `npm run build` passes (0 build errors)
- [ ] `npm test` passes (41/41 tests)

### 7. Post-Deployment Verification
- [ ] Landing page loads correctly
- [ ] Registration creates new org + empty ERP
- [ ] Login works with Supabase Auth
- [ ] Loading state shown during organization resolution
- [ ] Dashboard shows zeros for new account (no demo data)
- [ ] All modules display empty state
- [ ] No white screen on login — error boundary catches errors
- [ ] Platform admin can see admin banner
- [ ] Data created by User A is invisible to User B
- [ ] Logout clears session
- [ ] Page refresh restores session

## Production Monitoring (Recommended)
- [ ] Set up error tracking (Sentry or similar)
- [ ] Enable Supabase Dashboard monitoring
- [ ] Configure uptime monitoring
- [ ] Enable Supabase automated backups (Pro plan)
