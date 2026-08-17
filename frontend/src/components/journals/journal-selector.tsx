"use client";

// src/components/journals/journal-selector.tsx
// User-friendly target journal selector with guidelines and requirements summary

import React, { useState } from "react";
import { useJournalTemplates, useJournalTemplateDetail } from "@/hooks/use-journals";
import type { JournalTemplate } from "@/lib/types";

interface JournalSelectorProps {
  currentJournalId: string | null;
  onSelectJournal: (templateId: string) => Promise<void>;
  isSaving?: boolean;
}

export function JournalSelector({
  currentJournalId,
  onSelectJournal,
  isSaving = false,
}: JournalSelectorProps) {
  const { data: templates, isLoading, refetch } = useJournalTemplates(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    currentJournalId || null
  );
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  // Auto-select first template if none selected once loaded
  React.useEffect(() => {
    if (!selectedId && templates && templates.length > 0) {
      setSelectedId(currentJournalId || templates[0].id);
    }
  }, [templates, selectedId, currentJournalId]);

  // Fetch detailed info + rules for selected template
  const { data: templateDetail } = useJournalTemplateDetail(
    selectedId || "",
    !!selectedId
  );

  const handleConfirm = async () => {
    if (!selectedId) return;
    await onSelectJournal(selectedId);
    setConfirmSuccess(true);
    setTimeout(() => setConfirmSuccess(false), 4000);
  };

  if (isLoading) {
    return (
      <div className="p-12 bg-white border border-[#e6e4dc] rounded-xl text-center text-xs text-[#6e6d68]">
        Loading journal standards...
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="p-12 bg-white border border-dashed border-[#e6e4dc] rounded-xl text-center space-y-3">
        <p className="text-xs text-[#c93b2b]">
          No active journal templates found.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3.5 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg"
        >
          Reload Guidelines
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 2-Column Layout: Templates List + Guidelines Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#e6e4dc] rounded-xl overflow-hidden shadow-sm">
        {/* Left Column: Journal List (5 of 12 cols) */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#e6e4dc]">
          <div className="p-4 bg-[#f5f3ec] border-b border-[#e6e4dc] text-xs font-semibold text-[#141413] flex justify-between items-center">
            <span>Available Journals ({templates.length})</span>
            <span className="text-[11px] text-[#6e6d68]">Standardized Profiles</span>
          </div>

          <div className="divide-y divide-[#e6e4dc]">
            {templates.map((tpl: JournalTemplate) => {
              const isSelected = selectedId === tpl.id;
              const isCurrentlyAssigned = currentJournalId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedId(tpl.id)}
                  className={`p-5 cursor-pointer transition-all flex justify-between items-start ${
                    isSelected
                      ? "bg-[#141413] text-white"
                      : "bg-white hover:bg-[#faf9f5] text-[#141413]"
                  }`}
                >
                  <div className="space-y-1.5 pr-4">
                    <div className="flex items-center gap-2">
                      <h2
                        className={`text-base font-semibold tracking-tight ${
                          isSelected ? "text-white" : "text-[#141413]"
                        }`}
                      >
                        {tpl.name}
                      </h2>
                    </div>

                    <p
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        isSelected ? "text-[#e6e4dc]" : "text-[#6e6d68]"
                      }`}
                    >
                      {tpl.description}
                    </p>

                    {isCurrentlyAssigned && (
                      <div className="pt-1">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-[#f0f7f2] text-[#1b6b37] border border-[#d2ead9]"
                          }`}
                        >
                          Currently Selected
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs shrink-0 pt-1">
                    {isSelected ? "●" : "○"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Requirements & Constraints Summary (7 of 12 cols) */}
        <div className="lg:col-span-7 bg-[#faf9f5] p-6 lg:p-8 space-y-6 flex flex-col justify-between">
          {templateDetail ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-[#e6e4dc] pb-4">
                <span className="text-[11px] font-semibold text-[#8c8b85] uppercase tracking-wider block mb-1">
                  Submission Guidelines
                </span>
                <h3 className="text-xl font-bold tracking-tight text-[#141413]">
                  {templateDetail.name} Requirements
                </h3>
                <p className="text-xs text-[#6e6d68] mt-1 leading-relaxed">
                  {templateDetail.description}
                </p>
              </div>

              {/* ── Key Word Limits ── */}
              <div>
                <span className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider block mb-2">
                  Word Limits
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Abstract cap */}
                  <div className="p-4 bg-white border border-[#e6e4dc] rounded-xl">
                    <div className="text-xs text-[#6e6d68]">
                      Abstract Limit
                    </div>
                    <div className="text-xl font-bold text-[#141413] mt-1">
                      {templateDetail.max_abstract_words != null
                        ? `${templateDetail.max_abstract_words.toLocaleString()} words`
                        : "No limit"}
                    </div>
                  </div>

                  {/* Main text cap */}
                  <div className="p-4 bg-white border border-[#e6e4dc] rounded-xl">
                    <div className="text-xs text-[#6e6d68]">
                      Main Text Limit
                    </div>
                    <div className="text-xl font-bold text-[#141413] mt-1">
                      {templateDetail.max_total_words != null
                        ? `${templateDetail.max_total_words.toLocaleString()} words`
                        : "No word limit"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Required Statements Checklist ── */}
              <div>
                <span className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider block mb-2">
                  Mandatory Statements
                </span>
                <div className="bg-white border border-[#e6e4dc] rounded-xl p-4 text-xs space-y-2.5">
                  {Object.entries(templateDetail.required_statements || {}).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="flex items-start gap-2.5 border-b border-[#f3f1ea] pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-[#141413] font-bold shrink-0">
                          •
                        </span>
                        <div>
                          <span className="font-semibold text-[#141413] capitalize">
                            {key.replace(/_/g, " ")}:
                          </span>{" "}
                          <span className="text-[#6e6d68]">
                            {String(val)}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ── Formatting & Reference Guidelines ── */}
              <div>
                <span className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider block mb-2">
                  Formatting & Citations
                </span>
                <div className="bg-white border border-[#e6e4dc] rounded-xl p-4 text-xs space-y-2 text-[#141413]">
                  <div>
                    <span className="text-[#6e6d68]">Citation Style:</span>{" "}
                    <span className="font-medium">
                      {String(
                        (templateDetail.reference_format as Record<string, unknown>)
                          ?.citation_style || "Standard"
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6e6d68]">Equations:</span>{" "}
                    <span>
                      {String(
                        (templateDetail.formatting_rules as Record<string, unknown>)
                          ?.equations || "Numbered sequentially"
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#6e6d68]">Line Numbers:</span>{" "}
                    <span>
                      {String(
                        (templateDetail.formatting_rules as Record<string, unknown>)
                          ?.line_numbers || "Per journal policy"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Automated Preflight Rules Preview ── */}
              {templateDetail.rules && templateDetail.rules.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider block mb-2">
                    Automated Compliance Checks ({templateDetail.rules.length})
                  </span>
                  <div className="bg-white border border-[#e6e4dc] rounded-xl divide-y divide-[#e6e4dc] overflow-hidden">
                    {templateDetail.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-[#141413]">
                            {rule.message}
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            rule.severity === "FAIL"
                              ? "bg-[#fdf2f2] text-[#c93b2b] border border-[#f5c6cb]"
                              : "bg-[#f5f3ec] text-[#6e6d68] border border-[#e6e4dc]"
                          }`}
                        >
                          {rule.severity === "FAIL" ? "Required" : "Recommended"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-[#6e6d68]">
              Select a journal on the left to review submission guidelines.
            </div>
          )}

          {/* Action CTA Row */}
          <div className="pt-6 border-t border-[#e6e4dc] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-[#1b6b37] font-medium">
              {confirmSuccess && "✓ Target journal saved to manuscript"}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !selectedId}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : "Select as Target Journal →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JournalSelector;
