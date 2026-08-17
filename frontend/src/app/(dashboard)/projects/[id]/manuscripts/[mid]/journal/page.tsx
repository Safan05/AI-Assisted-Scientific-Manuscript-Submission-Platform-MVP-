"use client";

// src/app/(dashboard)/projects/[id]/manuscripts/[mid]/journal/page.tsx
// Target journal selection step — transitions status EDITED -> TARGET_SELECTED

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manuscriptApi, projectApi } from "@/lib/api";
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
    onSuccess: (updatedManuscript) => {
      setErrorMessage(null);
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
    },
    onError: (err: unknown) => {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(axErr.response?.data?.detail || "Failed to assign target journal");
      } else {
        setErrorMessage("Network error assigning target journal");
      }
    },
  });

  const handleSelectJournal = async (templateId: string) => {
    await assignMutation.mutateAsync(templateId);
  };

  if (manuscriptLoading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center font-mono text-xs text-[#707070]">
        [ LOADING TARGET JOURNAL WORKSPACE // {manuscriptId.slice(0, 8)}... ]
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center font-mono text-xs text-[#D0021B]">
        [ ERROR: MANUSCRIPT NOT FOUND ]
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Breadcrumb Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs font-mono text-[#707070]">
        <div className="flex items-center gap-2">
          <Link href="/projects" className="hover:text-[#111111] hover:underline">
            PROJECTS
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-[#111111] hover:underline uppercase truncate max-w-xs"
          >
            {project?.name || projectId.slice(0, 8)}
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
            className="hover:text-[#111111] hover:underline"
          >
            METADATA
          </Link>
          <span>/</span>
          <span className="text-[#111111] font-bold">TARGET JOURNAL</span>
        </div>

        <Link
          href={`/projects/${projectId}/manuscripts/${manuscriptId}/editor`}
          className="underline text-[#111111] hover:text-[#D0021B]"
        >
          ← BACK TO METADATA EDITOR
        </Link>
      </div>

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-b border-[#E0E0E0] pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-[#707070] uppercase">
              PIPELINE STEP 04 // TARGET JOURNAL STANDARDIZATION
            </span>
            <StatusBadge status={manuscript.status} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            Select Target Journal
          </h1>
          <p className="text-xs text-[#707070] mt-1 max-w-2xl leading-relaxed">
            Choose the destination journal for automated pre-flight compliance checking
            and target Word document (.docx) generation.
          </p>
        </div>

        {manuscript.target_journal_id && (
          <button
            onClick={() =>
              router.push(
                `/projects/${projectId}/manuscripts/${manuscriptId}/editor`
              )
            }
            className="px-4 py-2 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] text-xs font-mono font-medium uppercase tracking-wider transition-colors shrink-0"
          >
            [ RETURN TO EDITOR → ]
          </button>
        )}
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 border border-[#D0021B] bg-[rgba(208,2,27,0.05)] text-[#D0021B] text-xs font-mono">
          [ ERROR ] {errorMessage}
        </div>
      )}

      {/* ── Journal Selector Component ──────────────────────────────── */}
      <JournalSelector
        currentJournalId={manuscript.target_journal_id}
        onSelectJournal={handleSelectJournal}
        isSaving={assignMutation.isPending}
      />
    </div>
  );
}
