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
      className={`border border-[#e6e4dc] bg-white rounded-xl overflow-hidden shadow-sm transition-all ${
        depth > 0 ? "ml-4 sm:ml-6 mt-3" : "mt-4"
      }`}
    >
      {/* Section Header Row */}
      <div className="p-3.5 bg-[#f5f3ec] border-b border-[#e6e4dc] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-5 h-5 flex items-center justify-center text-xs font-semibold text-[#6e6d68] hover:text-[#141413] border border-[#e6e4dc] bg-white rounded shrink-0"
          >
            {isExpanded ? "−" : "+"}
          </button>

          <span className="font-semibold text-xs text-[#141413] shrink-0">
            {numbering}
          </span>

          <input
            type="text"
            value={section.heading}
            onChange={(e) => handleHeadingChange(e.target.value)}
            placeholder="Section title (e.g. Methods, Results, Discussion)"
            className="flex-1 font-semibold text-xs bg-white px-2.5 py-1 border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413]"
          />

          <span className="text-[11px] text-[#6e6d68] shrink-0">
            Level {section.level}
          </span>
        </div>

        {/* Section Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              title="Move Up"
              className="px-2 py-0.5 border border-[#e6e4dc] bg-white hover:border-[#141413] rounded text-[#6e6d68]"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              title="Move Down"
              className="px-2 py-0.5 border border-[#e6e4dc] bg-white hover:border-[#141413] rounded text-[#6e6d68]"
            >
              ↓
            </button>
          )}
          <button
            type="button"
            onClick={handleAddChild}
            className="px-2.5 py-0.5 border border-[#e6e4dc] bg-white hover:bg-[#faf9f5] text-[#141413] rounded text-xs font-medium"
          >
            + Subsection
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Delete Section"
            className="px-2 py-0.5 border border-[#e6e4dc] bg-white hover:border-[#c93b2b] text-[#c93b2b] rounded text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Expanded Content Viewport */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-medium text-[#6e6d68]">
                Section Content
              </label>
              <span className="text-xs text-[#6e6d68] font-mono">
                {contentDraft.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={4}
              value={contentDraft}
              onChange={(e) => setContentDraft(e.target.value)}
              onBlur={handleContentBlur}
              placeholder="Enter section paragraphs (separate paragraphs with a blank line)..."
              className="w-full p-3 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] leading-relaxed"
            />
          </div>

          {/* Render Recursive Subsections */}
          {section.children && section.children.length > 0 && (
            <div className="border-t border-[#e6e4dc] pt-3">
              <div className="text-xs font-medium text-[#6e6d68] mb-1.5">
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
      heading: "New Section",
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
          <h3 className="text-sm font-semibold text-[#141413]">
            Document Sections ({sections.length})
          </h3>
          <p className="text-xs text-[#6e6d68]">
            Edit headings, body paragraphs, and structured subsections.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddTopLevel}
          className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          + Add Section
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="p-8 border border-dashed border-[#e6e4dc] bg-white rounded-xl text-center text-xs text-[#6e6d68]">
          No sections found. Click "+ Add Section" to create one.
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
