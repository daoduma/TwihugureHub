"use client";
// app/(dashboard)/mbaza/dashboard/Charts.tsx

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

interface Props {
  courseChartData: { name: string; completionRate: number; enrolled: number }[];
  lineChartData: { week: string; attempts: number }[];
}

export default function MbazaDashboardCharts({ courseChartData, lineChartData }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Bar Chart: Completion rates per course */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Completion Rate by Course</h2>
        {courseChartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No published courses yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={courseChartData} margin={{ top: 0, right: 8, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
              <Tooltip
                formatter={(v: number) => [`${v}%`, "Completion Rate"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="completionRate" fill="#2d6a4f" radius={[4, 4, 0, 0]} name="Completion %" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Line Chart: Weekly quiz attempts */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Weekly Quiz Attempts (7 Weeks)</h2>
        {lineChartData.every((d) => d.attempts === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">No quiz activity in the last 7 weeks</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineChartData} margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="attempts"
                stroke="#52b788"
                strokeWidth={2}
                dot={{ r: 4, fill: "#52b788" }}
                name="Quiz Attempts"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
