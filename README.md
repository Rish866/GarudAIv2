# Garud AI — Transport ERP

Multi-tenant Transport Enterprise Resource Planning system built with React, TypeScript, Supabase, and Vite.

## Architecture

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **State**: Zustand (UI state only) + Supabase (business data)
- **Multi-Tenancy**: `organization_id UUID` on all 36+ business tables
- **Security**: Row Level Security (RLS) with organization isolation

## Database Architecture

All business data is scoped by `organization_id UUID`. The database uses:

- **organizations** — Each transport company
- **organization_members** — User membership (role-based)
- **organization_settings** — Per-org configuration
- **36 business tables** — All with `organization_id` FK + RLS

Run migrations in order from `supabase/migrations/` (see `supabase/MIGRATION_ORDER.md`).

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (free tier works)

### Setup

1. Clone and install:
   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Set your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. Run database migrations (see `supabase/MIGRATION_ORDER.md`)

5. Start development:
   ```bash
   npm run dev
   ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run unit + integration tests |

## Project Structure

```
src/
  components/     # React components (modules, layout, UI)
  contexts/       # OrganizationContext (multi-tenant)
  hooks/          # useModuleData, useOrganization
  lib/            # Auth, Supabase, permissions, utilities
  services/       # Organization service
  store/          # Zustand (UI state only)
  types/          # TypeScript type definitions
  data/           # Repository pattern (TenantRepository)
supabase/
  migrations/     # Ordered SQL migrations (000-007)
  staging/        # Pre-tested migration scripts
  scripts/        # Diagnostic and validation scripts
```

## Security

- All RLS policies enforce organization isolation
- No anonymous access to business data
- Platform admin capabilities for SaaS operations
- Password hashed server-side via Supabase Auth (bcrypt)
- No service role keys in frontend code
