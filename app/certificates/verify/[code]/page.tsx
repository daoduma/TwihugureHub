// app/certificates/verify/[code]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Award, CheckCircle, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface VerifyResult {
  valid: boolean;
  farmerName?: string;
  courseTitle?: Record<string, string>;
  issuedAt?: string;
  certificateCode?: string;
  error?: string;
}

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const codeFromUrl = (params.code as string) ?? "";

  const [code, setCode] = useState(codeFromUrl);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (codeFromUrl && codeFromUrl !== "verify") {
      handleVerify(codeFromUrl);
    }
  }, []); // eslint-disable-line

  async function handleVerify(verifyCode: string) {
    if (!verifyCode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(verifyCode.trim())}/verify`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: "Verification failed. Please try again." });
    }
    setLoading(false);
  }

  function getCourseTitle(title?: Record<string, string>) {
    if (!title) return "";
    return title["en"] ?? Object.values(title)[0] ?? "";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 shadow">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white">
            <path
              d="M12 2C8.5 2 6 5 6 8c0 2.5 1.5 4.5 4 6l2 1.5L14 14c2.5-1.5 4-3.5 4-6 0-3-2.5-6-6-6z"
              fill="currentColor" opacity="0.9"
            />
            <path d="M12 15.5V22M9 22h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-lg font-bold text-brand-900">TwihugureHub</span>
      </Link>

      <div className="w-full max-w-md">
        {/* Title */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Award size={28} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Verify Certificate</h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter a certificate code to verify its authenticity
          </p>
        </div>

        {/* Search box */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Certificate Code
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleVerify(code)}
              placeholder="TH-XXXX-XXXX-XXXX"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              onClick={() => handleVerify(code)}
              disabled={loading || !code.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50 transition-colors"
            >
              <Search size={14} />
              Verify
            </button>
          </div>
        </div>

        {/* Result */}
        {loading && (
          <div className="rounded-xl border border-gray-100 bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            Verifying certificate…
          </div>
        )}

        {result && (
          <div
            className={`rounded-xl border p-6 shadow-sm ${
              result.valid
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            {result.valid ? (
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-600" />
                  <span className="font-semibold text-green-800">Certificate is Valid</span>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Farmer</dt>
                    <dd className="font-medium text-gray-800">{result.farmerName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Course</dt>
                    <dd className="font-medium text-gray-800 text-right max-w-[60%]">
                      {getCourseTitle(result.courseTitle)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Issued</dt>
                    <dd className="font-medium text-gray-800">
                      {result.issuedAt ? format(new Date(result.issuedAt), "PPP") : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Code</dt>
                    <dd className="font-mono text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">
                      {result.certificateCode}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-red-500" />
                <div>
                  <p className="font-semibold text-red-700">Certificate Not Found</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    The code you entered does not match any certificate in our system.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
