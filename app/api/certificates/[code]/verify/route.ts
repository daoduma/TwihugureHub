// app/api/certificates/[code]/verify/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const certificate = await db.certificate.findUnique({
    where: { certificateCode: params.code },
    include: {
      farmer: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ valid: false, error: "Certificate not found" }, { status: 404 });
  }

  // Mask farmer name: "John Doe" → "John D."
  const nameParts = certificate.farmer.name.trim().split(" ");
  const maskedName =
    nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
      : nameParts[0];

  return NextResponse.json({
    valid: true,
    farmerName: maskedName,
    courseTitle: certificate.course.title,
    issuedAt: certificate.issuedAt,
    certificateCode: certificate.certificateCode,
  });
}
