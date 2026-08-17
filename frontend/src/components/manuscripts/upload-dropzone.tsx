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
        <div className="p-3.5 border border-[#f5c6cb] bg-[#fdf2f2] text-[#c93b2b] text-xs rounded-lg">
          {error}
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
            ? "border-[#141413] bg-[#f5f3ec]"
            : "border-dashed border-[#e6e4dc] bg-[#faf9f5] hover:border-[#8c8b85]"
        } p-8 text-center cursor-pointer rounded-xl transition-colors select-none`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="max-w-md mx-auto space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#f3f1ea] flex items-center justify-center text-[#141413] mb-2">
            📄
          </div>

          <div className="text-sm font-semibold text-[#141413]">
            {isUploading
              ? "Uploading document..."
              : isParsing
              ? "Extracting sections and figures..."
              : "Drag and drop your Word document here, or browse"}
          </div>

          <p className="text-xs text-[#6e6d68]">
            Supported format: Microsoft Word (.docx). Sections, tables, figures, and references will be automatically extracted.
          </p>
        </div>
      </div>

      {/* Uploaded state indicator */}
      {uploadedManuscript && (
        <div className="bg-white border border-[#e6e4dc] rounded-xl p-4 flex justify-between items-center text-sm shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#141413]">
                {uploadedManuscript.original_filename}
              </span>
              <StatusBadge status={uploadedManuscript.status} />
            </div>
            <div className="text-xs text-[#6e6d68]">
              {uploadedManuscript.word_count > 0 ? `${uploadedManuscript.word_count.toLocaleString()} words extracted` : "Ready for extraction"}
            </div>
          </div>

          {uploadedManuscript.status === "DRAFT" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerManualParse(uploadedManuscript.id);
              }}
              disabled={isParsing}
              className="px-3.5 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
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
