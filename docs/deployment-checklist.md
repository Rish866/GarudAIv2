# Garud AI ERP — Production Deployment Checklist

## Pre-Deployment Steps

### 1. Supabase Configuration
- [ ] Enable Supabase Auth → Email provider
- [ ] Set email verification: ON (Authentication → Settings → Email Auth)
- [ ] Configure password reset email template
- [ ] Set minimum password length: 8 characters
- [ ] Run SQL migrations in order:
  1. `supabase/migrations/001_multi_tenant_foundation.sql`
  2. `supabase/migrations/002_complete_tenant_tables.sql`
  3. `supabase/migrations/003_correct_rls_policies.sql`
  4. `supabase/migrations/004_storage_policies.sql`
  5. `supabase/migrations/005_api_security_and_relational_integrity.sql`
- [ ] Run data migration: `scripts/map-existing-data-to-organizations.sql`
- [ ] Run validation: `scripts/validate-tenant-migration.sql`
- [ ] Optionally run: `supabase/seed-demo.sql` (for demo org only)

### 2. Vercel Environment Variables
- [ ] `VITE_SUPABASE_URL` = your Supabase project URL
- [ ] `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
- [ ] `VITE_PLATFORM_ADMIN_EMAIL` = platform admin email
- [ ] Verify: NO service role key in any VITE_ variable

### 3. Security Verification
- [ ] GitHub repo is PRIVATE
- [ ] No hardcoded passwords in source code
- [ ] No service role key in frontend
- [ ] npm audit shows 0 vulnerabilities
- [ ] RLS enabled on ALL 36 business tables
- [ ] Storage bucket is PRIVATE (not public)

### 4. Build Verification
- [ ] `npm run build` passes (0 errors)
- [ ] `npm run test` passes (30/30 tests)
- [ ] `npm run typecheck` passes (if enabled)
- [ ] No console.log with sensitive data in production build

### 5. Post-Deployment Verification
- [ ] Landing page loads correctly
- [ ] Registration creates new org + empty ERP
- [ ] Login works with Supabase Auth
- [ ] Dashboard shows zeros for new account
- [ ] All modules display empty state (no demo data)
- [ ] Platform admin can see admin banner
- [ ] Data created by User A is invisible to User B

## Production Monitoring (Recommended)
- [ ] Set up Sentry for error tracking
- [ ] Enable Supabase Dashboard monitoring
- [ ] Set up uptime monitoring (BetterUptime/Pingdom)
- [ ] Configure backup schedule in Supabase (automatic for Pro plan)
