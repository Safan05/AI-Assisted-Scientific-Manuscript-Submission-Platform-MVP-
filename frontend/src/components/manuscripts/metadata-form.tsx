"use client";

// src/components/manuscripts/metadata-form.tsx
// Unified metadata editor aggregating flat fields, authors, recursive sections, citations & statements

import React, { useState, useMemo } from "react";
import type {
  ManuscriptIR,
  Author,
  Affiliation,
  CorrespondingAuthor,
  SectionNode,
  Reference,
  FundingSource,
} from "@/lib/types";
import AuthorTable from "./author-table";
import SectionTreeEditor from "./section-tree-editor";
import ReferenceListEditor from "./reference-list-editor";

interface MetadataFormProps {
  initialIR: ManuscriptIR;
  onSave: (updatedIR: ManuscriptIR) => Promise<void>;
  isSaving: boolean;
}

type TabType = "general" | "authors" | "sections" | "references" | "statements";

export function MetadataForm({
  initialIR,
  onSave,
  isSaving,
}: MetadataFormProps) {
  // Main form state
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [title, setTitle] = useState(initialIR.title || "");
  const [abstract, setAbstract] = useState(initialIR.abstract || "");
  const [keywords, setKeywords] = useState<string[]>(initialIR.keywords || []);
  const [keywordInput, setKeywordInput] = useState("");
  const [authors, setAuthors] = useState<Author[]>(initialIR.authors || []);
  const [affiliations, setAffiliations] = useState<Affiliation[]>(
    initialIR.affiliations || []
  );
  const [correspondingAuthor, setCorrespondingAuthor] =
    useState<CorrespondingAuthor | null>(initialIR.corresponding_author || null);
  const [sections, setSections] = useState<SectionNode[]>(
    initialIR.sections || []
  );
  const [references, setReferences] = useState<Reference[]>(
    initialIR.references || []
  );
  const [funding, setFunding] = useState<FundingSource[]>(
    initialIR.funding || []
  );
  const [coi, setCoi] = useState(initialIR.conflict_of_interest || "");
  const [ethics, setEthics] = useState(initialIR.ethics_statement || "");
  const [dataAvail, setDataAvail] = useState(initialIR.data_availability || "");
  const [authorContrib, setAuthorContrib] = useState(
    initialIR.author_contributions || ""
  );
  const [acknowledgements, setAcknowledgements] = useState(
    initialIR.acknowledgements || ""
  );

  // Live word counts
  const abstractWords = useMemo(() => {
    return abstract.trim() ? abstract.trim().split(/\s+/).length : 0;
  }, [abstract]);

  const totalWordCount = useMemo(() => {
    let count = 0;
    // Abstract
    count += abstractWords;
    // Sections recursive
    function countSections(nodes: SectionNode[]) {
      for (const node of nodes) {
        for (const p of node.content) {
          count += p.trim().split(/\s+/).filter(Boolean).length;
        }
        if (node.children) countSections(node.children);
      }
    }
    countSections(sections);
    return count;
  }, [abstractWords, sections]);

  // ── Keywords management ────────────────────────────────────────────
  const handleAddKeyword = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = keywordInput.trim().replace(/^[,\s]+|[,\s]+$/g, "");
      if (val && !keywords.includes(val)) {
        setKeywords([...keywords, val]);
        setKeywordInput("");
      }
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  // ── Funding management ─────────────────────────────────────────────
  const handleAddFunding = () => {
    setFunding([...funding, { funder: "", grant_number: null, recipient: null }]);
  };

  const handleUpdateFunding = (
    index: number,
    field: keyof FundingSource,
    value: string | null
  ) => {
    const updated = [...funding];
    updated[index] = { ...updated[index], [field]: value };
    setFunding(updated);
  };

  const handleRemoveFunding = (index: number) => {
    setFunding(funding.filter((_, i) => i !== index));
  };

  // ── Submit save ───────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedIR: ManuscriptIR = {
      title,
      abstract,
      keywords,
      authors,
      affiliations,
      corresponding_author: correspondingAuthor,
      sections,
      references,
      funding,
      conflict_of_interest: coi || null,
      ethics_statement: ethics || null,
      data_availability: dataAvail || null,
      author_contributions: authorContrib || null,
      acknowledgements: acknowledgements || null,
      word_count: totalWordCount,
    };
    await onSave(updatedIR);
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "general", label: "01 · GENERAL" },
    { id: "authors", label: "02 · AUTHORS & AFFILIATIONS", count: authors.length },
    { id: "sections", label: "03 · SECTIONS", count: sections.length },
    { id: "references", label: "04 · CITATIONS", count: references.length },
    { id: "statements", label: "05 · STATEMENTS & FUNDING" },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Editor Toolbar & Global Save CTA ─────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#FAFAFA] border-b border-[#E0E0E0] py-3 flex flex-wrap justify-between items-center gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 text-xs font-mono tracking-wider transition-colors ${
                  isActive
                    ? "bg-[#111111] text-[#FAFAFA] font-bold"
                    : "bg-white border border-[#E0E0E0] text-[#707070] hover:text-[#111111] hover:border-[#111111]"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-2 text-[10px] ${
                      isActive ? "text-[#E0E0E0]" : "text-[#707070]"
                    }`}
                  >
                    [{tab.count}]
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Word Count & Primary Save CTA */}
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs text-[#707070]">
            LIVE TOTAL:{" "}
            <span className="font-bold text-[#111111]">
              {totalWordCount.toLocaleString()}
            </span>{" "}
            WORDS
          </div>

          {/* THE SIGNATURE SIGNAL RED PRIMARY BUTTON */}
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 bg-[#D0021B] hover:bg-[#B00217] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {isSaving ? "[ SAVING CHANGES... ]" : "[ SAVE & COMMIT IR → ]"}
          </button>
        </div>
      </div>

      {/* ── Tab 01: General ─────────────────────────────────────────── */}
      {activeTab === "general" && (
        <div className="space-y-6 bg-white border border-[#E0E0E0] p-6">
          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-2">
              Manuscript Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End-to-End Convolutional Transformers for High-Resolution Medical Image Synthesis"
              className="w-full px-3 py-2.5 text-base font-bold bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070]">
                Abstract *
              </label>
              <span className="font-mono text-[11px] text-[#707070]">
                {abstractWords} WORDS
              </span>
            </div>
            <textarea
              rows={8}
              required
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Enter comprehensive manuscript abstract..."
              className="w-full p-3 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] font-sans leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-2">
              Keywords (Press Enter or Comma to Add)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#F5F5F5] border border-[#E0E0E0] text-xs font-mono text-[#111111]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(idx)}
                    className="text-[#707070] hover:text-[#D0021B]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleAddKeyword}
              placeholder="Type keyword and press Enter..."
              className="w-full px-3 py-2 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111]"
            />
          </div>
        </div>
      )}

      {/* ── Tab 02: Authors & Affiliations ──────────────────────────── */}
      {activeTab === "authors" && (
        <AuthorTable
          authors={authors}
          affiliations={affiliations}
          correspondingAuthor={correspondingAuthor}
          onChangeAuthors={setAuthors}
          onChangeAffiliations={setAffiliations}
          onChangeCorresponding={setCorrespondingAuthor}
        />
      )}

      {/* ── Tab 03: Section Tree ────────────────────────────────────── */}
      {activeTab === "sections" && (
        <SectionTreeEditor
          sections={sections}
          onChangeSections={setSections}
        />
      )}

      {/* ── Tab 04: References ──────────────────────────────────────── */}
      {activeTab === "references" && (
        <ReferenceListEditor
          references={references}
          onChangeReferences={setReferences}
        />
      )}

      {/* ── Tab 05: Statements & Funding ────────────────────────────── */}
      {activeTab === "statements" && (
        <div className="space-y-6">
          {/* Funding sources */}
          <div className="bg-white border border-[#E0E0E0] p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
                [ FUNDING SOURCES & GRANTS ]
              </span>
              <button
                type="button"
                onClick={handleAddFunding}
                className="px-3 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] text-[11px] font-mono uppercase tracking-wider"
              >
                + ADD FUNDER
              </button>
            </div>

            {funding.length === 0 ? (
              <div className="p-4 border border-dashed border-[#E0E0E0] text-center font-mono text-xs text-[#707070]">
                No specific grants or funding listed.
              </div>
            ) : (
              funding.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#FAFAFA] border border-[#E0E0E0] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
                >
                  <div>
                    <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                      Funder / Agency Name
                    </label>
                    <input
                      type="text"
                      value={item.funder}
                      onChange={(e) =>
                        handleUpdateFunding(idx, "funder", e.target.value)
                      }
                      placeholder="National Institutes of Health (NIH)"
                      className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                      Grant / Contract Number
                    </label>
                    <input
                      type="text"
                      value={item.grant_number || ""}
                      onChange={(e) =>
                        handleUpdateFunding(idx, "grant_number", e.target.value || null)
                      }
                      placeholder="R01-EB029384"
                      className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] font-mono"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-mono text-[#707070] uppercase block mb-1">
                        Recipient Author
                      </label>
                      <input
                        type="text"
                        value={item.recipient || ""}
                        onChange={(e) =>
                          handleUpdateFunding(idx, "recipient", e.target.value || null)
                        }
                        placeholder="J. Doe"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFunding(idx)}
                      className="px-2 py-1 border border-[#E0E0E0] hover:border-[#D0021B] text-[#D0021B] font-mono text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Compliance statements */}
          <div className="bg-white border border-[#E0E0E0] p-6 space-y-4">
            <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider block">
              [ COMPLIANCE & ETHICAL STATEMENTS ]
            </span>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-1">
                Conflict of Interest Statement
              </label>
              <textarea
                rows={2}
                value={coi}
                onChange={(e) => setCoi(e.target.value)}
                placeholder="The authors declare no competing financial or non-financial interests..."
                className="w-full p-2.5 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-1">
                Ethics & Institutional Review Board (IRB) Statement
              </label>
              <textarea
                rows={2}
                value={ethics}
                onChange={(e) => setEthics(e.target.value)}
                placeholder="This study was approved by the Institutional Review Board under protocol #..."
                className="w-full p-2.5 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-1">
                Data & Code Availability
              </label>
              <textarea
                rows={2}
                value={dataAvail}
                onChange={(e) => setDataAvail(e.target.value)}
                placeholder="The dataset and code generated during the current study are available on GitHub / Zenodo..."
                className="w-full p-2.5 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-1">
                Author Contributions (CRediT)
              </label>
              <textarea
                rows={2}
                value={authorContrib}
                onChange={(e) => setAuthorContrib(e.target.value)}
                placeholder="Conceptualization: J.D., M.S.; Methodology: J.D.; Writing: all authors..."
                className="w-full p-2.5 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold uppercase tracking-wider text-[#707070] mb-1">
                Acknowledgements
              </label>
              <textarea
                rows={2}
                value={acknowledgements}
                onChange={(e) => setAcknowledgements(e.target.value)}
                placeholder="We thank the supercomputing cluster facility for compute allocation..."
                className="w-full p-2.5 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111]"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default MetadataForm;
