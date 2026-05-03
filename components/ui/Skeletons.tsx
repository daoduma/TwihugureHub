// components/ui/Skeletons.tsx
// NEW: Reusable loading skeleton components for all major content types
"use client";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

/** Skeleton for a course card */
export function CourseCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <SkeletonBlock className="w-full h-40" />
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-5 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <div className="flex items-center gap-3 pt-2">
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for lesson viewer */
export function LessonViewerSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <SkeletonBlock className="h-8 w-2/3" />
      <SkeletonBlock className="h-4 w-1/3" />
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-3/4" />
      </div>
      <SkeletonBlock className="h-48 w-full rounded-lg" />
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
      </div>
    </div>
  );
}

/** Skeleton for quiz */
export function QuizSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <SkeletonBlock className="h-7 w-1/2" />
      <SkeletonBlock className="h-3 w-1/3" />
      <div className="bg-white rounded-xl p-6 space-y-5 border">
        <SkeletonBlock className="h-5 w-full" />
        <SkeletonBlock className="h-5 w-4/5" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBlock className="h-5 w-5 rounded-full flex-shrink-0" />
              <SkeletonBlock className="h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-10 w-full rounded-lg" />
    </div>
  );
}

/** Skeleton for farmer table */
export function FarmerTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b">
        <SkeletonBlock className="h-5 w-1/4" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <SkeletonBlock className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-1/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
            <SkeletonBlock className="h-6 w-16 rounded-full" />
            <SkeletonBlock className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for dashboard KPI cards */
export function DashboardKPISkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 border space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-8 rounded-lg" />
          </div>
          <SkeletonBlock className="h-8 w-1/2" />
          <SkeletonBlock className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
