# Organization Invitation Workflow

## Overview

Secure invitation system for adding users to organizations using Supabase Edge Functions and SHA-256 token hashing.

## Architecture

```
Owner → Edge Function (send) → DB (stores hash) + Email (sends raw token)
Invitee → /invite/accept?token=... → Edge Function (accept) → DB (creates membership)
```

## Required Secrets

Set in Supabase Dashboard → Edge Functions → Secrets:

| Secret | Purpose | Required |
|--------|---------|----------|
| `RESEND_API_KEY` | Email delivery via Resend.com | Yes (for email) |
| `APP_URL` | Frontend URL for acceptance links | Yes |

Auto-provided by Supabase (do not set manually):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Deployment

```bash
# Deploy all Edge Functions
npx supabase functions deploy send-organization-invite --project-ref emcynvexbauhohpwcqaw
npx supabase functions deploy accept-organization-invite --project-ref emcynvexbauhohpwcqaw
npx supabase functions deploy resend-organization-invite --project-ref emcynvexbauhohpwcqaw
npx supabase functions deploy revoke-organization-invite --project-ref emcynvexbauhohpwcqaw

# Set secrets
npx supabase secrets set RESEND_API_KEY=re_xxxxx --project-ref emcynvexbauhohpwcqaw
npx supabase secrets set APP_URL=https://garud-a-iv2.vercel.app --project-ref emcynvexbauhohpwcqaw
```

## Email Provider

Using [Resend](https://resend.com) for email delivery:
1. Create account at resend.com
2. Add and verify your sending domain
3. Generate API key
4. Set as `RESEND_API_KEY` secret

## Frontend Routes

| Route | Purpose |
|-------|---------|
| `/invite/accept?token=...` | Acceptance page (handles all states) |
| Settings → Users tab | Send/resend/revoke invitations |

## Security Model

- Raw invitation token sent ONLY in email and to Edge Function
- Database stores SHA-256 hash of token only
- Token cleared from browser after acceptance
- Edge Functions validate: auth, role, org membership, email match
- Non-owner cannot assign owner role
- Expired/revoked tokens reject immediately
- Duplicate acceptance is idempotent

## Database Schema

Table: `organization_invitations`
- `token_hash` — SHA-256 hash (raw token NEVER stored)
- Unique constraint on `(organization_id, email) WHERE status = 'pending'`
- `accept_organization_invite(token_hash)` RPC for secure acceptance

## Rollback

```sql
-- Revert invitation table (CAUTION: loses all invitation data)
DROP TABLE IF EXISTS public.organization_invitations CASCADE;
DROP FUNCTION IF EXISTS public.accept_organization_invite CASCADE;
```

## Known Limitations

1. Email delivery requires RESEND_API_KEY (invitations work without email but require manual link sharing)
2. Signup flow sends welcome email via Supabase Auth (separate from invitation email)
3. No rate limiting on resend (add cooldown in production)
4. Token expiry is 7 days (not configurable from UI yet)
