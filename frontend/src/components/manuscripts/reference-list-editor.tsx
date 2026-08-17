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
          <h3 className="text-sm font-semibold text-[#141413]">
            References & Citations ({references.length})
          </h3>
          <p className="text-xs text-[#6e6d68]">
            Numbered bibliography in order of citation appearance.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddReference}
          className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          + Add Reference
        </button>
      </div>

      {/* ── Reference Items List ────────────────────────────────────── */}
      {references.length === 0 ? (
        <div className="p-8 border border-dashed border-[#e6e4dc] bg-white rounded-xl text-center text-xs text-[#6e6d68]">
          No citations found. Click "+ Add Reference" to add one.
        </div>
      ) : (
        <div className="bg-white border border-[#e6e4dc] rounded-xl divide-y divide-[#e6e4dc] shadow-sm overflow-hidden">
          {references.map((ref, idx) => {
            const isExpanded = expandedIndex === idx;

            return (
              <div key={idx} className="p-4 hover:bg-[#faf9f5] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  {/* Reference index marker */}
                  <div className="text-xs font-bold text-[#141413] shrink-0 pt-1">
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
                      placeholder="Full reference citation text..."
                      className="w-full p-2.5 text-xs bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] leading-relaxed"
                    />

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6e6d68]">
                      {ref.doi && (
                        <span className="bg-[#f5f3ec] px-2 py-0.5 border border-[#e6e4dc] rounded text-[#141413] font-mono text-[11px]">
                          DOI: {ref.doi}
                        </span>
                      )}
                      {ref.year && (
                        <span className="bg-[#f5f3ec] px-2 py-0.5 border border-[#e6e4dc] rounded text-[#141413] text-[11px]">
                          Year: {ref.year}
                        </span>
                      )}
                      {ref.journal && (
                        <span className="italic text-[#141413]">
                          {ref.journal}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedIndex(isExpanded ? null : idx)
                        }
                        className="underline text-[#141413] hover:text-[#c93b2b]"
                      >
                        {isExpanded ? "Hide Details" : "Edit Details (DOI / Title)"}
                      </button>
                    </div>

                    {/* Collapsible Structured Fields */}
                    {isExpanded && (
                      <div className="mt-3 p-3.5 bg-[#f5f3ec] border border-[#e6e4dc] rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="sm:col-span-3">
                          <label className="text-[#6e6d68] block mb-1 font-medium">
                            Article Title
                          </label>
                          <input
                            type="text"
                            value={ref.title || ""}
                            onChange={(e) =>
                              handleUpdateReference(idx, "title", e.target.value || null)
                            }
                            placeholder="Title of referenced paper..."
                            className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[#6e6d68] block mb-1 font-medium">
                            Journal / Publisher
                          </label>
                          <input
                            type="text"
                            value={ref.journal || ""}
                            onChange={(e) =>
                              handleUpdateReference(idx, "journal", e.target.value || null)
                            }
                            placeholder="Journal name"
                            className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[#6e6d68] block mb-1 font-medium">
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
                            className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[#6e6d68] block mb-1 font-medium">
                            DOI (Digital Object Identifier)
                          </label>
                          <input
                            type="text"
                            value={ref.doi || ""}
                            onChange={(e) =>
                              handleUpdateReference(idx, "doi", e.target.value || null)
                            }
                            placeholder="10.1038/..."
                            className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => handleMoveReference(idx, "up")}
                      disabled={idx === 0}
                      className="px-2 py-0.5 border border-[#e6e4dc] bg-white hover:border-[#141413] rounded text-[#6e6d68] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveReference(idx, "down")}
                      disabled={idx === references.length - 1}
                      className="px-2 py-0.5 border border-[#e6e4dc] bg-white hover:border-[#141413] rounded text-[#6e6d68] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveReference(idx)}
                      className="px-2 py-0.5 border border-[#e6e4dc] bg-white hover:border-[#c93b2b] text-[#c93b2b] rounded"
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
