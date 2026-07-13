# Security Compensating Controls

## Context

The `supabase_admin` role has unsafe default ACLs that auto-grant TABLE, SEQUENCE, and FUNCTION privileges to PUBLIC, anon, and authenticated. The current executing role (`postgres`) cannot ALTER DEFAULT PRIVILEGES FOR ROLE `supabase_admin`. This is an external/platform blocker requiring Supabase support or Dashboard access.

## Compensating Controls (MANDATORY for all future migrations)

Until supabase_admin defaults are resolved via platform mechanism:

### 1. Every new TABLE must include explicit privilege revocation

```sql
CREATE TABLE IF NOT EXISTS public.new_table (...);
-- Immediately in same transaction:
REVOKE ALL ON TABLE public.new_table FROM PUBLIC, anon, authenticated;
```

### 2. Every new FUNCTION must include explicit privilege management

```sql
CREATE OR REPLACE FUNCTION public.new_function(...)
RETURNS ... AS $fn$ ... $fn$ LANGUAGE plpgsql SECURITY DEFINER;
-- Immediately:
REVOKE ALL ON FUNCTION public.new_function(...) FROM PUBLIC, anon, authenticated;
-- Then grant only to intended callers:
GRANT EXECUTE ON FUNCTION public.new_function(...) TO authenticated;
```

### 3. Every new SEQUENCE (if any) must be locked down

```sql
-- After creating any sequence:
REVOKE ALL ON SEQUENCE public.new_seq FROM PUBLIC, anon, authenticated;
```

### 4. Validation for new objects

Every migration's Block C validation must verify that newly created objects have zero grants to PUBLIC/anon/authenticated, regardless of default ACL ownership.

## Blocker Resolution

The supabase_admin unsafe defaults can be resolved by:
1. Supabase Dashboard > Database > Roles (if feature exists)
2. Supabase support ticket requesting default ACL remediation
3. Direct connection as supabase_admin (platform-internal only)

Do NOT use SET ROLE, privilege escalation, service keys directly, internal functions, or ownership changes to work around this.
