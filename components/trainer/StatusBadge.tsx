// components/trainer/StatusBadge.tsx
"use client";

import { CourseStatus } from "@/types";
import { useTranslation } from "@/lib/useTranslation";

const statusConfig: Record<CourseStatus, { bg: string; text: string; dot: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
  PENDING_APPROVAL: { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
  PUBLISHED: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  ARCHIVED: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-400" },
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  const { t } = useTranslation();
  const cfg = statusConfig[status];
  const label = t(`trainer.status.${status.toLowerCase()}` as never, {
    defaultValue: status.replace("_", " "),
  });

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {label}
    </span>
  );
}
