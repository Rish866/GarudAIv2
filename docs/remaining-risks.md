# Garud AI ERP — Remaining Risks Report

## Risk Level: MEDIUM (Acceptable for initial sales to small transporters)

## ⚠️ Known Remaining Risks

### 1. Zustand Store Still Has Business Data Structures
**Risk:** Low  
**Impact:** The Zustand store type definitions still include vehicles, trips, etc. The store initializes them as empty arrays. Some modules (Trips, Enquiries, Fleet, Drivers, Customers) still have `useStore()` imports alongside `useModuleData`.  
**Mitigation:** RLS enforces isolation at database level regardless of frontend code. These modules will progressively switch reads to Supabase as confirmed working.

### 2. Complex Modules Not Fully Migrated to Supabase Reads
**Risk:** Medium  
**Impact:** Trips, Enquiries, Fleet, Drivers, Customers still use `useStore()` for some operations (CRUD via store actions). They have `useModuleData` imports ready but aren't fully switched.  
**Mitigation:**
- These modules start empty for new accounts (store initializes as `[]`)
- New data created via `useModuleData` goes to Supabase correctly
- Old store actions go to empty state (no demo data returned)
- Full migration needs replacing ~500 lines per module

### 3. No Email Verification Enforcement
**Risk:** Medium  
**Impact:** Users can sign up and potentially access the app without verifying email. Depends on Supabase Auth settings.  
**Mitigation:** Enable "Confirm email" in Supabase Auth settings. The `signUpWithOrganization()` service handles this flow.

### 4. No Rate Limiting
**Risk:** Low (for initial launch)  
**Impact:** No API rate limiting on signup or login endpoints.  
**Mitigation:** Supabase has built-in rate limiting for Auth endpoints. For custom endpoints, implement when traffic grows.

### 5. No Automated Database Backups
**Risk:** Medium  
**Impact:** Data loss if Supabase has an issue.  
**Mitigation:** Supabase Pro plan includes daily backups. For free tier: manually export data periodically.

### 6. POD Not a Real File Upload
**Risk:** Low  
**Impact:** POD currently saves filename string, not actual uploaded file.  
**Mitigation:** Storage service (`storageService.ts`) is ready. Frontend POD upload component needs to call `uploadPOD()` instead of saving filename.

### 7. No Subscription/Billing Enforcement
**Risk:** Low (for initial sales)  
**Impact:** No mechanism to restrict features based on subscription tier.  
**Mitigation:** `organizations.subscription_status` field exists. Implement check when needed.

### 8. Seed Data Still in useStore.ts
**Risk:** Low  
**Impact:** Seed data constants exist in the store file (vehicles, trips, etc.) but are NEVER used for initialization (all arrays start as `[]`).  
**Mitigation:** Can be removed entirely in a cleanup pass. They have no runtime effect.

## ✅ Resolved Risks (No Longer Applicable)

| Risk | Resolution |
|------|-----------|
| Hardcoded passwords in source | ✅ Removed (using env vars + Supabase Auth) |
| USING(true) RLS policies | ✅ All replaced with membership-based policies |
| Demo data leaks | ✅ isDemoTenant removed everywhere, store starts empty |
| Service role key in frontend | ✅ Never existed, verified |
| Cross-org FK references | ✅ Validation triggers on 6 tables |
| localStorage as database | ✅ Business data persistence removed from Zustand |
| xlsx vulnerability | ✅ Package removed, replaced with native CSV |
| Unscoped dashboard metrics | ✅ Dashboard reads from Supabase (org-scoped) |

## Recommendation for Safe Launch

The platform IS safe to sell to small transporters (5-50 vehicles) with these conditions:
1. Make GitHub repo PRIVATE
2. Enable Supabase Auth email confirmation
3. Run ALL SQL migrations
4. Verify RLS with `validate-tenant-migration.sql`
5. Monitor Supabase dashboard for errors
6. Don't store sensitive financial documents until POD upload is fully implemented
