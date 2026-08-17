"use client";

// src/components/manuscripts/upload-dropzone.tsx
import React, { useState, useRef } from "react";
import { projectApi, manuscriptApi } from "@/lib/api";
import StatusBadge from "./status-badge";
import type { Manuscript } from "@/lib/types";

interface UploadDropzoneProps {
  projectId: string;
  onManuscriptUploaded: (manuscript: Manuscript) => void;
}

export function UploadDropzone({
  projectId,
  onManuscriptUploaded,
}: UploadDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedManuscript, setUploadedManuscript] = useState<Manuscript | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".docx")) {
      setError("Invalid file format. Only Microsoft Word (.docx) documents are supported.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 1. Upload to storage & register in DB
      const res = await projectApi.uploadManuscript(projectId, file);
      const manuscript = res.data;
      setUploadedManuscript(manuscript);
      setIsUploading(false);

      // 2. Trigger Docling Parser (Module 4) automatically
      setIsParsing(true);
      try {
        await manuscriptApi.parse(manuscript.id);
        const updatedRes = await manuscriptApi.get(manuscript.id);
        setUploadedManuscript(updatedRes.data);
        onManuscriptUploaded(updatedRes.data);
      } catch (parseErr: unknown) {
        console.error("Auto-parse notice:", parseErr);
        // Even if parse fails, the manuscript is uploaded
        onManuscriptUploaded(manuscript);
      } finally {
        setIsParsing(false);
      }
    } catch (err: unknown) {
      setIsUploading(false);
      setIsParsing(false);
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Upload failed. Check server connection.");
      } else {
        setError("Network error during manuscript upload.");
      }
    }
  };

  const triggerManualParse = async (manuscriptId: string) => {
    setIsParsing(true);
    setError(null);
    try {
      await manuscriptApi.parse(manuscriptId);
      const updatedRes = await manuscriptApi.get(manuscriptId);
      setUploadedManuscript(updatedRes.data);
      onManuscriptUploaded(updatedRes.data);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Docling parser failed.");
      } else {
        setError("Parsing failed.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error alert */}
      {error && (
        <div className="p-3 border border-[#D0021B] bg-[rgba(208,2,27,0.05)] text-[#D0021B] text-xs font-mono">
          [ ERROR ] {error}
        </div>
      )}

      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 ${
          isDragging
            ? "border-[#111111] bg-[#F0F0F0]"
            : "border-dashed border-[#E0E0E0] bg-white hover:border-[#707070]"
        } p-8 text-center cursor-pointer transition-colors select-none`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-2">
          <div className="font-mono text-xs font-bold text-[#111111] tracking-wider uppercase">
            {isUploading
              ? "[ UPLOADING .DOCX TO OBJECT STORAGE... ]"
              : isParsing
              ? "[ DOCLING PARSING ENGINE RUNNING... ]"
              : "[ DRAG & DROP .DOCX OR CLICK TO BROWSE ]"}
          </div>

          <p className="text-xs text-[#707070]">
            Accepted format: Microsoft Word (.docx). Ingests document hierarchy,
            embedded figures, tables, and reference lists.
          </p>

          <div className="pt-2 font-mono text-[10px] text-[#707070] uppercase tracking-wider">
            IBM RESEARCH DOCLING v2 · TABLEFORMER · CPU-ONLY INGESTION
          </div>
        </div>
      </div>

      {/* Uploaded state indicator */}
      {uploadedManuscript && (
        <div className="border border-[#E0E0E0] bg-white p-4 flex justify-between items-center text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#111111]">
                {uploadedManuscript.original_filename}
              </span>
              <StatusBadge status={uploadedManuscript.status} />
            </div>
            <div className="font-mono text-[11px] text-[#707070]">
              ID: {uploadedManuscript.id} · WORDS:{" "}
              {uploadedManuscript.word_count.toLocaleString()}
            </div>
          </div>

          {uploadedManuscript.status === "DRAFT" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerManualParse(uploadedManuscript.id);
              }}
              disabled={isParsing}
              className="px-3 py-1.5 bg-[#D0021B] hover:bg-[#B00217] text-white font-mono text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isParsing ? "[ PARSING... ]" : "[ PARSE WITH DOCLING → ]"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadDropzone;
