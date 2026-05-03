// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"],
  attachment: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
  thumbnail: ["image/jpeg", "image/png", "image/webp"],
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "TRAINER") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string) || "image";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const allowedMimes = ALLOWED_TYPES[type] || ALLOWED_TYPES.image;
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type ${file.type} not allowed for ${type}` },
        { status: 400 }
      );
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: "File too large (max 50MB)" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${uuidv4()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", type);

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, fileName), buffer);

    const url = `/uploads/${type}/${fileName}`;
    return NextResponse.json({
      success: true,
      data: { url, fileName: file.name, fileType: file.type },
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
