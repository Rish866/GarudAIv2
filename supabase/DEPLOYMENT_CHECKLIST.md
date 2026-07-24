# Supabase Deployment Security Checklist

## Before First Deployment

- [ ] Create Supabase project at https://app.supabase.com
- [ ] Enable Email/Password auth provider
- [ ] Set minimum password length to 8 in Auth settings
- [ ] Run `supabase/schema.sql` (platform tables + helper functions)
- [ ] Run `supabase/migrations/001-business-tables.sql` (all business tables + RLS)
- [ ] Run `supabase/migrations/002-workflow-tables.sql` (LR, POD, settlements)
- [ ] Run `supabase/storage-policies.sql` (storage bucket security)
- [ ] Set environment variables in hosting platform:
  - `VITE_SUPABASE_URL` = your project URL
  - `VITE_SUPABASE_ANON_KEY` = your anon/publishable key
  - `NODE_ENV=production`
  - `ALLOWED_ORIGINS` = your domain(s)

## Security Verification

After running all migrations, verify security:

```sql
-- Verify RLS is enabled on ALL business tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN ('schema_migrations')
ORDER BY tablename;
-- ALL should show rowsecurity = true

-- Verify no open policies exist
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND qual = 'true';
-- This query should return ZERO rows

-- Verify organization isolation function exists
SELECT proname FROM pg_proc WHERE proname = 'get_user_organization_id';
-- Should return 1 row

-- Test unauthenticated access (should return empty)
-- Use the anon key without signing in:
SELECT count(*) FROM vehicles; -- Should be 0
SELECT count(*) FROM trips;    -- Should be 0
SELECT count(*) FROM invoices; -- Should be 0
```

## NEVER DO

- [ ] Never deploy `SUPABASE_SCHEMA.sql` to production (it has open policies)
- [ ] Never use service_role key in frontend code
- [ ] Never store secrets in source code or vite.config.ts
- [ ] Never create policies with `USING (true)` for business tables
- [ ] Never skip the storage-policies.sql for the erp-documents bucket

## Storage Bucket Setup

1. Go to Supabase Dashboard → Storage
2. The `erp-documents` bucket is created by `storage-policies.sql`
3. Verify it shows as "Private" (not Public)
4. Verify 4 policies exist (read, upload, update, delete)

## Auth Configuration

In Supabase Dashboard → Authentication → Settings:
- Minimum password length: 8
- Enable email confirmations: Yes (production)
- Disable email confirmations: OK for development/testing
- Site URL: Your production domain
- Redirect URLs: Your domain + `/invite/accept`
