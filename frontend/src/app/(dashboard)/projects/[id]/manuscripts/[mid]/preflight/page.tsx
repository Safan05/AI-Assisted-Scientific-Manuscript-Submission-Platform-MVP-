"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  FileEdit,
  Building2,
  CheckSquare,
  Square,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { useManuscript } from "@/hooks/use-manuscripts";
import {
  usePreflightResult,
  useRunPreflight,
  useOverridePreflightItem,
  useConfirmPreflight,
} from "@/hooks/use-preflight";
import { ChecklistItemCard } from "@/components/preflight/checklist-item-card";
import { PreflightSummaryBanner } from "@/components/preflight/preflight-summary-banner";
import { getErrorMessage } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string; mid: string }>;
}

export default function PreflightChecklistPage({ params }: PageProps) {
  const { id: projectId, mid: manuscriptId } = use(params);
  const router = useRouter();

  const { data: manuscript, isLoading: isLoadingManuscript } = useManuscript(manuscriptId);
  const { data: preflightResult, isLoading: isLoadingPreflight } = usePreflightResult(manuscriptId);

  const runPreflightMutation = useRunPreflight(manuscriptId, projectId);
  const overrideMutation = useOverridePreflightItem(manuscriptId);
  const confirmMutation = useConfirmPreflight(manuscriptId, projectId);

  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically trigger preflight if target journal is set and no results exist yet
  useEffect(() => {
    if (
      manuscript?.target_journal_id &&
      preflightResult === null &&
      !isLoadingPreflight &&
      !runPreflightMutation.isPending
    ) {
      runPreflightMutation.mutate();
    }
  }, [manuscript?.target_journal_id, preflightResult, isLoadingPreflight]);

  const handleRunEvaluation = () => {
    setErrorMessage(null);
    runPreflightMutation.mutate(undefined, {
      onError: (err) => {
        setErrorMessage(getErrorMessage(err));
      },
    });
  };

  const handleToggleOverride = (itemId: string, overridden: boolean, reason?: string) => {
    setErrorMessage(null);
    overrideMutation.mutate(
      { itemId, overridden, reason },
      {
        onError: (err) => {
          setErrorMessage(getErrorMessage(err));
        },
      }
    );
  };

  const handleConfirmAndProceed = () => {
    setErrorMessage(null);
    confirmMutation.mutate(undefined, {
      onSuccess: () => {
        // Route to Module 8 export page or success view
        router.push(`/projects/${projectId}/manuscripts/${manuscriptId}/export`);
      },
      onError: (err) => {
        setErrorMessage(getErrorMessage(err));
      },
    });
  };

  if (isLoadingManuscript || (isLoadingPreflight && !preflightResult)) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-40 bg-card rounded-2xl border border-border animate-pulse" />
        <div className="space-y-3">
          <div className="h-20 bg-card rounded-xl border border-border animate-pulse" />
          <div className="h-20 bg-card rounded-xl border border-border animate-pulse" />
        </div>
      </div>
    );
  }

  // Guard: If no target journal is selected yet
  if (!manuscript?.target_journal_id) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Target Journal Required
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Pre-flight compliance rules are evaluated specifically against target journal guidelines. Please select a journal template first.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/manuscripts/${manuscriptId}/journal`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#141413] hover:bg-[#141413]/90 rounded-xl transition-all shadow-sm"
        >
          <Building2 className="w-4 h-4" />
          Select Target Journal
        </Link>
      </div>
    );
  }

  const isFailing = preflightResult?.overall_status === "FAIL";
  const isReadyToConfirm =
    preflightResult &&
    !isFailing &&
    (hasConfirmedCheckbox || preflightResult.human_confirmed);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              Project
            </Link>
            <span>/</span>
            <span className="text-foreground truncate max-w-[200px]">
              {manuscript.original_filename}
            </span>
            <span>/</span>
            <span className="text-primary font-semibold">Pre-flight</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-[#141413]" />
            Submission Compliance Checklist
          </h1>
          <p className="text-sm text-muted-foreground">
            Automated verification of manuscript structure, word budgets, and mandatory declarations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-foreground bg-card hover:bg-secondary border border-border rounded-xl transition-colors shadow-2xs"
          >
            <FileEdit className="w-3.5 h-3.5 text-muted-foreground" />
            Metadata Editor
          </Link>

          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={runPreflightMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-foreground bg-card hover:bg-secondary border border-border rounded-xl transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                runPreflightMutation.isPending ? "animate-spin" : ""
              }`}
            />
            {runPreflightMutation.isPending ? "Evaluating..." : "Re-run Checks"}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Evaluation Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Summary Banner */}
      {preflightResult && <PreflightSummaryBanner result={preflightResult} />}

      {/* Itemized Checks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Diagnostic Check Items ({preflightResult?.items.length || 0})
          </h3>
          <span className="font-mono text-xs text-muted-foreground">
            Standard: {preflightResult?.template_slug?.toUpperCase() || "NATURE"}
          </span>
        </div>

        {preflightResult?.items && preflightResult.items.length > 0 ? (
          <div className="space-y-3">
            {preflightResult.items.map((item) => (
              <ChecklistItemCard
                key={item.id}
                item={item}
                projectId={projectId}
                manuscriptId={manuscriptId}
                onToggleOverride={handleToggleOverride}
                isOverriding={overrideMutation.isPending}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-card border border-border rounded-2xl">
            <p className="text-sm text-muted-foreground">
              No evaluation results available yet. Click &quot;Re-run Checks&quot; to evaluate this manuscript.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation & Next Step Gate */}
      {preflightResult && (
        <div className="scientific-box rounded-2xl border border-border bg-card p-6 md:p-7 shadow-sm space-y-6">
          <div className="flex items-start gap-3.5">
            <button
              type="button"
              disabled={isFailing}
              onClick={() => setHasConfirmedCheckbox(!hasConfirmedCheckbox)}
              className={`mt-0.5 text-primary transition-colors ${
                isFailing ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {hasConfirmedCheckbox || preflightResult.human_confirmed ? (
                <CheckSquare className="w-5 h-5 text-[#141413]" />
              ) : (
                <Square className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              )}
            </button>

            <div className="space-y-1">
              <label
                onClick={() => {
                  if (!isFailing) setHasConfirmedCheckbox(!hasConfirmedCheckbox);
                }}
                className={`text-sm font-semibold text-foreground ${
                  isFailing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                I confirm that all checklist items have been thoroughly reviewed
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isFailing
                  ? "Confirmation is blocked while mandatory critical issues remain unresolved. Fix the failing items in the metadata editor to continue."
                  : "By confirming, you acknowledge that all required author statements and word budgets conform to the target journal's published submission policies."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <Link
              href={`/projects/${projectId}/manuscripts/${manuscriptId}/journal`}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start sm:self-center"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Change Target Journal
            </Link>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={!isReadyToConfirm || confirmMutation.isPending}
                onClick={handleConfirmAndProceed}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl transition-all shadow-sm ${
                  isReadyToConfirm
                    ? "bg-[#141413] text-white hover:bg-[#141413]/90 shadow-md cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                }`}
              >
                {confirmMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Confirming Checklist...
                  </>
                ) : (
                  <>
                    Confirm and Proceed to Export
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
