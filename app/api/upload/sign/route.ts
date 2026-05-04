// app/api/upload/sign/route.ts
// Returns a Supabase Storage signed upload URL so the browser can PUT the file
// directly to Supabase — completely bypassing Vercel's 4.5 MB body-size cap.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

// Service-role client — never exposed to the browser
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ALLOWED_TYPES: Record<string, string[]> = {
  image: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
  ],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/mp4"],
  attachment: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
  thumbnail: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/svg+xml",
  ],
};

// Max sizes per type (bytes)
const MAX_SIZES: Record<string, number> = {
  image:      10 * 1024 * 1024,  // 10 MB
  thumbnail:   5 * 1024 * 1024,  //  5 MB
  audio:      50 * 1024 * 1024,  // 50 MB
  attachment: 20 * 1024 * 1024,  // 20 MB
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { fileName?: string; fileType?: string; fileSize?: number; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  const { fileName, fileType, fileSize, type = "image" } = body;

  if (!fileName || !fileType || fileSize == null) {
    return NextResponse.json(
      { success: false, error: "fileName, fileType, and fileSize are required" },
      { status: 400 }
    );
  }

  // Validate MIME type
  const allowedMimes = ALLOWED_TYPES[type] ?? ALLOWED_TYPES.image;
  if (!allowedMimes.includes(fileType)) {
    return NextResponse.json(
      {
        success: false,
        error: `File type "${fileType}" is not allowed for "${type}". Allowed: ${allowedMimes.join(", ")}`,
      },
      { status: 400 }
    );
  }

  // Validate file size
  const maxSize = MAX_SIZES[type] ?? MAX_SIZES.image;
  if (fileSize > maxSize) {
    const maxMB = Math.round(maxSize / 1024 / 1024);
    return NextResponse.json(
      { success: false, error: `File too large. Maximum size for ${type} is ${maxMB} MB.` },
      { status: 400 }
    );
  }

  // Build a unique, collision-free storage path
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).slice(2, 7);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${type}/${timestamp}-${randomId}-${safeName}`;

  // Ask Supabase for a signed upload URL (valid for 60 s)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error("Supabase signed URL error:", error);
    return NextResponse.json(
      { success: false, error: "Could not create upload URL. Please try again." },
      { status: 500 }
    );
  }

  // Derive the public CDN URL — same format as uploadToSupabase()
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;

  return NextResponse.json({
    success: true,
    data: {
      signedUrl: data.signedUrl,
      path: storagePath,
      publicUrl,
    },
  });
}
