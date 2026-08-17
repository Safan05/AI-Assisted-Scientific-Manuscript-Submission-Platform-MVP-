"use client";

// src/app/(dashboard)/projects/[id]/manuscripts/[mid]/journal/page.tsx
// Target journal selection step - transitions status EDITED -> TARGET_SELECTED

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manuscriptApi, projectApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import StatusBadge from "@/components/manuscripts/status-badge";
import JournalSelector from "@/components/journals/journal-selector";
import type { Manuscript, Project } from "@/lib/types";

export default function JournalSelectionPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id: projectId, mid: manuscriptId } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Project
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId).then((r) => r.data),
  });

  // 2. Fetch Manuscript
  const { data: manuscript, isLoading: manuscriptLoading } = useQuery<Manuscript>({
    queryKey: ["manuscript", manuscriptId],
    queryFn: () => manuscriptApi.get(manuscriptId).then((r) => r.data),
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: (targetJournalId: string) =>
      manuscriptApi
        .update(manuscriptId, { target_journal_id: targetJournalId })
        .then((r) => r.data),
    onSuccess: () => {
      setErrorMessage(null);
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
    },
    onError: (err: unknown) => {
      setErrorMessage(getErrorMessage(err, "Failed to select target journal"));
    },
  });

  const handleSelectJournal = async (templateId: string) => {
    await assignMutation.mutateAsync(templateId);
  };

  if (manuscriptLoading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-xs text-[#6e6d68]">
        Loading target journal workspace...
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-xs text-[#c93b2b]">
        Manuscript not found or access denied.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Breadcrumb Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6e6d68]">
        <div className="flex items-center gap-2">
          <Link href="/projects" className="hover:text-[#141413] hover:underline">
            Projects
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-[#141413] hover:underline truncate max-w-xs"
          >
            {project?.name || projectId.slice(0, 8)}
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
            className="hover:text-[#141413] hover:underline"
          >
            Edit Document
          </Link>
          <span>/</span>
          <span className="text-[#141413] font-medium">Target Journal</span>
        </div>

        <Link
          href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
          className="hover:underline text-[#141413]"
        >
          ← Return to Editor
        </Link>
      </div>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-b border-[#e6e4dc] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs text-[#6e6d68]">
              Target Journal Selection
            </span>
            <StatusBadge status={manuscript.status} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#141413]">
            Select Target Journal
          </h1>
          <p className="text-sm text-[#6e6d68] mt-1 max-w-2xl leading-relaxed">
            Choose your target journal to check formatting compliance, word limits, mandatory disclosures, and prepare output document generation.
          </p>
        </div>

        {manuscript.target_journal_id && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
              className="px-3.5 py-2 bg-card border border-border hover:bg-secondary text-foreground text-xs font-medium rounded-xl shadow-2xs transition-colors"
            >
              Metadata Editor
            </Link>
            <Link
              href={`/projects/${projectId}/manuscripts/${manuscriptId}/preflight`}
              className="px-4 py-2 bg-[#141413] hover:bg-[#141413]/90 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              Pre-flight Checks →
            </Link>
          </div>
        )}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3.5 border border-[#f5c6cb] bg-[#fdf2f2] text-[#c93b2b] text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* ── Journal Selector Component ──────────────────────────────── */}
      <JournalSelector
        currentJournalId={manuscript.target_journal_id ?? null}
        onSelectJournal={handleSelectJournal}
        isSaving={assignMutation.isPending}
      />
    </div>
  );
}
