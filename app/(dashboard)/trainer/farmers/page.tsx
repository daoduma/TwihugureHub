"use client";
// app/(dashboard)/trainer/farmers/page.tsx

import { useState, useEffect, useCallback } from "react";
import { Search, Users, Award } from "lucide-react";
import { useTranslation } from "@/lib/useTranslation";

interface FarmerRow {
  id: string;
  name: string;
  email: string;
  preferredLanguage: string;
  enrollCount: number;
  completed: number;
  avgProgress: number;
  avgScore: number | null;
  lastActive: string | null;
  courses: string[];
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-gray-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500">{value}%</span>
    </div>
  );
}

export default function TrainerFarmersPage() {
  const { t } = useTranslation();
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 20;

  const fetchFarmers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    const res  = await fetch(`/api/trainer/farmers?${params}`);
    const data = await res.json();
    setFarmers(data.farmers ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { fetchFarmers(); }, [fetchFarmers]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
            {t("trainer.farmers.title")}
          </h1>
          <p className="text-sm text-gray-500">
            {total !== 1 ? t("trainer.farmers.subtitlePlural").replace("{count}", String(total)) : t("trainer.farmers.subtitle").replace("{count}", String(total))}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            <Users size={13} className="text-brand-500" />
            <span>{total} {t("trainer.farmers.enrolled")}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm">
            <Award size={13} className="text-amber-500" />
            <span>{farmers.filter((f) => f.completed > 0).length} {t("trainer.farmers.withCompletions")}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder={t("trainer.farmers.searchPlaceholder")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {[t("trainer.farmers.colFarmer"), t("trainer.farmers.colLanguage"), t("trainer.farmers.colEnrolled"), t("trainer.farmers.colAvgProgress"), t("trainer.farmers.colCompleted"), t("trainer.farmers.colQuizScore"), t("trainer.farmers.colLastActive")].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-gray-100 animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!loading && farmers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <Users size={32} className="mx-auto mb-2 text-gray-200" />
                  <p className="text-sm text-gray-400">
                    {search ? t("trainer.farmers.noResults") : t("trainer.farmers.noFarmers")}
                  </p>
                </td>
              </tr>
            )}
            {!loading && farmers.map((f) => (
              <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.email}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
                    {f.preferredLanguage}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  <div className="flex flex-wrap gap-1">
                    {f.courses.slice(0, 2).map((c) => (
                      <span key={c} className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700 truncate max-w-[140px]" title={c}>
                        {c}
                      </span>
                    ))}
                    {f.courses.length > 2 && (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">+{f.courses.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ProgressBar value={f.avgProgress} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold ${f.completed > 0 ? "text-green-600" : "text-gray-400"}`}>
                    {f.completed}/{f.enrollCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">
                  {f.avgScore !== null ? `${f.avgScore}%` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {f.lastActive ? new Date(f.lastActive).toLocaleDateString() : t("trainer.farmers.never")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
