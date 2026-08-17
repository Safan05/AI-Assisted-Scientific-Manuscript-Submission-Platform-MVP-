"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from "lucide-react";
import type { PreflightCheckItem } from "@/lib/types";

interface ChecklistItemCardProps {
  item: PreflightCheckItem;
  projectId: string;
  manuscriptId: string;
  onToggleOverride?: (itemId: string, overridden: boolean, reason?: string) => void;
  isOverriding?: boolean;
}

export function ChecklistItemCard({
  item,
  projectId,
  manuscriptId,
  onToggleOverride,
  isOverriding = false,
}: ChecklistItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [overrideNote, setOverrideNote] = useState(item.override_reason || "");

  const isPass = item.status === "PASS";
  const isWarn = item.status === "WARN";
  const isFail = item.status === "FAIL";
  const isOverridden = item.human_overridden;

  // Status configuration
  const getStatusConfig = () => {
    if (isOverridden) {
      return {
        badge: "bg-[#141413]/5 text-[#141413] border-[#141413]/20",
        icon: <ShieldCheck className="w-4 h-4 text-[#141413]" />,
        label: "Acknowledged (Overridden)",
        borderColor: "border-[#141413]/20",
      };
    }
    if (isPass) {
      return {
        badge: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
        label: "Passed",
        borderColor: "border-emerald-200/60 dark:border-emerald-900/40",
      };
    }
    if (isWarn) {
      return {
        badge: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
        label: "Warning",
        borderColor: "border-amber-300/80 dark:border-amber-800/50",
      };
    }
    return {
      badge: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
      icon: <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
      label: "Critical Issue",
      borderColor: "border-rose-300/80 dark:border-rose-800/50",
    };
  };

  const config = getStatusConfig();

  return (
    <div
      className={`scientific-box rounded-xl border ${config.borderColor} bg-card p-4 md:p-5 transition-all shadow-xs`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">{config.icon}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {item.rule_type.replace("_", " ")}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${config.badge}`}
              >
                {config.label}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground leading-snug">
              {item.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:self-start shrink-0 pt-2 sm:pt-0">
          {isFail && (
            <Link
              href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-colors"
            >
              Fix in Editor
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
          >
            {isExpanded ? (
              <>
                Details <ChevronUp className="w-3 h-3" />
              </>
            ) : (
              <>
                Details <ChevronDown className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details & Override Controls */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-border space-y-3 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-secondary/40 p-2.5 rounded-lg border border-border">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Detected Value
              </span>
              <pre className="font-mono text-foreground whitespace-pre-wrap break-all text-[11px]">
                {item.actual_value
                  ? JSON.stringify(item.actual_value, null, 2)
                  : "Not provided"}
              </pre>
            </div>

            <div className="bg-secondary/40 p-2.5 rounded-lg border border-border">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                Expected Guideline
              </span>
              <pre className="font-mono text-foreground whitespace-pre-wrap break-all text-[11px]">
                {item.expected_value
                  ? JSON.stringify(item.expected_value, null, 2)
                  : "Complies with standard"}
              </pre>
            </div>
          </div>

          {/* Human Warning Override Toggle */}
          {isWarn && onToggleOverride && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-foreground space-y-1">
                <p className="font-medium">
                  {isOverridden
                    ? "Warning has been acknowledged."
                    : "This warning will not prevent submission, but should be reviewed."}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  You can mark this item as reviewed to proceed with document export.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isOverriding}
                  onClick={() =>
                    onToggleOverride(item.id, !isOverridden, overrideNote)
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isOverridden
                      ? "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                      : "bg-[#141413] text-white hover:bg-[#141413]/90"
                  }`}
                >
                  {isOverridden ? "Revert Acknowledgment" : "Acknowledge & Accept"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
