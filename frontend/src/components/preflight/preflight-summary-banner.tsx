"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
import type { PreflightResult } from "@/lib/types";

interface PreflightSummaryBannerProps {
  result: PreflightResult;
}

export function PreflightSummaryBanner({ result }: PreflightSummaryBannerProps) {
  const counts = result.summary_counts || { PASS: 0, WARN: 0, FAIL: 0 };
  const passCount = counts.PASS || 0;
  const warnCount = counts.WARN || 0;
  const failCount = counts.FAIL || 0;

  const isConfirmed = result.human_confirmed;
  const isPassed = result.overall_status === "PASS";
  const isWarn = result.overall_status === "WARN";
  const isFail = result.overall_status === "FAIL";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-sm overflow-hidden relative">
      {/* Background Subtle Accent */}
      <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-secondary/30 to-transparent pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Compliance Evaluation
            </span>
            <span className="text-muted-foreground/40">•</span>
            <span className="font-mono text-xs text-foreground font-medium">
              Target: {result.template_name || "Journal Standard"}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            {isConfirmed ? (
              <>
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                Pre-flight Checklist Confirmed
              </>
            ) : isPassed ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                All Submission Checks Passed
              </>
            ) : isWarn ? (
              <>
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                Review Recommended Warnings
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-rose-600" />
                Mandatory Issues Require Resolution
              </>
            )}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {isConfirmed
              ? "All guidelines have been verified and confirmed. You can proceed with document generation."
              : isPassed
              ? "Your manuscript metadata meets all required formatting rules and constraints for this journal."
              : isWarn
              ? "Some items deviate from optimal guidelines. You may review or acknowledge them before proceeding."
              : "Critical requirements are missing or exceed journal constraints. Please resolve failing items to continue."}
          </p>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <div className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {passCount}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Passed
            </span>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <span className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400">
              {warnCount}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Warnings
            </span>
          </div>

          <div className="flex flex-col items-center justify-center min-w-[76px] py-2 px-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <span className="text-xl font-bold font-mono text-rose-700 dark:text-rose-400">
              {failCount}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Failing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
