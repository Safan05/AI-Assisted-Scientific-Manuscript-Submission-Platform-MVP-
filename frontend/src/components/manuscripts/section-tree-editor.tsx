"use client";

// src/components/manuscripts/section-tree-editor.tsx
// Recursive tree editor for SectionNode hierarchy with academic numbering (1, 1.1, 1.2...)

import React, { useState } from "react";
import type { SectionNode } from "@/lib/types";

interface SectionTreeEditorProps {
  sections: SectionNode[];
  onChangeSections: (sections: SectionNode[]) => void;
}

interface SectionItemProps {
  section: SectionNode;
  numbering: string;
  depth: number;
  onUpdate: (updated: SectionNode) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function SectionItem({
  section,
  numbering,
  depth,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: SectionItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [contentDraft, setContentDraft] = useState(section.content.join("\n\n"));

  const handleHeadingChange = (heading: string) => {
    onUpdate({ ...section, heading });
  };

  const handleContentBlur = () => {
    const splitContent = contentDraft
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    onUpdate({ ...section, content: splitContent });
  };

  const handleAddChild = () => {
    const newChild: SectionNode = {
      heading: "New Subsection",
      level: Math.min(section.level + 1, 6),
      content: [],
      children: [],
    };
    onUpdate({
      ...section,
      children: [...section.children, newChild],
    });
    setIsExpanded(true);
  };

  const handleUpdateChild = (childIdx: number, updatedChild: SectionNode) => {
    const newChildren = [...section.children];
    newChildren[childIdx] = updatedChild;
    onUpdate({ ...section, children: newChildren });
  };

  const handleDeleteChild = (childIdx: number) => {
    const newChildren = section.children.filter((_, i) => i !== childIdx);
    onUpdate({ ...section, children: newChildren });
  };

  const handleMoveChild = (childIdx: number, direction: "up" | "down") => {
    if (
      (direction === "up" && childIdx === 0) ||
      (direction === "down" && childIdx === section.children.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? childIdx - 1 : childIdx + 1;
    const newChildren = [...section.children];
    const temp = newChildren[childIdx];
    newChildren[childIdx] = newChildren[targetIdx];
    newChildren[targetIdx] = temp;
    onUpdate({ ...section, children: newChildren });
  };

  return (
    <div
      className={`border border-[#E0E0E0] bg-white transition-all ${
        depth > 0 ? "ml-4 sm:ml-6 mt-3" : "mt-4"
      }`}
    >
      {/* Section Header Row */}
      <div className="p-3.5 bg-[#F5F5F5] border-b border-[#E0E0E0] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center font-mono text-xs text-[#707070] hover:text-[#111111] border border-[#E0E0E0] bg-white shrink-0"
          >
            {isExpanded ? "−" : "+"}
          </button>

          <span className="font-mono text-xs font-bold text-[#111111] shrink-0">
            {numbering}
          </span>

          <input
            type="text"
            value={section.heading}
            onChange={(e) => handleHeadingChange(e.target.value)}
            placeholder="Section Heading (e.g. 2. Methods and Experimental Setup)"
            className="flex-1 font-bold text-xs bg-white px-2 py-1 border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111]"
          />

          <span className="font-mono text-[10px] text-[#707070] shrink-0 uppercase">
            LVL {section.level}
          </span>
        </div>

        {/* Section Action Controls */}
        <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              title="Move Up"
              className="px-2 py-0.5 border border-[#E0E0E0] bg-white hover:border-[#111111] text-[#707070]"
            >
              ▲
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              title="Move Down"
              className="px-2 py-0.5 border border-[#E0E0E0] bg-white hover:border-[#111111] text-[#707070]"
            >
              ▼
            </button>
          )}
          <button
            type="button"
            onClick={handleAddChild}
            className="px-2 py-0.5 border border-[#111111] bg-white hover:bg-[#111111] hover:text-white text-[#111111] uppercase tracking-wider text-[10px]"
          >
            + SUBSECTION
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete Section"
            className="px-2 py-0.5 border border-[#E0E0E0] bg-white hover:border-[#D0021B] text-[#D0021B] text-[10px]"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded Content Viewport */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono uppercase text-[#707070] tracking-wider">
                Section Paragraphs & Markdown Tables
              </label>
              <span className="font-mono text-[10px] text-[#707070]">
                {contentDraft.split(/\s+/).filter(Boolean).length} WORDS
              </span>
            </div>
            <textarea
              rows={4}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              onBlur={handleContentBlur}
              placeholder="Enter or edit body paragraphs (separate paragraphs with blank lines)..."
              className="w-full p-2.5 text-xs bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] font-sans leading-relaxed"
            />
          </div>

          {/* Render Recursive Subsections */}
          {section.children && section.children.length > 0 && (
            <div className="border-t border-[#E0E0E0] pt-2">
              <div className="text-[10px] font-mono uppercase text-[#707070] tracking-wider mb-1">
                Subsections of {numbering}
              </div>
              {section.children.map((child, idx) => (
                <SectionItem
                  key={idx}
                  section={child}
                  numbering={`${numbering}.${idx + 1}`}
                  depth={depth + 1}
                  onUpdate={(updated) => handleUpdateChild(idx, updated)}
                  onDelete={() => handleDeleteChild(idx)}
                  onMoveUp={idx > 0 ? () => handleMoveChild(idx, "up") : undefined}
                  onMoveDown={
                    idx < section.children.length - 1
                      ? () => handleMoveChild(idx, "down")
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SectionTreeEditor({
  sections,
  onChangeSections,
}: SectionTreeEditorProps) {
  const handleAddTopLevel = () => {
    const newSection: SectionNode = {
      heading: "New Top-Level Section",
      level: 1,
      content: [],
      children: [],
    };
    onChangeSections([...sections, newSection]);
  };

  const handleUpdateTopLevel = (idx: number, updated: SectionNode) => {
    const newSections = [...sections];
    newSections[idx] = updated;
    onChangeSections(newSections);
  };

  const handleDeleteTopLevel = (idx: number) => {
    const newSections = sections.filter((_, i) => i !== idx);
    onChangeSections(newSections);
  };

  const handleMoveTopLevel = (idx: number, direction: "up" | "down") => {
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === sections.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    const newSections = [...sections];
    const temp = newSections[idx];
    newSections[idx] = newSections[targetIdx];
    newSections[targetIdx] = temp;
    onChangeSections(newSections);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
            [ 03 · DOCUMENT SECTION HIERARCHY ]
          </span>
          <span className="ml-3 text-xs text-[#707070]">
            Parsed body sections and subsections ({sections.length})
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddTopLevel}
          className="px-3 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] text-[11px] font-mono uppercase tracking-wider transition-colors"
        >
          + ADD TOP-LEVEL SECTION
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="p-8 border border-dashed border-[#E0E0E0] bg-white text-center font-mono text-xs text-[#707070]">
          [ NO SECTIONS EXTRACTED — CLICK "+ ADD TOP-LEVEL SECTION" ]
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section, idx) => (
            <SectionItem
              key={idx}
              section={section}
              numbering={String(idx + 1)}
              depth={0}
              onUpdate={(updated) => handleUpdateTopLevel(idx, updated)}
              onDelete={() => handleDeleteTopLevel(idx)}
              onMoveUp={idx > 0 ? () => handleMoveTopLevel(idx, "up") : undefined}
              onMoveDown={
                idx < sections.length - 1
                  ? () => handleMoveTopLevel(idx, "down")
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SectionTreeEditor;
