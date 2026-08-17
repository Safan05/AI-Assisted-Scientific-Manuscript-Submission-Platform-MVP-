"use client";

// src/app/(dashboard)/projects/[id]/page.tsx
import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi, manuscriptApi } from "@/lib/api";
import StatusBadge from "@/components/manuscripts/status-badge";
import UploadDropzone from "@/components/manuscripts/upload-dropzone";
import type { Project, Manuscript } from "@/lib/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [parsingId, setParsingId] = useState<string | null>(null);

  // 1. Fetch Project Details
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId).then((res) => res.data),
  });

  // 2. Fetch Project Manuscripts
  const { data: manuscripts, isLoading: manuscriptsLoading } = useQuery<Manuscript[]>({
    queryKey: ["project-manuscripts", projectId],
    queryFn: () => projectApi.listManuscripts(projectId).then((res) => res.data),
  });

  // Parse mutation
  const parseMutation = useMutation({
    mutationFn: (manuscriptId: string) =>
      manuscriptApi.parse(manuscriptId).then((res) => res.data),
    onMutate: (mid) => setParsingId(mid),
    onSettled: () => setParsingId(null),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
    },
  });

  const handleManuscriptUploaded = () => {
    qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
  };

  const isLoading = projectLoading || manuscriptsLoading;

  if (isLoading && !project) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center font-mono text-xs text-[#707070]">
        [ LOADING WORKSPACE // ID: {projectId.slice(0, 8)}... ]
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center font-mono text-xs text-[#D0021B]">
        [ ERROR: PROJECT NOT FOUND OR ACCESS DENIED ]
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Breadcrumb & Navigation ─────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#707070]">
        <Link href="/projects" className="hover:text-[#111111] hover:underline">
          PROJECTS
        </Link>
        <span>/</span>
        <span className="text-[#111111] uppercase truncate max-w-sm">
          {project.name}
        </span>
      </div>

      {/* ── Project Header ─────────────────────────────────────────── */}
      <div className="border-b border-[#E0E0E0] pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="font-mono text-xs text-[#707070] uppercase tracking-wider mb-1">
            WORKSPACE // {project.id.slice(0, 8)}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            {project.name}
          </h1>
          <p className="text-xs text-[#707070] mt-1 max-w-2xl">
            {project.description || "No description provided for this research workspace."}
          </p>
        </div>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 border border-[#111111] bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-xs font-mono font-medium uppercase tracking-wider transition-colors shrink-0"
        >
          {showUpload ? "[ CLOSE UPLOADER ]" : "[ + UPLOAD MANUSCRIPT ]"}
        </button>
      </div>

      {/* ── Ingestion Dropzone ──────────────────────────────────────── */}
      {showUpload && (
        <div className="border border-[#111111] bg-white p-6 transition-all">
          <div className="flex justify-between items-center mb-4 border-b border-[#E0E0E0] pb-3">
            <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
              [ INGEST SCIENTIFIC MANUSCRIPT ]
            </span>
            <span className="font-mono text-[11px] text-[#707070]">
              MODULE 4 DOCLING PARSER
            </span>
          </div>

          <UploadDropzone
            projectId={projectId}
            onManuscriptUploaded={handleManuscriptUploaded}
          />
        </div>
      )}

      {/* ── Manuscript List Table ───────────────────────────────────── */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-[#707070] mb-4">
          MANUSCRIPTS IN THIS WORKSPACE ({manuscripts?.length || 0})
        </div>

        <div className="border border-[#E0E0E0] bg-white overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-[#F5F5F5] font-mono text-[11px] text-[#707070] uppercase">
                <th className="py-3 px-4 font-medium">Document</th>
                <th className="py-3 px-4 font-medium">Pipeline Status</th>
                <th className="py-3 px-4 font-medium">Word Count</th>
                <th className="py-3 px-4 font-medium">Target Journal</th>
                <th className="py-3 px-4 font-medium">Ingested At</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {!manuscripts || manuscripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="font-mono text-xs text-[#707070] uppercase mb-2">
                      [ NO MANUSCRIPTS UPLOADED ]
                    </div>
                    <p className="text-xs text-[#707070] mb-4">
                      Upload a .docx manuscript to parse hierarchy, figures, and metadata.
                    </p>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="px-3 py-1.5 bg-[#111111] text-[#FAFAFA] font-mono text-xs uppercase"
                    >
                      [ UPLOAD FIRST PAPER ]
                    </button>
                  </td>
                </tr>
              ) : (
                manuscripts.map((m) => (
                  <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-medium text-[#111111]">
                        {m.original_filename}
                      </div>
                      <div className="font-mono text-[10px] text-[#707070]">
                        ID: {m.id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#707070]">
                      {m.word_count > 0 ? `${m.word_count.toLocaleString()} words` : "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#707070]">
                      {m.target_journal_id ? "Configured" : "UNASSIGNED"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#707070]">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {m.status === "DRAFT" && (
                        <button
                          onClick={() => parseMutation.mutate(m.id)}
                          disabled={parsingId === m.id}
                          className="px-2.5 py-1 border border-[#D0021B] bg-white text-[#D0021B] hover:bg-[rgba(208,2,27,0.05)] text-[11px] font-mono uppercase tracking-wider transition-colors disabled:opacity-50"
                        >
                          {parsingId === m.id ? "[ PARSING... ]" : "[ PARSE ]"}
                        </button>
                      )}

                      <Link
                        href={`/projects/${projectId}/manuscripts/${m.id}/editor`}
                        className="inline-block px-3 py-1 bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-[11px] font-mono uppercase tracking-wider transition-colors"
                      >
                        [ OPEN EDITOR → ]
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
