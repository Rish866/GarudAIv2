-- Migration 006: Audit log table + single-active-membership constraint
-- Part of multi-tenant production readiness

-- Create activity_log table for persistent audit trail
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- RLS: users can only see audit logs for their own organization
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org audit logs"
  ON activity_log FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users insert own org audit logs"
  ON activity_log FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_activity_log_org_id ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);

-- Enforce single active membership per non-admin user
-- This prevents configuration errors where a user belongs to multiple orgs
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_membership
  ON organization_members(user_id)
  WHERE status = 'active';

-- Note: Platform admins who need multiple orgs should use a different status
-- or have the constraint relaxed via a separate admin flag.
-- The frontend blocks ERP loading if >1 active membership exists.
