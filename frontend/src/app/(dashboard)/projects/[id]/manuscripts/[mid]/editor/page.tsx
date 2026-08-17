"use client";

// src/app/(dashboard)/projects/[id]/manuscripts/[mid]/editor/page.tsx
import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manuscriptApi, projectApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/utils";
import StatusBadge from "@/components/manuscripts/status-badge";
import MetadataForm from "@/components/manuscripts/metadata-form";
import type { Manuscript, ManuscriptIR, ManuscriptAsset, Project } from "@/lib/types";

export default function ManuscriptEditorPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id: projectId, mid: manuscriptId } = use(params);
  const qc = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Project
  const { data: project } = useQuery<Project>({
    queryKey: ["project", projectId],
    queryFn: () => projectApi.get(projectId).then((r) => r.data),
  });

  // 2. Fetch Manuscript DB Record
  const { data: manuscript, isLoading: manuscriptLoading } = useQuery<Manuscript>({
    queryKey: ["manuscript", manuscriptId],
    queryFn: () => manuscriptApi.get(manuscriptId).then((r) => r.data),
  });

  // 3. Fetch Extracted Metadata IR
  const {
    data: ir,
    isLoading: irLoading,
  } = useQuery<ManuscriptIR>({
    queryKey: ["manuscript-ir", manuscriptId],
    queryFn: () => manuscriptApi.getIR(manuscriptId).then((r) => r.data),
    retry: false,
    enabled: !!manuscript && manuscript.status !== "DRAFT",
  });

  // 4. Fetch Extracted Figures/Assets
  const { data: assets } = useQuery<ManuscriptAsset[]>({
    queryKey: ["manuscript-assets", manuscriptId],
    queryFn: () => manuscriptApi.getAssets(manuscriptId).then((r) => r.data),
  });

  // Parse mutation (if in DRAFT state)
  const parseMutation = useMutation({
    mutationFn: () => manuscriptApi.parse(manuscriptId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["manuscript-ir", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["manuscript-assets", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
    },
    onError: (err: unknown) => {
      setErrorMessage(getErrorMessage(err, "Document extraction failed"));
    },
  });

  // Save metadata mutation
  const saveMutation = useMutation({
    mutationFn: (updatedIR: ManuscriptIR) =>
      manuscriptApi.updateIR(manuscriptId, updatedIR).then((r) => r.data),
    onSuccess: () => {
      setSaveSuccess(true);
      setErrorMessage(null);
      setTimeout(() => setSaveSuccess(false), 4000);
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["manuscript-ir", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
    },
    onError: (err: unknown) => {
      setErrorMessage(getErrorMessage(err, "Failed to save metadata"));
    },
  });

  const handleSave = async (updatedIR: ManuscriptIR) => {
    setErrorMessage(null);
    await saveMutation.mutateAsync(updatedIR);
  };

  const isLoading = manuscriptLoading || (manuscript?.status !== "DRAFT" && irLoading);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-xs text-[#6e6d68]">
        Loading manuscript editor...
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
    <div className="max-w-6xl mx-auto space-y-6">
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
          <span className="text-[#141413] font-medium">Edit Document</span>
        </div>

        <div className="flex items-center gap-2">
          {manuscript.target_journal_id ? (
            <Link
              href={`/projects/${projectId}/manuscripts/${manuscriptId}/preflight`}
              className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              Pre-flight Checks →
            </Link>
          ) : (
            <Link
              href={`/projects/${projectId}/manuscripts/${manuscriptId}/journal`}
              className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              Choose Target Journal →
            </Link>
          )}

          <button
            type="button"
            onClick={() => setShowAssets(!showAssets)}
            className="px-3 py-1.5 border border-[#e6e4dc] bg-white hover:bg-[#f5f3ec] text-[#141413] text-xs font-medium rounded-lg"
          >
            {showAssets ? "Hide Figures" : `Extracted Figures (${assets?.length || 0})`}
          </button>
        </div>
      </div>

      {/* ── Manuscript Header Card ─────────────────────────────────── */}
      <div className="border-b border-[#e6e4dc] pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-[11px] text-[#8c8b85]">
              ⌖ {manuscript.original_filename}
            </span>
            <StatusBadge status={manuscript.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#141413]">
            {ir?.title || manuscript.original_filename}
          </h1>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#8c8b85] mt-1.5">
            <span>ID: {manuscript.id.slice(0, 8)}</span>
            <span>·</span>
            <span>{manuscript.word_count > 0 ? `${manuscript.word_count.toLocaleString()} WORDS` : "0 WORDS"}</span>
            <span>·</span>
            <span>FORMAT: OPENXML DOCX</span>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="p-3.5 bg-[#f0f7f2] border border-[#d2ead9] text-[#1b6b37] text-xs font-medium rounded-lg flex justify-between items-center transition-all">
          <span>Metadata changes saved successfully.</span>
          <Link
            href={`/projects/${projectId}/manuscripts/${manuscriptId}/journal`}
            className="underline font-semibold"
          >
            Proceed to Target Journal Selection →
          </Link>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="p-3.5 border border-[#f5c6cb] bg-[#fdf2f2] text-[#c93b2b] text-xs rounded-lg">
          {errorMessage}
        </div>
      )}

      {/* ── Extracted Assets Drawer (Figures & Tables) ──────────────── */}
      {showAssets && (
        <div className="bg-white border border-[#e6e4dc] rounded-xl p-6 transition-all space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-[#e6e4dc] pb-3">
            <h3 className="text-sm font-semibold text-[#141413]">
              Extracted Figures ({assets?.length || 0})
            </h3>
            <span className="text-xs text-[#6e6d68]">
              Embedded graphics extracted from document
            </span>
          </div>

          {!assets || assets.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#6e6d68]">
              No embedded figures extracted from this document.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="border border-[#e6e4dc] bg-[#faf9f5] rounded-xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-center text-xs text-[#6e6d68]">
                    <span>Figure #{asset.order_index}</span>
                    <span>{(asset.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="h-32 bg-white border border-[#e6e4dc] rounded-lg flex items-center justify-center text-xs text-[#6e6d68] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`http://localhost:8000/api/v1/storage/files/${asset.storage_key}`}
                      alt={asset.caption || asset.original_name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <span className="p-2 text-center text-xs text-[#6e6d68]">
                      {asset.original_name}
                    </span>
                  </div>
                  {asset.caption && (
                    <p className="text-xs text-[#141413] line-clamp-2">
                      {asset.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── State 1: Manuscript is in DRAFT state ────────────────────── */}
      {manuscript.status === "DRAFT" && (
        <div className="border border-dashed border-[#e6e4dc] bg-white rounded-xl p-12 text-center space-y-4 shadow-sm">
          <h2 className="text-lg font-semibold text-[#141413]">
            Document Extraction Pending
          </h2>
          <p className="text-xs text-[#6e6d68] max-w-md mx-auto leading-relaxed">
            Extract headings, citations, author blocks, and embedded figures to start editing your manuscript metadata.
          </p>

          <button
            onClick={() => parseMutation.mutate()}
            disabled={parseMutation.isPending}
            className="px-5 py-2.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {parseMutation.isPending ? "Extracting Content..." : "Extract Manuscript Content →"}
          </button>
        </div>
      )}

      {/* ── State 2: Extracted Manuscript IR is available ───────────── */}
      {ir && (
        <MetadataForm
          initialIR={ir}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* State 3: Ir error or not parsed */}
      {!ir && manuscript.status !== "DRAFT" && (
        <div className="bg-white border border-[#e6e4dc] rounded-xl p-8 text-center space-y-3 shadow-sm">
          <p className="text-xs text-[#c93b2b]">
            Unable to load manuscript data.
          </p>
          <button
            onClick={() => parseMutation.mutate()}
            className="px-4 py-2 bg-[#141413] text-white text-xs font-medium rounded-lg"
          >
            Retry Content Extraction
          </button>
        </div>
      )}
    </div>
  );
}
