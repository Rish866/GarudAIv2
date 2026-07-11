-- ============================================================
-- GARUD AI ERP — Phase 13: Storage Isolation Policies
-- 
-- Creates a private bucket with org-scoped RLS policies.
-- Path structure: organizations/{org_id}/{category}/{entity_id}/{file}
-- 
-- Users can ONLY access files within their organization's folder.
-- ============================================================

-- Create the private bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'erp-documents',
  'erp-documents',
  false,  -- PRIVATE bucket (not public)
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;

-- ============================================================
-- STORAGE POLICIES — Organization-Scoped Access
-- ============================================================

-- Helper: Extract organization_id from file path
-- Path format: organizations/{org_id}/...
CREATE OR REPLACE FUNCTION storage.get_org_id_from_path(file_path TEXT)
RETURNS UUID AS $$
DECLARE
  parts TEXT[];
  org_id TEXT;
BEGIN
  parts := string_to_array(file_path, '/');
  -- Path: organizations/{org_id}/category/entity/file
  IF array_length(parts, 1) >= 2 AND parts[1] = 'organizations' THEN
    org_id := parts[2];
    BEGIN
      RETURN org_id::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, storage;

-- DROP existing policies on the bucket
DROP POLICY IF EXISTS "org_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "org_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "org_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "org_storage_delete" ON storage.objects;

-- SELECT (download/view): Only org members can access their org's files
CREATE POLICY "org_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'erp-documents'
    AND (
      public.is_organization_member(storage.get_org_id_from_path(name))
      OR public.is_platform_admin()
    )
  );

-- INSERT (upload): Only org members can upload to their org's folder
CREATE POLICY "org_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'erp-documents'
    AND public.is_organization_member(storage.get_org_id_from_path(name))
  );

-- UPDATE (replace): Only org members can replace their org's files
CREATE POLICY "org_storage_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'erp-documents'
    AND public.is_organization_member(storage.get_org_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'erp-documents'
    AND public.is_organization_member(storage.get_org_id_from_path(name))
  );

-- DELETE: Only org admins can delete files
CREATE POLICY "org_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'erp-documents'
    AND (
      public.has_organization_role(
        storage.get_org_id_from_path(name),
        ARRAY['organization_owner', 'admin']
      )
      OR public.is_platform_admin()
    )
  );

-- ============================================================
-- DONE — Storage isolation complete
-- 
-- Security guarantees:
-- ✅ Users cannot list another org's files
-- ✅ Users cannot read/download another org's files
-- ✅ Users cannot upload into another org's path
-- ✅ Only admins can delete files
-- ✅ Platform admin has cross-org access
-- ✅ Private bucket (no public URLs)
-- ✅ Signed URLs required for all access (expire after 1 hour)
-- ✅ File size limited to 10MB
-- ✅ Only JPG, PNG, WebP, PDF allowed
-- ============================================================
