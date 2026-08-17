"use client";

// src/components/journals/journal-selector.tsx
// Swiss International Typographic Style journal selector with rule & constraint summary panel

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
      <div className="p-12 border border-[#E0E0E0] bg-white text-center font-mono text-xs text-[#707070]">
        [ QUERYING ACTIVE TARGET JOURNAL STANDARDS... ]
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="p-12 border border-dashed border-[#E0E0E0] bg-white text-center space-y-3">
        <div className="font-mono text-xs text-[#D0021B]">
          [ NO ACTIVE JOURNAL TEMPLATES FOUND ]
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="px-3 py-1 bg-[#111111] text-white text-xs font-mono uppercase"
        >
          [ RELOAD TEMPLATES ]
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 2-Column Swiss Layout: Templates List + Constraints Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-[#E0E0E0] bg-white">
        {/* Left Column: Flush-Left Template List (5 of 12 cols) */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#E0E0E0]">
          <div className="p-4 bg-[#F5F5F5] border-b border-[#E0E0E0] font-mono text-xs font-bold text-[#111111] uppercase tracking-wider flex justify-between items-center">
            <span>[ 01 · TARGET JOURNALS ({templates.length}) ]</span>
            <span className="text-[10px] text-[#707070]">STANDARDS v1</span>
          </div>

          <div className="divide-y divide-[#E0E0E0]">
            {templates.map((tpl: JournalTemplate, idx: number) => {
              const isSelected = selectedId === tpl.id;
              const isCurrentlyAssigned = currentJournalId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedId(tpl.id)}
                  className={`p-5 cursor-pointer transition-all flex justify-between items-start ${
                    isSelected
                      ? "bg-[#111111] text-[#FAFAFA]"
                      : "bg-white hover:bg-[#FAFAFA] text-[#111111]"
                  }`}
                >
                  <div className="space-y-1 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      <h2
                        className={`text-base font-bold tracking-tight ${
                          isSelected ? "text-[#FAFAFA]" : "text-[#111111]"
                        }`}
                      >
                        {tpl.name}
                      </h2>
                    </div>

                    <div
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        isSelected ? "text-[#E0E0E0]" : "text-[#707070]"
                      }`}
                    >
                      {tpl.description}
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2 font-mono text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 border ${
                          isSelected
                            ? "border-[#444444] bg-[#222222] text-[#FAFAFA]"
                            : "border-[#E0E0E0] bg-[#F5F5F5] text-[#707070]"
                        }`}
                      >
                        SLUG: {tpl.slug}
                      </span>
                      {isCurrentlyAssigned && (
                        <span
                          className={`px-1.5 py-0.5 font-bold ${
                            isSelected
                              ? "bg-[#D0021B] text-white"
                              : "border border-[#D0021B] text-[#D0021B]"
                          }`}
                        >
                          [ ASSIGNED ]
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="font-mono text-xs shrink-0 pt-1">
                    {isSelected ? "●" : "○"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Specification & Constraints Summary (7 of 12 cols) */}
        <div className="lg:col-span-7 bg-[#FAFAFA] p-6 lg:p-8 space-y-6 flex flex-col justify-between">
          {templateDetail ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b border-[#E0E0E0] pb-4">
                <div className="font-mono text-[10px] text-[#707070] uppercase tracking-widest mb-1">
                  SPECIFICATION SUMMARY // {templateDetail.slug.toUpperCase()}
                </div>
                <h3 className="text-xl font-bold tracking-tight text-[#111111]">
                  {templateDetail.name} Submission Constraints
                </h3>
                <p className="text-xs text-[#707070] mt-1 leading-relaxed">
                  {templateDetail.description}
                </p>
              </div>

              {/* ── Key Word Limits (Monospace Numeric Treatment) ── */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#707070] mb-2">
                  WORD LIMIT CONSTRAINTS
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {/* Abstract cap */}
                  <div className="p-3 bg-white border border-[#E0E0E0]">
                    <div className="text-[10px] font-mono text-[#707070] uppercase">
                      MAX ABSTRACT WORDS
                    </div>
                    <div className="text-xl font-mono font-bold text-[#111111] mt-0.5">
                      {templateDetail.max_abstract_words !== null
                        ? `${templateDetail.max_abstract_words.toLocaleString()} words`
                        : "No word limit"}
                    </div>
                  </div>

                  {/* Main text cap (Explicit 'No word limit' for PLOS ONE) */}
                  <div className="p-3 bg-white border border-[#E0E0E0]">
                    <div className="text-[10px] font-mono text-[#707070] uppercase">
                      MAX MAIN TEXT WORDS
                    </div>
                    <div className="text-xl font-mono font-bold text-[#111111] mt-0.5">
                      {templateDetail.max_total_words !== null
                        ? `${templateDetail.max_total_words.toLocaleString()} words`
                        : "No word limit"}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Required Statements Checklist ── */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#707070] mb-2">
                  MANDATORY DISCLOSURE STATEMENTS
                </div>
                <div className="bg-white border border-[#E0E0E0] p-3 text-xs space-y-2 font-mono">
                  {Object.entries(templateDetail.required_statements || {}).map(
                    ([key, val]) => (
                      <div
                        key={key}
                        className="flex items-start gap-2 border-b border-[#F0F0F0] pb-1.5 last:border-0 last:pb-0"
                      >
                        <span className="text-[#D0021B] font-bold shrink-0">
                          [!]
                        </span>
                        <div>
                          <span className="font-bold text-[#111111] uppercase">
                            {key.replace(/_/g, " ")}:
                          </span>{" "}
                          <span className="text-[#707070] font-sans text-xs">
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
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#707070] mb-2">
                  FORMATTING & CITATIONS SPECIFICATION
                </div>
                <div className="bg-white border border-[#E0E0E0] p-3 text-xs space-y-1.5 font-mono text-[11px] text-[#111111]">
                  <div>
                    <span className="text-[#707070]">CITATION STYLE:</span>{" "}
                    {String(
                      (templateDetail.reference_format as Record<string, unknown>)
                        ?.citation_style || "Standard"
                    )}
                  </div>
                  <div>
                    <span className="text-[#707070]">EQUATIONS:</span>{" "}
                    <span className="font-sans">
                      {String(
                        (templateDetail.formatting_rules as Record<string, unknown>)
                          ?.equations || "Numbered sequentially"
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#707070]">LINE NUMBERS:</span>{" "}
                    <span className="font-sans">
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
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#707070] mb-2">
                    MODULE 7 PREFLIGHT VALIDATION CHECKS ({templateDetail.rules.length})
                  </div>
                  <div className="border border-[#E0E0E0] bg-white divide-y divide-[#E0E0E0]">
                    {templateDetail.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-2.5 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono text-[10px] text-[#707070]">
                            KEY: {rule.rule_key} ({rule.rule_type})
                          </div>
                          <div className="text-[#111111] text-xs">
                            {rule.message}
                          </div>
                        </div>

                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 shrink-0 ${
                            rule.severity === "FAIL"
                              ? "bg-[#D0021B] text-white"
                              : "bg-[#F0F0F0] border border-[#E0E0E0] text-[#111111]"
                          }`}
                        >
                          [{rule.severity}]
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 font-mono text-xs text-[#707070]">
              [ SELECT A JOURNAL TO INSPECT CONSTRAINTS ]
            </div>
          )}

          {/* Action CTA Row */}
          <div className="pt-6 border-t border-[#E0E0E0] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs font-mono text-[#707070]">
              {confirmSuccess && (
                <span className="text-[#111111] font-bold">
                  [ ✓ TARGET JOURNAL PERSISTED TO MANUSCRIPT ]
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving || !selectedId}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#D0021B] hover:bg-[#B00217] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {isSaving
                ? "[ ASSIGNING TARGET JOURNAL... ]"
                : "[ CONFIRM TARGET JOURNAL → ]"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JournalSelector;
