// lib/supabaseStorage.ts
// Supabase Storage client for file uploads.
// All uploads go into the bucket defined by SUPABASE_STORAGE_BUCKET (default: "uploads").
// Files are stored at: {type}/{timestamp}-{randomId}-{originalName}
// and the returned URL is the public URL served by Supabase CDN.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

// Use the service role key server-side so we bypass RLS on the storage bucket.
// This client must never be exposed to the browser.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Upload a file buffer to Supabase Storage.
 *
 * @param buffer   Raw file bytes
 * @param mimeType MIME type, e.g. "image/jpeg"
 * @param type     Upload category: "image" | "audio" | "attachment" | "thumbnail"
 * @param fileName Original file name (used as the suffix for readability)
 * @returns        Public URL of the uploaded file
 */
export async function uploadToSupabase(
  buffer: Buffer,
  mimeType: string,
  type: string,
  fileName: string
): Promise<string> {
  // Build a unique, collision-free path: uploads/image/1714000000000-abc12-photo.jpg
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2, 7);
  // Sanitise the original filename — strip spaces and special chars
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${type}/${timestamp}-${randomId}-${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage given its full public URL.
 * Safe to call even if the file no longer exists.
 */
export async function deleteFromSupabase(publicUrl: string): Promise<void> {
  // Extract the storage path from the public URL.
  // Public URLs look like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const marker = `/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return; // not a Supabase Storage URL — skip silently

  const storagePath = publicUrl.slice(idx + marker.length);

  const { error } = await supabase.storage.from(bucket).remove([storagePath]);
  if (error) {
    console.error("Supabase Storage delete failed:", error.message);
  }
}
