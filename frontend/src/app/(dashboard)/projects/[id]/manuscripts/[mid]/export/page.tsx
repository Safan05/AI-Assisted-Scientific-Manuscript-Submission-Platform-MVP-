"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ArrowLeft,
} from "lucide-react";
import { useManuscript } from "@/hooks/use-manuscripts";
import {
  useExportStatus,
  useTriggerExport,
  useExportDownloadUrl,
} from "@/hooks/use-export";
import { getErrorMessage } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string; mid: string }>;
}

export default function ExportPage({ params }: PageProps) {
  const { id: projectId, mid: manuscriptId } = use(params);
  const router = useRouter();

  const { data: manuscript, isLoading: isLoadingManuscript } = useManuscript(manuscriptId);
  const { data: exportStatus, isLoading: isLoadingExport, refetch: refetchStatus } = useExportStatus(manuscriptId);

  const triggerMutation = useTriggerExport(manuscriptId, projectId);
  const downloadMutation = useExportDownloadUrl(manuscriptId);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isExported = exportStatus?.is_exported;

  const handleGenerate = () => {
    setErrorMessage(null);
    triggerMutation.mutate(undefined, {
      onError: (err) => {
        setErrorMessage(getErrorMessage(err));
      },
      onSuccess: () => {
        refetchStatus();
      }
    });
  };

  const handleDownload = () => {
    setErrorMessage(null);
    downloadMutation.mutate(undefined, {
      onSuccess: (data) => {
        window.open(data.download_url, "_blank");
      },
      onError: (err) => {
        setErrorMessage(getErrorMessage(err));
      },
    });
  };

  if (isLoadingManuscript || isLoadingExport) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-card rounded-2xl border border-border animate-pulse" />
      </div>
    );
  }

  // Guard: Not passed checklist yet?
  if (manuscript?.status !== "CHECKLIST_PASSED" && manuscript?.status !== "EXPORTED") {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Pre-flight Checklist Pending
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            You must pass the pre-flight checklist and confirm compliance before generating the final document.
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/manuscripts/${manuscriptId}/preflight`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#141413] hover:bg-[#141413]/90 rounded-xl transition-all shadow-sm"
        >
          <FileCheck2 className="w-4 h-4" />
          Go to Pre-flight
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
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
              {manuscript?.original_filename}
            </span>
            <span>/</span>
            <span className="text-primary font-semibold">Export</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-[#141413]" />
            Document Generation
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate the final formatted .docx tailored to {manuscript?.target_journal_id ? "your target journal" : "the journal template"}.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Generation Error</p>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="scientific-box rounded-2xl border border-border bg-card p-8 shadow-sm flex flex-col items-center text-center space-y-6">
        
        {isExported ? (
          <>
            <div className="w-20 h-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Document Ready</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Your manuscript has been successfully generated and formatted according to the journal guidelines.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center">
              <button
                onClick={handleDownload}
                disabled={downloadMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-[#141413] text-white hover:bg-[#141413]/90 shadow-md transition-all min-w-[200px]"
              >
                {downloadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download .docx
              </button>
              
              <button
                onClick={handleGenerate}
                disabled={triggerMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-all border border-border"
              >
                {triggerMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Regenerate
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center mb-2">
              <FileText className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Ready to Generate</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                All pre-flight checks have passed. Click below to compile your metadata and IR into a submission-ready .docx file.
              </p>
            </div>
            
            <div className="pt-4">
              <button
                onClick={handleGenerate}
                disabled={triggerMutation.isPending}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold rounded-xl bg-[#141413] text-white hover:bg-[#141413]/90 shadow-md transition-all min-w-[240px]"
              >
                {triggerMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Document...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Document
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-start">
        <Link
          href={`/projects/${projectId}/manuscripts/${manuscriptId}/preflight`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Pre-flight Checklist
        </Link>
      </div>
    </div>
  );
}
