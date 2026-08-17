"use client";

// src/components/manuscripts/reference-list-editor.tsx
// Numbered bibliography editor with citation index, structured metadata & DOI lookup

import React, { useState } from "react";
import type { Reference } from "@/lib/types";

interface ReferenceListEditorProps {
  references: Reference[];
  onChangeReferences: (references: Reference[]) => void;
}

export function ReferenceListEditor({
  references,
  onChangeReferences,
}: ReferenceListEditorProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleAddReference = () => {
    const newRef: Reference = {
      index: references.length + 1,
      raw_text: "",
      authors: [],
      title: null,
      journal: null,
      year: null,
      volume: null,
      pages: null,
      doi: null,
      pmid: null,
      url: null,
    };
    onChangeReferences([...references, newRef]);
    setExpandedIndex(references.length);
  };

  const handleUpdateReference = (
    index: number,
    field: keyof Reference,
    value: unknown
  ) => {
    const updated = [...references];
    updated[index] = { ...updated[index], [field]: value };
    onChangeReferences(updated);
  };

  const handleRemoveReference = (index: number) => {
    const updated = references
      .filter((_, i) => i !== index)
      .map((ref, i) => ({ ...ref, index: i + 1 }));
    onChangeReferences(updated);
    if (expandedIndex === index) {
      setExpandedIndex(null);
    }
  };

  const handleMoveReference = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === references.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...references];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    // Re-index
    const reindexed = updated.map((ref, i) => ({ ...ref, index: i + 1 }));
    onChangeReferences(reindexed);
  };

  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div>
          <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
            [ 04 · BIBLIOGRAPHY & CITATIONS ]
          </span>
          <span className="ml-3 text-xs text-[#707070]">
            Numbered references in citation order ({references.length})
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddReference}
          className="px-3 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] text-[11px] font-mono uppercase tracking-wider transition-colors"
        >
          + ADD REFERENCE
        </button>
      </div>

      {/* ── Reference Items List ────────────────────────────────────── */}
      {references.length === 0 ? (
        <div className="p-8 border border-dashed border-[#E0E0E0] bg-white text-center font-mono text-xs text-[#707070]">
          [ NO CITATIONS EXTRACTED — CLICK "+ ADD REFERENCE" ]
        </div>
      ) : (
        <div className="border border-[#E0E0E0] bg-white divide-y divide-[#E0E0E0]">
          {references.map((ref, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div key={idx} className="p-4 hover:bg-[#FAFAFA] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Reference index marker */}
                  <div className="font-mono text-xs font-bold text-[#111111] shrink-0 pt-1">
                    [{ref.index}]
                  </div>

                  {/* Primary text */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <textarea
                      rows={2}
                      value={ref.raw_text}
                      onChange={(e) =>
                        handleUpdateReference(idx, "raw_text", e.target.value)
                      }
                      placeholder="Paste complete raw reference string..."
                      className="w-full p-2 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] font-sans leading-relaxed"
                    />

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-[#707070]">
                      {ref.doi && (
                        <span className="bg-[#F0F0F0] px-2 py-0.5 border border-[#E0E0E0] text-[#111111]">
                          DOI: {ref.doi}
                        </span>
                      )}
                      {ref.year && (
                        <span className="bg-[#F0F0F0] px-2 py-0.5 border border-[#E0E0E0] text-[#111111]">
                          YEAR: {ref.year}
                        </span>
                      )}
                      {ref.journal && (
                        <span className="italic text-[#111111]">
                          {ref.journal}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIndex(isExpanded ? null : idx)
                        }
                        className="underline text-[#111111] hover:text-[#D0021B]"
                      >
                        {isExpanded ? "[ HIDE STRUCTURED FIELDS ]" : "[ EDIT STRUCTURED FIELDS ]"}
                      </button>
                    </div>

                    {/* Collapsible Structured Fields */}
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-[#F5F5F5] border border-[#E0E0E0] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                            Article / Chapter Title
                          </label>
                          <input
                            type="text"
                            value={ref.title || ""}
                            onChange={(e) =>
                              handleUpdateReference(idx, "title", e.target.value || null)
                            }
                            placeholder="Title of referenced paper..."
                            className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                            Journal / Book Name
                          </label>
                          <input
                            type="text"
                            value={ref.journal || ""}
                            onChange={(e) =>
                              handleUpdateReference(idx, "journal", e.target.value || null)
                            }
                            placeholder="Nature Machine Intelligence"
                            className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                            Publication Year
                          </label>
                          <input
                            type="number"
                            value={ref.year || ""}
                            onChange={(e) =>
                              handleUpdateReference(
                                idx,
                                "year",
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            placeholder="2024"
                            className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                            Digital Object Identifier (DOI)
                          </label>
                          <input
                            type="text"
                            value={ref.doi || ""}
                            onChange={(e) =>
                              handleUpdateReference(idx, "doi", e.target.value || null)
                            }
                            placeholder="10.1038/s41586-024-..."
                            className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 font-mono shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveReference(idx, "up")}
                      disabled={idx === 0}
                      className="px-1.5 py-0.5 border border-[#E0E0E0] bg-white hover:border-[#111111] disabled:opacity-30 text-[10px]"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveReference(idx, "down")}
                      disabled={idx === references.length - 1}
                      className="px-1.5 py-0.5 border border-[#E0E0E0] bg-white hover:border-[#111111] disabled:opacity-30 text-[10px]"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveReference(idx)}
                      className="px-1.5 py-0.5 border border-[#E0E0E0] bg-white hover:border-[#D0021B] text-[#D0021B] text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ReferenceListEditor;
