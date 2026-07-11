# Garud AI ERP — Rollback Instructions

## If Migration Causes Issues

### Scenario 1: RLS Policies Break Application
If users cannot access their data after applying RLS migrations:

```sql
-- Emergency: Disable RLS temporarily (DANGEROUS — use only for debugging)
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
-- Repeat for affected tables

-- Then investigate: Check if user has organization membership
SELECT * FROM organization_members WHERE user_id = 'affected_user_id';
```

### Scenario 2: Trigger Blocks Valid Operations
If the cross-org validation trigger is too strict:

```sql
-- Disable the trigger temporarily
ALTER TABLE trips DISABLE TRIGGER validate_trip_org_refs;
-- Fix the data, then re-enable
ALTER TABLE trips ENABLE TRIGGER validate_trip_org_refs;
```

### Scenario 3: Need to Restore Old Auth Flow
If Supabase Auth isn't working and users can't log in:
1. The old localStorage auth code has been removed
2. Redeploy a previous commit: `git revert HEAD~N`
3. Or add Supabase Auth users manually in Dashboard → Authentication → Users

### Scenario 4: Full Database Rollback
```sql
-- Drop all new tables (CAUTION: loses all new data)
DROP TABLE IF EXISTS public.organization_invitations CASCADE;
DROP TABLE IF EXISTS public.organization_settings CASCADE;
DROP TABLE IF EXISTS public.organization_members CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.platform_admins CASCADE;

-- Remove organization_id from existing tables
ALTER TABLE vehicles DROP COLUMN IF EXISTS organization_id;
ALTER TABLE drivers DROP COLUMN IF EXISTS organization_id;
-- ... repeat for all 36 tables
```

### Scenario 5: Revert to Previous Git Commit
```bash
# Find the last working commit
git log --oneline -20

# Revert to it
git checkout <commit_hash> -- .
git commit -m "Revert to working state"
git push
```

## Prevention
- Always backup database before running migrations
- Test migrations on staging first (if available)
- Run `scripts/validate-tenant-migration.sql` after every migration
- Keep the old `garud-erp-storage` localStorage data until confirmed working
