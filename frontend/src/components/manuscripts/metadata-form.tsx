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
    count += abstractWords;
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
    { id: "general", label: "Overview & Abstract" },
    { id: "authors", label: "Authors", count: authors.length },
    { id: "sections", label: "Sections", count: sections.length },
    { id: "references", label: "References", count: references.length },
    { id: "statements", label: "Disclosures & Grants" },
  ];

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* ── Editor Toolbar & Global Save CTA ─────────────────────────── */}
      <div className="sticky top-0 z-10 bg-[#faf9f5]/95 backdrop-blur border-b border-[#e6e4dc] py-3 flex flex-wrap justify-between items-center gap-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#f5f3ec] p-1 rounded-xl border border-[#e6e4dc]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white text-[#141413] shadow-sm font-semibold"
                    : "text-[#6e6d68] hover:text-[#141413]"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-[#f5f3ec] text-[#141413]" : "text-[#8c8b85]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Word Count & Primary Save CTA */}
        <div className="flex items-center gap-4">
          <div className="text-xs text-[#6e6d68]">
            Total word count:{" "}
            <span className="font-semibold text-[#141413]">
              {totalWordCount.toLocaleString()}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Tab 01: General ─────────────────────────────────────────── */}
      {activeTab === "general" && (
        <div className="space-y-6 bg-white border border-[#e6e4dc] rounded-xl p-6 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-[#141413] mb-1.5">
              Manuscript Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. End-to-End Convolutional Transformers for High-Resolution Medical Image Synthesis"
              className="w-full px-3.5 py-2.5 text-base font-semibold bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413]"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-medium text-[#141413]">
                Abstract *
              </label>
              <span className="text-xs text-[#6e6d68] font-mono">
                {abstractWords} words
              </span>
            </div>
            <textarea
              rows={8}
              required
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Enter manuscript abstract..."
              className="w-full p-3.5 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#141413] mb-1.5">
              Keywords (Press Enter or comma to add)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {keywords.map((kw, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#f5f3ec] border border-[#e6e4dc] rounded-lg text-xs text-[#141413]"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(idx)}
                    className="text-[#8c8b85] hover:text-[#c93b2b]"
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
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413]"
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
          <div className="bg-white border border-[#e6e4dc] rounded-xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-[#141413]">
                  Funding Sources & Grants
                </h3>
                <p className="text-xs text-[#6e6d68]">
                  Grants, fellowships, or institutional awards supporting this research.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddFunding}
                className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
              >
                + Add Grant
              </button>
            </div>

            {funding.length === 0 ? (
              <div className="p-6 border border-dashed border-[#e6e4dc] rounded-lg text-center text-xs text-[#6e6d68]">
                No specific grants or funding listed.
              </div>
            ) : (
              funding.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
                >
                  <div>
                    <label className="text-[#6e6d68] block mb-1 font-medium">
                      Funding Agency
                    </label>
                    <input
                      type="text"
                      value={item.funder}
                      onChange={(e) =>
                        handleUpdateFunding(idx, "funder", e.target.value)
                      }
                      placeholder="e.g. National Science Foundation"
                      className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[#6e6d68] block mb-1 font-medium">
                      Grant Number
                    </label>
                    <input
                      type="text"
                      value={item.grant_number || ""}
                      onChange={(e) =>
                        handleUpdateFunding(idx, "grant_number", e.target.value || null)
                      }
                      placeholder="e.g. NSF-2049182"
                      className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg font-mono"
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <label className="text-[#6e6d68] block mb-1 font-medium">
                        Recipient Author
                      </label>
                      <input
                        type="text"
                        value={item.recipient || ""}
                        onChange={(e) =>
                          handleUpdateFunding(idx, "recipient", e.target.value || null)
                        }
                        placeholder="Author name"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFunding(idx)}
                      className="px-2 py-1 border border-[#e6e4dc] hover:border-[#c93b2b] text-[#c93b2b] rounded"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Compliance statements */}
          <div className="bg-white border border-[#e6e4dc] rounded-xl p-6 space-y-4 shadow-sm">
            <div>
              <h3 className="text-sm font-semibold text-[#141413]">
                Disclosures & Statements
              </h3>
              <p className="text-xs text-[#6e6d68]">
                Required journal disclosure statements for peer review.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Competing Interests / Conflict of Interest
              </label>
              <textarea
                rows={2}
                value={coi}
                onChange={(e) => setCoi(e.target.value)}
                placeholder="The authors declare that they have no known competing financial interests..."
                className="w-full p-2.5 text-xs bg-white border border-[#e6e4dc] rounded-lg text-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Ethics & Institutional Review Board (IRB) Approval
              </label>
              <textarea
                rows={2}
                value={ethics}
                onChange={(e) => setEthics(e.target.value)}
                placeholder="All procedures were approved by the Institutional Ethics Committee under protocol #..."
                className="w-full p-2.5 text-xs bg-white border border-[#e6e4dc] rounded-lg text-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Data & Code Availability
              </label>
              <textarea
                rows={2}
                value={dataAvail}
                onChange={(e) => setDataAvail(e.target.value)}
                placeholder="The datasets generated and analyzed during the current study are available in the public repository..."
                className="w-full p-2.5 text-xs bg-white border border-[#e6e4dc] rounded-lg text-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Author Contributions
              </label>
              <textarea
                rows={2}
                value={authorContrib}
                onChange={(e) => setAuthorContrib(e.target.value)}
                placeholder="Conceptualization: J.D., M.S.; Methodology: J.D.; Writing and editing: all authors."
                className="w-full p-2.5 text-xs bg-white border border-[#e6e4dc] rounded-lg text-[#141413]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Acknowledgements
              </label>
              <textarea
                rows={2}
                value={acknowledgements}
                onChange={(e) => setAcknowledgements(e.target.value)}
                placeholder="The authors acknowledge the high-performance computing cluster facility for computational resources..."
                className="w-full p-2.5 text-xs bg-white border border-[#e6e4dc] rounded-lg text-[#141413]"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

export default MetadataForm;
