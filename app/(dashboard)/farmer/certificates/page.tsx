// app/(dashboard)/farmer/certificates/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Award, Download, ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";
import { format } from "date-fns";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";

interface Certificate {
  id: string;
  certificateCode: string;
  issuedAt: string;
  course: {
    id: string;
    title: Record<string, string>;
  };
}


// CHANGED: Added page title for browser <title> tags
export const metadata = { title: "My Certificates" };

export default function FarmerCertificatesPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language ?? "en") as "en" | "fr" | "rw";

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/farmer/certificates")
      .then((r) => r.json())
      .then((d) => setCertificates(d.certificates ?? []))
      .finally(() => setLoading(false));
  }, []);

  function getCourseTitle(title: Record<string, string>) {
    return title[lang] ?? title["en"] ?? "Course";
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Award size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t("certificates.myTitle")}</h1>
            <p className="text-xs text-gray-400">{t("certificates.mySubtitle")}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-100 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
            {t("common.loading")}
          </div>
        ) : certificates.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white py-16 text-center shadow-sm">
            <Award size={48} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium text-gray-600">{t("certificates.noneYet")}</p>
            <p className="mt-1 text-xs text-gray-400">{t("certificates.noneYetHint")}</p>
            <Link
              href="/farmer/courses"
              className="mt-4 inline-block rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 transition-colors"
            >
              {t("certificates.browseCourses")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="group relative overflow-hidden rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50 to-green-50 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Decorative corner */}
                <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-100/60 group-hover:bg-amber-100 transition-colors" />
                <div className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-amber-200/80" />

                <div className="relative">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                      <Award size={18} className="text-amber-600" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-gray-400 bg-white/70 rounded px-1.5 py-0.5">
                      {cert.certificateCode}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-1">
                    {getCourseTitle(cert.course.title)}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    {t("certificates.issuedOn")} {format(new Date(cert.issuedAt), "PPP")}
                  </p>

                  <div className="flex gap-2">
                    <a
                      href={`/api/farmer/certificates/${cert.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors"
                    >
                      <Download size={12} />
                      {t("certificates.download")}
                    </a>
                    <Link
                      href={`/certificates/verify/${cert.certificateCode}`}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <ExternalLink size={12} />
                      {t("certificates.verify")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
