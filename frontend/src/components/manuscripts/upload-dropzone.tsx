"use client";

// src/components/manuscripts/upload-dropzone.tsx
// Scientific manuscript upload dropzone with precision alignment indicators

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
      setError("Please select a Microsoft Word (.docx) document.");
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

      // 2. Trigger Parser automatically
      setIsParsing(true);
      try {
        await manuscriptApi.parse(manuscript.id);
        const updatedRes = await manuscriptApi.get(manuscript.id);
        setUploadedManuscript(updatedRes.data);
        onManuscriptUploaded(updatedRes.data);
      } catch (parseErr: unknown) {
        console.error("Auto-parse notice:", parseErr);
        onManuscriptUploaded(manuscript);
      } finally {
        setIsParsing(false);
      }
    } catch (err: unknown) {
      setIsUploading(false);
      setIsParsing(false);
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Upload failed. Please try again.");
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
        setError(axErr.response?.data?.detail || "Document extraction failed.");
      } else {
        setError("Extraction failed. Please try again.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Error alert */}
      {error && (
        <div className="p-3.5 border border-[#f5c6cb] bg-[#fdf2f2] text-[#c93b2b] text-xs rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Dropzone Container with subtle dot-matrix background */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`scientific-box border-2 ${
          isDragging
            ? "border-[#141413] bg-[#f5f3ec]"
            : "border-dashed border-[#dcd9ce] bg-white bg-grid-dots-dense hover:border-[#141413]"
        } p-8 lg:p-10 text-center cursor-pointer rounded-xl transition-all select-none shadow-sm relative overflow-hidden`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-3 relative z-10">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#faf9f5] border border-[#e6e4dc] flex items-center justify-center text-base font-mono shadow-sm">
            📄
          </div>

          <div>
            <div className="text-sm font-semibold text-[#141413]">
              {isUploading
                ? "Uploading document..."
                : isParsing
                ? "Extracting sections, tables and figures..."
                : "Drag and drop your Word document here, or browse"}
            </div>
            <p className="text-xs text-[#6e6d68] mt-1">
              Supports Microsoft Word (.docx) documents. Structure, figures, and references are automatically extracted.
            </p>
          </div>

          <div className="pt-2 flex justify-center items-center gap-3 font-mono text-[10px] text-[#8c8b85]">
            <span>FORMAT: .DOCX</span>
            <span>·</span>
            <span>PARSER: IN-PROCESS</span>
            <span>·</span>
            <span>ENCRYPTED INGESTION</span>
          </div>
        </div>
      </div>

      {/* Uploaded state indicator */}
      {uploadedManuscript && (
        <div className="bg-white border border-[#e6e4dc] rounded-xl p-4 flex justify-between items-center text-sm shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#141413]">
                {uploadedManuscript.original_filename}
              </span>
              <StatusBadge status={uploadedManuscript.status} />
            </div>
            <div className="text-xs text-[#6e6d68] font-mono">
              {uploadedManuscript.word_count > 0
                ? `${uploadedManuscript.word_count.toLocaleString()} words extracted`
                : "Ready for extraction"}
            </div>
          </div>

          {uploadedManuscript.status === "DRAFT" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerManualParse(uploadedManuscript.id);
              }}
              disabled={isParsing}
              className="px-3.5 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isParsing ? "Extracting..." : "Extract Content →"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadDropzone;
