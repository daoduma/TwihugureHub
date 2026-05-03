// lib/certificates.ts
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

function generateCertificateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TH-";
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 8) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Attempt to issue a certificate for an enrollment if all conditions are met.
 * Called after progress reaches 100%.
 */
export async function maybeIssueCertificate(enrollmentId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      farmer: true,
      course: true,
    },
  });

  if (!enrollment) return null;
  if (enrollment.progressPercent < 100) return null;

  // Check if certificate already exists
  const existing = await db.certificate.findFirst({
    where: { enrollmentId },
  });
  if (existing) return existing;

  // Generate unique code
  let code = generateCertificateCode();
  // Ensure uniqueness (retry on collision)
  let tries = 0;
  while (tries < 5) {
    const collision = await db.certificate.findUnique({ where: { certificateCode: code } });
    if (!collision) break;
    code = generateCertificateCode();
    tries++;
  }

  const certificate = await db.certificate.create({
    data: {
      farmerId: enrollment.farmerId,
      courseId: enrollment.courseId,
      enrollmentId,
      certificateCode: code,
    },
  });

  // Send QUIZ_PASSED notification to farmer
  await createNotification(
    enrollment.farmerId,
    "QUIZ_PASSED",
    undefined,
    undefined,
    { type: "certificate", id: certificate.id }
  );

  return certificate;
}
