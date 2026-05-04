// app/api/upload/route.ts
// Stores uploads as base64 data URLs so this works on Vercel (no writable filesystem).
// For production scale, swap the base64 storage for an S3/R2/Cloudinary client here.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

// Max sizes per type (in bytes)
const MAX_SIZES: Record<string, number> = {
  image: 10 * 1024 * 1024,     // 10 MB
  thumbnail: 5 * 1024 * 1024,  // 5 MB
  audio: 50 * 1024 * 1024,     // 50 MB
  attachment: 20 * 1024 * 1024, // 20 MB
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  // Allow both TRAINER and ADMIN to upload
  if (!session?.user || !["TRAINER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Normalize the MIME type (browsers sometimes send "image/jpg" instead of "image/jpeg")
    const mimeType = file.type || "application/octet-stream";
    const allowedMimes = ALLOWED_TYPES[type] ?? ALLOWED_TYPES.image;

    if (!allowedMimes.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `File type "${mimeType}" is not allowed for "${type}". Allowed: ${allowedMimes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const maxSize = MAX_SIZES[type] ?? MAX_SIZES.image;
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      return NextResponse.json(
        { success: false, error: `File too large. Maximum size for ${type} is ${maxMB} MB.` },
        { status: 400 }
      );
    }

    // Convert to base64 data URL — works on any serverless platform
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: { url: dataUrl, fileName: file.name, fileType: mimeType },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
