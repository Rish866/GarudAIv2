# Migration 007 Deployment Guide

## Overview

Migration 007 creates the persistent workflow entities required by Workflow 1:
- `lrs` — Consignment notes with safe sequential numbering
- `pods` — Proof of delivery with verification lifecycle
- `driver_settlements` — Full settlement lifecycle
- `invoice_trips` — Invoice-trip junction for idempotency
- `document_sequences` — Concurrency-safe number generation
- Linkage columns on trips, indents, quotations
- Cross-tenant validation trigger
- LR generation RPC

## Prerequisites

- Migration 006 (RLS hardening) must be deployed first
- `get_user_organization_id()` function must exist
- `organization_members` table must exist
- `branches` table must exist

## Deployment Order

### Step 1: Run Preflight

```sql
-- Copy-paste contents of: scripts/migration-007-preflight.sql
-- Expected: no blocking issues
-- Check for: duplicate LR numbers, null org_ids, existing POD/advance data
```

### Step 2: Deploy Migration

```sql
-- Copy-paste contents of: scripts/migration-007-workflow-linkage.sql
-- Expected: tables created, columns added, RLS applied, RPC created
-- Duration: ~5-10 seconds
```

### Step 3: Run Verification

```sql
-- Copy-paste contents of: scripts/migration-007-verify.sql
-- Expected output:
--   4 new tables (lrs, pods, driver_settlements, invoice_trips)
--   8+ linkage columns added
--   16+ RLS policies on new tables
--   4+ unique indexes
--   1 cross-tenant trigger
--   LR RPC function exists
```

### Step 4: Test Application

1. Login to https://garudai.in with test2@test.com
2. Open a trip → verify "Driver Settlement" panel loads (draft created)
3. Create a new trip → verify LR number appears (from database RPC)
4. Upload POD → verify toast shows "POD uploaded"
5. Try creating same trip's invoice twice → verify "already invoiced" message

## Rollback

If issues occur after deployment:

```sql
-- Copy-paste contents of: scripts/migration-007-rollback.sql
-- WARNING: Drops new tables (lrs, pods, driver_settlements, invoice_trips)
-- Data in these tables will be LOST
-- Column drops are commented out by default (uncomment only if safe)
```

## Post-Deployment E2E

After successful deployment, run E2E tests:

```bash
E2E_BASE_URL=https://garudai.in \
E2E_TEST_EMAIL=test2@test.com \
E2E_TEST_PASSWORD=<password> \
E2E_MIGRATION_007=true \
npm run test:e2e
```

## Backfill Strategy

### Existing LR Numbers

Trips with `lr_number` but no `lrs` record:
```sql
INSERT INTO lrs (organization_id, trip_id, lr_number, status, generated_at)
SELECT organization_id, id, lr_number, 'active', created_at
FROM trips
WHERE lr_number IS NOT NULL AND lr_number != ''
AND NOT EXISTS (SELECT 1 FROM lrs WHERE lrs.trip_id = trips.id)
ON CONFLICT DO NOTHING;
```

### Existing POD URLs

Trips with `pod_url` but no `pods` record:
```sql
INSERT INTO pods (organization_id, trip_id, file_path, status, uploaded_at)
SELECT organization_id, id, pod_url, 'uploaded', updated_at
FROM trips
WHERE pod_url IS NOT NULL AND pod_url != ''
AND NOT EXISTS (SELECT 1 FROM pods WHERE pods.trip_id = trips.id)
ON CONFLICT DO NOTHING;
```

Note: Backfilled PODs have status 'uploaded' (not 'verified'). They require manual verification according to business policy.

### Existing Driver Advances

Trips with advance_amount but no settlement:
```sql
INSERT INTO driver_settlements (organization_id, trip_id, driver_id, opening_advance, status)
SELECT organization_id, id, driver_id, advance_amount, 'draft'
FROM trips
WHERE advance_amount > 0 AND driver_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM driver_settlements WHERE driver_settlements.trip_id = trips.id AND status != 'reversed')
ON CONFLICT DO NOTHING;
```

Note: Backfilled settlements are 'draft' status. They require review/approval by operations.

## Failure Conditions

| Condition | Action |
|-----------|--------|
| Preflight shows duplicate LR numbers | Fix duplicates before migration |
| Preflight shows null org_ids | Run backfill first |
| Migration fails on existing table | Safe — uses IF NOT EXISTS |
| RPC creation fails | Check function syntax, existing functions |
| Application errors after deploy | Run rollback SQL immediately |
| Users locked out | Check RLS policies, verify get_user_organization_id() |
