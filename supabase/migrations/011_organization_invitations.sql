-- ============================================================
-- Migration 011: Organization Invitations
--
-- Secure invitation workflow for adding users to organizations.
-- Tokens are stored as SHA-256 hashes only — raw tokens never in DB.
-- ============================================================

-- ============================================================
-- STEP 1: Drop and recreate organization_invitations with full schema
-- (Table may exist from migration 001 with minimal fields)
-- ============================================================
DROP TABLE IF EXISTS public.organization_invitations CASCADE;

CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'organization_owner','admin','operations_manager','dispatcher',
    'fleet_manager','accountant','maintenance_manager','hr_manager',
    'driver','customer','viewer'
  )),
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ DEFAULT NOW(),
  send_count INTEGER NOT NULL DEFAULT 1,
  branch_ids UUID[] DEFAULT '{}',
  has_all_branch_access BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STEP 2: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_org_invitations_org
  ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email
  ON public.organization_invitations(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token
  ON public.organization_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_org_invitations_status
  ON public.organization_invitations(organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_active_email
  ON public.organization_invitations(organization_id, email)
  WHERE status = 'pending';

-- ============================================================
-- STEP 3: RLS
-- ============================================================
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Members can view invitations for their org
CREATE POLICY "invitations_select" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

-- Only owners/admins can create invitations
CREATE POLICY "invitations_insert" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_organization_role(organization_id, ARRAY['organization_owner','admin'])
  );

-- Only owners/admins can update (revoke, mark accepted)
CREATE POLICY "invitations_update" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['organization_owner','admin']))
  WITH CHECK (public.has_organization_role(organization_id, ARRAY['organization_owner','admin']));

-- Only owners can delete
CREATE POLICY "invitations_delete" ON public.organization_invitations
  FOR DELETE TO authenticated
  USING (public.has_organization_role(organization_id, ARRAY['organization_owner']));

-- ============================================================
-- STEP 4: RPC — accept_organization_invite
-- Called by the accepting user (authenticated). Validates token hash,
-- creates membership, updates invitation status.
-- ============================================================
CREATE OR REPLACE FUNCTION public.accept_organization_invite(
  p_token_hash TEXT
) RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_existing_member UUID;
  v_new_member_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find invitation by token hash
  SELECT * INTO v_invite
  FROM public.organization_invitations
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invitation token');
  END IF;

  -- Check status
  IF v_invite.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Invitation is no longer active (status: ' || v_invite.status || ')');
  END IF;

  -- Check expiry
  IF v_invite.expires_at < NOW() THEN
    UPDATE public.organization_invitations SET status = 'expired', updated_at = NOW() WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  -- Check email matches
  IF (SELECT email FROM auth.users WHERE id = v_user_id) != v_invite.email THEN
    RETURN json_build_object('success', false, 'error', 'This invitation was sent to a different email address');
  END IF;

  -- Check organization is active
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_invite.organization_id AND status = 'active') THEN
    RETURN json_build_object('success', false, 'error', 'Organization is not active');
  END IF;

  -- Check not already a member
  SELECT id INTO v_existing_member
  FROM public.organization_members
  WHERE organization_id = v_invite.organization_id AND user_id = v_user_id AND status = 'active';

  IF v_existing_member IS NOT NULL THEN
    -- Already a member — mark invitation as accepted
    UPDATE public.organization_invitations
    SET status = 'accepted', accepted_by = v_user_id, accepted_at = NOW(), updated_at = NOW()
    WHERE id = v_invite.id;
    RETURN json_build_object('success', true, 'message', 'Already a member of this organization', 'already_member', true);
  END IF;

  -- Create membership
  INSERT INTO public.organization_members (
    organization_id, user_id, role, status, has_all_branch_access
  ) VALUES (
    v_invite.organization_id, v_user_id, v_invite.role, 'active',
    v_invite.has_all_branch_access OR v_invite.role IN ('organization_owner', 'admin')
  ) RETURNING id INTO v_new_member_id;

  -- Grant branch access if specified
  IF array_length(v_invite.branch_ids, 1) > 0 THEN
    INSERT INTO public.organization_member_branches (organization_id, member_id, branch_id)
    SELECT v_invite.organization_id, v_new_member_id, unnest(v_invite.branch_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = NOW(), updated_at = NOW()
  WHERE id = v_invite.id;

  -- Audit log
  INSERT INTO public.activity_log (organization_id, user_id, action, entity_type, entity_id, details, metadata)
  VALUES (
    v_invite.organization_id, v_user_id::text, 'invitation_accepted', 'organization_member', v_new_member_id::text,
    'User accepted invitation and joined as ' || v_invite.role,
    jsonb_build_object('invitation_id', v_invite.id, 'role', v_invite.role, 'invited_by', v_invite.invited_by)
  );

  RETURN json_build_object(
    'success', true,
    'member_id', v_new_member_id,
    'organization_id', v_invite.organization_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.accept_organization_invite(TEXT) TO authenticated;

-- ============================================================
-- STEP 5: Comments
-- ============================================================
COMMENT ON TABLE public.organization_invitations IS
  'Stores organization membership invitations. Token stored as SHA-256 hash only.';
COMMENT ON COLUMN public.organization_invitations.token_hash IS
  'SHA-256 hash of the invitation token. Raw token is never stored.';
COMMENT ON COLUMN public.organization_invitations.branch_ids IS
  'Branch UUIDs to grant access to upon acceptance. Empty = use org defaults.';
COMMENT ON FUNCTION public.accept_organization_invite IS
  'Accepts an invitation by token hash. Creates membership, grants branch access, writes audit.';

-- ============================================================
-- DONE — Migration 011
-- ============================================================
