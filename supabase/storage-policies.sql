-- ============================================================
-- STORAGE BUCKET SECURITY POLICIES
-- ============================================================
-- Run this after creating the 'erp-documents' bucket.
--
-- File path convention:
--   organizations/{org_id}/{category}/{entity_id}/{filename}
--
-- SECURITY:
-- - Users can only access files under their organization's path
-- - No public access to any files
-- - Signed URLs are used for all downloads (expire in 1 hour)
-- ============================================================

-- Create the bucket (private by default)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'erp-documents',
  'erp-documents',
  false,  -- PRIVATE: no public access
  10485760,  -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- SELECT (download): User can only access files in their org folder
CREATE POLICY "org_storage_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'erp-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2] = get_user_organization_id()::text
  );

-- INSERT (upload): User can only upload to their org folder
CREATE POLICY "org_storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'erp-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2] = get_user_organization_id()::text
  );

-- UPDATE (replace): User can only replace files in their org folder
CREATE POLICY "org_storage_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'erp-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2] = get_user_organization_id()::text
  );

-- DELETE: User can only delete files in their org folder
CREATE POLICY "org_storage_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'erp-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'organizations'
    AND (storage.foldername(name))[2] = get_user_organization_id()::text
  );

-- ============================================================
-- DONE: Storage is secured.
-- Files are isolated per organization.
-- No file is publicly accessible.
-- ============================================================
