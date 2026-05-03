// app/api/farmer/certificates/[id]/pdf/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificatePDF } from "@/components/certificates/CertificatePDF";
import React from "react";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificate = await db.certificate.findFirst({
    where: { id: params.id, farmerId: session.user.id },
    include: {
      farmer: { select: { name: true, preferredLanguage: true } },
      course: { select: { title: true } },
    },
  });

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const lang = certificate.farmer.preferredLanguage as "en" | "fr" | "rw";
  const courseTitle =
    (certificate.course.title as Record<string, string>)[lang] ||
    (certificate.course.title as Record<string, string>)["en"] ||
    "Course";

  const pdfBuffer = await renderToBuffer(
    React.createElement(CertificatePDF, {
      farmerName: certificate.farmer.name,
      courseTitle,
      issuedAt: certificate.issuedAt,
      certificateCode: certificate.certificateCode,
      language: lang,
    })
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificate-${certificate.certificateCode}.pdf"`,
    },
  });
}
