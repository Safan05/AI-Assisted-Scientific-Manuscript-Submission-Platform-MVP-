"use client";

// src/app/(dashboard)/projects/[id]/manuscripts/[mid]/editor/page.tsx
import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manuscriptApi, projectApi } from "@/lib/api";
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
    error: irError,
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
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(axErr.response?.data?.detail || "Docling parsing failed");
      } else {
        setErrorMessage("Parsing failed");
      }
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
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(axErr.response?.data?.detail || "Failed to save metadata");
      } else {
        setErrorMessage("Failed to save changes");
      }
    },
  });

  const handleSave = async (updatedIR: ManuscriptIR) => {
    setErrorMessage(null);
    await saveMutation.mutateAsync(updatedIR);
  };

  const isLoading = manuscriptLoading || (manuscript?.status !== "DRAFT" && irLoading);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center font-mono text-xs text-[#707070]">
        [ LOADING CANONICAL MANUSCRIPT IR // {manuscriptId.slice(0, 8)}... ]
      </div>
    );
  }

  if (!manuscript) {
    return (
      <div className="max-w-7xl mx-auto p-12 text-center font-mono text-xs text-[#D0021B]">
        [ ERROR: MANUSCRIPT RECORD NOT FOUND ]
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
          <span className="text-[#111111] font-bold">METADATA EDITOR</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAssets(!showAssets)}
            className="px-2.5 py-1 border border-[#E0E0E0] bg-white hover:border-[#111111] text-[#111111] text-[11px] font-mono uppercase tracking-wider"
          >
            {showAssets ? "[ HIDE FIGURES ]" : `[ EXTRACTED FIGURES (${assets?.length || 0}) ]`}
          </button>
        </div>
      </div>

      {/* ── Manuscript Header Card ─────────────────────────────────── */}
      <div className="border-b border-[#E0E0E0] pb-5 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-xs text-[#707070] uppercase">
              DOCUMENT: {manuscript.original_filename}
            </span>
            <StatusBadge status={manuscript.status} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
            {ir?.title || manuscript.original_filename}
          </h1>
          <div className="flex flex-wrap gap-4 font-mono text-[11px] text-[#707070] mt-1">
            <span>MANUSCRIPT ID: {manuscript.id}</span>
            <span>·</span>
            <span>TOTAL WORDS: {manuscript.word_count.toLocaleString()}</span>
            <span>·</span>
            <span>PARSER: DOCLING IBM RESEARCH</span>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="p-3 border border-[#111111] bg-[#111111] text-[#FAFAFA] font-mono text-xs flex justify-between items-center transition-all">
          <span>[ STATUS UPDATED: 03 · EDITED — CANONICAL IR SAVED TO DATABASE ]</span>
          <span className="text-[#E0E0E0] text-[11px]">READY FOR TARGET JOURNAL SELECTION</span>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="p-3 border border-[#D0021B] bg-[rgba(208,2,27,0.05)] text-[#D0021B] font-mono text-xs">
          [ ERROR ] {errorMessage}
        </div>
      )}

      {/* ── Extracted Assets Drawer (Figures & Tables) ──────────────── */}
      {showAssets && (
        <div className="border border-[#111111] bg-white p-6 transition-all space-y-4">
          <div className="flex justify-between items-center border-b border-[#E0E0E0] pb-3">
            <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
              [ EXTRACTED PICTURE ITEMS & FIGURES ]
            </span>
            <span className="font-mono text-[11px] text-[#707070]">
              TOTAL FIGURES: {assets?.length || 0}
            </span>
          </div>

          {!assets || assets.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-[#707070]">
              No embedded figures extracted from this document.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="border border-[#E0E0E0] bg-[#FAFAFA] p-3 space-y-2"
                >
                  <div className="flex justify-between items-center font-mono text-[10px] text-[#707070]">
                    <span>FIG #{asset.order_index}</span>
                    <span>{(asset.file_size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="h-32 bg-white border border-[#E0E0E0] flex items-center justify-center font-mono text-[10px] text-[#707070] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`http://localhost:8000/api/v1/storage/files/${asset.storage_key}`}
                      alt={asset.caption || asset.original_name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <span className="p-2 text-center text-[10px] text-[#707070]">
                      {asset.original_name}
                    </span>
                  </div>
                  {asset.caption && (
                    <p className="text-[11px] text-[#111111] line-clamp-2">
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
        <div className="border-2 border-dashed border-[#111111] bg-white p-12 text-center space-y-4">
          <div className="font-mono text-xs text-[#D0021B] font-bold uppercase tracking-wider">
            [ STATUS: 01 · DRAFT — UNPARSED DOCUMENT ]
          </div>
          <h2 className="text-xl font-bold text-[#111111]">
            Document Ingestion Pending
          </h2>
          <p className="text-xs text-[#707070] max-w-md mx-auto leading-relaxed">
            This manuscript has been securely uploaded to storage. Run the Docling
            parsing engine to extract heading hierarchy, citations, author blocks,
            and structured figures into the canonical Manuscript IR schema.
          </p>

          <button
            onClick={() => parseMutation.mutate()}
            disabled={parseMutation.isPending}
            className="px-6 py-3 bg-[#D0021B] hover:bg-[#B00217] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {parseMutation.isPending
              ? "[ DOCLING PARSER RUNNING... ]"
              : "[ RUN DOCLING PARSING ENGINE → ]"}
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
        <div className="border border-[#E0E0E0] bg-white p-8 text-center space-y-3">
          <div className="font-mono text-xs text-[#D0021B]">
            [ ERROR FETCHING EXTRACTED METADATA IR ]
          </div>
          <button
            onClick={() => parseMutation.mutate()}
            className="px-4 py-2 bg-[#111111] text-white font-mono text-xs uppercase"
          >
            [ RE-RUN DOCLING PARSER ]
          </button>
        </div>
      )}
    </div>
  );
}
