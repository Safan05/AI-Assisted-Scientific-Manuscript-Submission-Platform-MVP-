// src/components/manuscripts/status-badge.tsx
// Clean, user-friendly status badge component with warm typography

import { cn } from "@/lib/utils";
import type { ManuscriptStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ManuscriptStatus;
  className?: string;
}

const FRIENDLY_STATUS: Record<ManuscriptStatus, { label: string; tone: "accent" | "neutral" | "success" }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PARSED: { label: "Ready to Edit", tone: "accent" },
  EDITED: { label: "Metadata Saved", tone: "neutral" },
  TARGET_SELECTED: { label: "Journal Selected", tone: "accent" },
  CHECKLIST_PASSED: { label: "Checks Passed", tone: "success" },
  EXPORTED: { label: "Exported", tone: "success" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const item = FRIENDLY_STATUS[status] || { label: status, tone: "neutral" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors",
        item.tone === "accent"
          ? "bg-[#141413] text-[#ffffff] border-[#141413]"
          : item.tone === "success"
          ? "bg-[#f0f7f2] text-[#1b6b37] border-[#d2ead9]"
          : "bg-[#f3f1ea] text-[#6e6d68] border-[#e6e4dc]",
        className
      )}
      aria-label={`Status: ${item.label}`}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          item.tone === "accent"
            ? "bg-[#ffffff]"
            : item.tone === "success"
            ? "bg-[#1b6b37]"
            : "bg-[#8c8b85]"
        )}
      />
      <span>{item.label}</span>
    </span>
  );
}

export default StatusBadge;
