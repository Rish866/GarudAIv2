// Organization-Scoped Storage Service
//
// All file uploads MUST use org-scoped paths:
//   organizations/{org_id}/vehicles/{vehicle_id}/rc/file.pdf
//   organizations/{org_id}/drivers/{driver_id}/license/file.pdf
//   organizations/{org_id}/trips/{trip_id}/pod/file.jpg
//   organizations/{org_id}/invoices/{invoice_id}/attachment.pdf
//
// SECURITY:
// - Users cannot list/read/upload/delete files outside their org path
// - Supabase Storage RLS policies enforce this at bucket level
// - Never use public buckets for sensitive ERP documents

import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'erp-documents'; // Private bucket

export type DocumentCategory = 
  | 'vehicles'
  | 'drivers'
  | 'trips'
  | 'invoices'
  | 'customers'
  | 'employees'
  | 'maintenance'
  | 'general';

/**
 * Build organization-scoped storage path
 * Format: organizations/{org_id}/{category}/{entity_id}/{filename}
 */
function buildPath(
  organizationId: string,
  category: DocumentCategory,
  entityId: string,
  filename: string
): string {
  // Sanitize filename to prevent path traversal
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `organizations/${organizationId}/${category}/${entityId}/${safeFilename}`;
}

/**
 * Upload a file to organization-scoped storage
 */
export async function uploadFile(
  organizationId: string,
  category: DocumentCategory,
  entityId: string,
  file: File
): Promise<{ path: string | null; url: string | null; error: string | null }> {
  if (!organizationId) return { path: null, url: null, error: 'No organization' };

  const timestamp = Date.now();
  const filename = `${timestamp}_${file.name}`;
  const path = buildPath(organizationId, category, entityId, filename);

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { path: null, url: null, error: 'File too large (max 10MB)' };
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { path: null, url: null, error: 'File type not allowed (JPG, PNG, WebP, PDF only)' };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) return { path: null, url: null, error: error.message };

  // Generate signed URL (expires in 1 hour)
  const { data: urlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, 3600);

  return {
    path: data.path,
    url: urlData?.signedUrl || null,
    error: null,
  };
}

/**
 * Get a signed download URL for a file
 * URLs expire after specified seconds (default 1 hour)
 */
export async function getSignedUrl(
  path: string,
  expiresInSeconds: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresInSeconds);

  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

/**
 * List files in an organization's folder
 */
export async function listFiles(
  organizationId: string,
  category: DocumentCategory,
  entityId?: string
): Promise<{ files: any[]; error: string | null }> {
  if (!organizationId) return { files: [], error: 'No organization' };

  const folder = entityId
    ? `organizations/${organizationId}/${category}/${entityId}`
    : `organizations/${organizationId}/${category}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folder);

  if (error) return { files: [], error: error.message };
  return { files: data || [], error: null };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Upload POD (Proof of Delivery) for a trip
 */
export async function uploadPOD(
  organizationId: string,
  tripId: string,
  file: File
): Promise<{ path: string | null; url: string | null; error: string | null }> {
  return uploadFile(organizationId, 'trips', tripId, file);
}

/**
 * Upload vehicle document (RC, insurance, fitness, permit, PUC)
 */
export async function uploadVehicleDocument(
  organizationId: string,
  vehicleId: string,
  file: File
): Promise<{ path: string | null; url: string | null; error: string | null }> {
  return uploadFile(organizationId, 'vehicles', vehicleId, file);
}

/**
 * Upload driver document (license, aadhar, etc.)
 */
export async function uploadDriverDocument(
  organizationId: string,
  driverId: string,
  file: File
): Promise<{ path: string | null; url: string | null; error: string | null }> {
  return uploadFile(organizationId, 'drivers', driverId, file);
}
