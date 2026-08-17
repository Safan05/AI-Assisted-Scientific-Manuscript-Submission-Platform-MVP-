// src/components/manuscripts/status-badge.tsx
// The signature component — monospace, bracketed, all-caps status codes
// Used verbatim across Modules 5, 6, 7, 8.

import { cn } from "@/lib/utils";
import { STATUS_CODES } from "@/lib/types";
import type { ManuscriptStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: ManuscriptStatus;
  className?: string;
}

// Statuses that require user action → signal red
const ACTIVE_STATUSES: ManuscriptStatus[] = ["DRAFT", "PARSED"];

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const code = STATUS_CODES[status] ?? "??";
  const isActive = ACTIVE_STATUSES.includes(status);

  return (
    <span
      className={cn(
        "status-badge",
        isActive
          ? "text-[#D0021B]"
          : "text-[#707070]",
        className
      )}
      aria-label={`Status: ${status}`}
    >
      [ <span className="font-mono">{code}</span> · <span className="font-mono">{status}</span> ]
    </span>
  );
}

export default StatusBadge;
