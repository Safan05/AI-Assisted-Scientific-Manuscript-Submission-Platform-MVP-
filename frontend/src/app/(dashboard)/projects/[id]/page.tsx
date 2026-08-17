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
      <div className="max-w-6xl mx-auto p-12 text-center text-xs text-[#6e6d68]">
        Loading project workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-xs text-[#c93b2b]">
        Project not found or access denied.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Breadcrumb & Navigation ─────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-[#6e6d68]">
        <Link href="/projects" className="hover:text-[#141413] hover:underline">
          Projects
        </Link>
        <span>/</span>
        <span className="text-[#141413] font-medium truncate max-w-sm">
          {project.name}
        </span>
      </div>

      {/* ── Project Header ─────────────────────────────────────────── */}
      <div className="border-b border-[#e6e4dc] pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#141413]">
            {project.name}
          </h1>
          <p className="text-sm text-[#6e6d68] mt-1 max-w-2xl">
            {project.description || "No description provided for this research workspace."}
          </p>
        </div>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="px-4 py-2 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors shrink-0"
        >
          {showUpload ? "Close Uploader" : "+ Upload Manuscript"}
        </button>
      </div>

      {/* ── Ingestion Dropzone ──────────────────────────────────────── */}
      {showUpload && (
        <div className="bg-white border border-[#e6e4dc] rounded-xl p-6 shadow-sm transition-all">
          <div className="flex justify-between items-center mb-4 border-b border-[#e6e4dc] pb-3">
            <h2 className="text-sm font-semibold text-[#141413]">
              Upload Manuscript Document
            </h2>
            <span className="text-xs text-[#6e6d68]">
              Word Document (.docx)
            </span>
          </div>

          <UploadDropzone
            projectId={projectId}
            onManuscriptUploaded={handleManuscriptUploaded}
          />
        </div>
      )}

      {/* ── Manuscript List Table ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider">
          Manuscripts in this Project ({manuscripts?.length || 0})
        </div>

        <div className="bg-white border border-[#e6e4dc] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4dc] bg-[#f5f3ec] text-xs font-medium text-[#6e6d68]">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Word Count</th>
                <th className="py-3 px-4">Target Journal</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4dc]">
              {!manuscripts || manuscripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <h2 className="text-sm font-semibold text-[#141413] mb-1">
                      No manuscripts uploaded yet
                    </h2>
                    <p className="text-xs text-[#6e6d68] mb-4">
                      Upload a Word (.docx) document to extract content, figures, and metadata.
                    </p>
                    <button
                      onClick={() => setShowUpload(true)}
                      className="px-3.5 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm"
                    >
                      + Upload First Manuscript
                    </button>
                  </td>
                </tr>
              ) : (
                manuscripts.map((m) => (
                  <tr key={m.id} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-[#141413]">
                        {m.original_filename}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6e6d68]">
                      {m.word_count > 0 ? `${m.word_count.toLocaleString()} words` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6e6d68]">
                      {m.target_journal_id ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#141413]/5 text-[#141413] border border-[#141413]/10">
                          Target Assigned
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6e6d68]" suppressHydrationWarning>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {m.status === "DRAFT" && (
                          <button
                            onClick={() => parseMutation.mutate(m.id)}
                            disabled={parsingId === m.id}
                            className="px-2.5 py-1 border border-[#141413] bg-white hover:bg-[#f5f3ec] text-[#141413] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                          >
                            {parsingId === m.id ? "Extracting..." : "Extract Content"}
                          </button>
                        )}

                        <Link
                          href={`/projects/${projectId}/manuscripts/${m.id}/editor`}
                          className="px-2.5 py-1 text-xs font-medium text-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-colors"
                        >
                          Editor
                        </Link>

                        <Link
                          href={`/projects/${projectId}/manuscripts/${m.id}/journal`}
                          className="px-2.5 py-1 text-xs font-medium text-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-colors"
                        >
                          Journal
                        </Link>

                        {m.target_journal_id && (
                          <Link
                            href={`/projects/${projectId}/manuscripts/${m.id}/preflight`}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#141413] hover:bg-[#141413]/90 rounded-lg transition-colors shadow-2xs"
                          >
                            Pre-flight →
                          </Link>
                        )}
                      </div>
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
