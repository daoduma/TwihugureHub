"use client";
// app/(dashboard)/mbaza/reports/page.tsx

import { useState, useEffect } from "react";

type ReportType = "completion" | "performance" | "engagement" | "intervention";

interface ReportData {
  title: string;
  generatedAt: string;
  summary: Record<string, string | number>;
  columns: string[];
  rows: Record<string, string | number | boolean | null>[];
  filters: Record<string, string | undefined>;
}

interface Group { id: string; name: string; }
interface Course { id: string; title: Record<string, string>; }

const REPORT_TYPES: { value: ReportType; label: string; description: string; icon: string }[] = [
  { value: "completion", label: "Completion Report", description: "Completion rates per course, group, date range", icon: "✅" },
  { value: "performance", label: "Performance Report", description: "Quiz scores, pass rates, score distributions", icon: "📊" },
  { value: "engagement", label: "Engagement Report", description: "Lessons viewed, time on platform", icon: "⚡" },
  { value: "intervention", label: "Intervention Report", description: "Flag counts, types, resolution rates", icon: "🚩" },
];

function fmt(col: string) {
  return col.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
}


export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("completion");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [language, setLanguage] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "xlsx" | null>(null);

  useEffect(() => {
    fetch("/api/mbaza/groups").then(r => r.json()).then(d => setGroups(d.groups ?? []));
    fetch("/api/admin/approvals").then(r => r.json()).then(d => setCourses(d.courses ?? []));
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams({ type: reportType });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (groupId) p.set("groupId", groupId);
    if (courseId) p.set("courseId", courseId);
    if (language) p.set("language", language);
    return p;
  };

  const handleGenerate = async () => {
    setLoading(true);
    const res = await fetch(`/api/mbaza/reports/data?${buildParams()}`);
    const data = await res.json();
    setReportData(data);
    setLoading(false);
  };

  const handleExport = async (format: "pdf" | "xlsx") => {
    setExporting(format);
    const url = `/api/mbaza/reports/export/${format}?${buildParams()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setExporting(null), 2000);
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Report Builder 📋
        </h1>
        <p className="text-sm text-gray-500 mt-1">Generate, preview, and export platform reports.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* LEFT: Builder */}
        <div className="lg:col-span-1 space-y-4">
          {/* Report Type */}
          <div className="card p-4 space-y-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Report Type</h2>
            {REPORT_TYPES.map(rt => (
              <button
                key={rt.value}
                onClick={() => { setReportType(rt.value); setReportData(null); }}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  reportType === rt.value
                    ? "border-brand-400 bg-brand-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{rt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{rt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rt.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="card p-4 space-y-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Filters</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" className="input w-full" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" className="input w-full" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Group</label>
              <select className="input w-full" value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">All Groups</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {(reportType === "completion" || reportType === "performance") && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
                <select className="input w-full" value={courseId} onChange={e => setCourseId(e.target.value)}>
                  <option value="">All Courses</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {(c.title as Record<string, string>).en ?? "Untitled"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {reportType === "performance" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quiz Language</label>
                <select className="input w-full" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="">All Languages</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="rw">Ikinyarwanda</option>
                </select>
              </div>
            )}
            <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full">
              {loading ? "Generating…" : "Generate Report"}
            </button>
          </div>
        </div>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-3 space-y-4">
          {!reportData && !loading && (
            <div className="card p-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium text-gray-500">Select a report type and click Generate</p>
            </div>
          )}

          {loading && (
            <div className="card p-16 text-center text-gray-400">
              <p className="text-3xl mb-2">⏳</p>
              <p>Building report…</p>
            </div>
          )}

          {reportData && (
            <>
              {/* Report Header */}
              <div className="card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{reportData.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Generated {new Date(reportData.generatedAt).toLocaleString()}
                      {reportData.rows.length > 0 && ` · ${reportData.rows.length} rows`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport("xlsx")}
                      disabled={exporting === "xlsx"}
                      className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                    >
                      {exporting === "xlsx" ? "Exporting…" : "⬇ Excel"}
                    </button>
                    <button
                      onClick={() => handleExport("pdf")}
                      disabled={exporting === "pdf"}
                      className="btn-secondary text-sm py-2 px-3 whitespace-nowrap"
                    >
                      {exporting === "pdf" ? "Exporting…" : "⬇ PDF"}
                    </button>
                  </div>
                </div>

                {/* Summary Stats */}
                {Object.keys(reportData.summary).length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(reportData.summary).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-gray-50 p-3">
                        <p className="text-lg font-bold text-brand-700">{String(v)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{fmt(k)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Data Table */}
              {reportData.rows.length > 0 ? (
                <div className="card overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {reportData.columns.map(col => (
                          <th key={col} className="px-3 py-3 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {fmt(col)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.rows.slice(0, 100).map((row, i) => (
                        <tr key={i} className={`border-b border-gray-50 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                          {reportData.columns.map(col => (
                            <td key={col} className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                              {row[col] === null || row[col] === undefined ? (
                                <span className="text-gray-300">—</span>
                              ) : String(row[col]) === "Yes" ? (
                                <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">Yes</span>
                              ) : String(row[col]) === "No" ? (
                                <span className="rounded-full bg-gray-100 text-gray-500 px-2 py-0.5 text-[10px] font-bold">No</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reportData.rows.length > 100 && (
                    <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
                      Showing 100 of {reportData.rows.length} rows. Export to see all data.
                    </p>
                  )}
                </div>
              ) : (
                <div className="card p-10 text-center text-gray-400">
                  <p>No data found for the selected filters.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
