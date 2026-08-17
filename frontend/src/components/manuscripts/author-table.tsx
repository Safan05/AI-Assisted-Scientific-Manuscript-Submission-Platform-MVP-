"use client";

// src/components/manuscripts/author-table.tsx
import React from "react";
import type { Author, Affiliation, CorrespondingAuthor } from "@/lib/types";

interface AuthorTableProps {
  authors: Author[];
  affiliations: Affiliation[];
  correspondingAuthor: CorrespondingAuthor | null;
  onChangeAuthors: (authors: Author[]) => void;
  onChangeAffiliations: (affiliations: Affiliation[]) => void;
  onChangeCorresponding: (corr: CorrespondingAuthor | null) => void;
}

export function AuthorTable({
  authors,
  affiliations,
  correspondingAuthor,
  onChangeAuthors,
  onChangeAffiliations,
  onChangeCorresponding,
}: AuthorTableProps) {
  // ── Author handlers ────────────────────────────────────────────────
  const handleAddAuthor = () => {
    const newAuthor: Author = {
      given_name: "",
      surname: "",
      email: null,
      orcid: null,
      is_corresponding: authors.length === 0,
      affiliation_indices: affiliations.length > 0 ? [1] : [],
    };
    onChangeAuthors([...authors, newAuthor]);
  };

  const handleUpdateAuthor = (index: number, field: keyof Author, value: unknown) => {
    const updated = [...authors];
    updated[index] = { ...updated[index], [field]: value };

    // If marked as corresponding, update corresponding author field
    if (field === "is_corresponding") {
      if (value === true) {
        // Set only this author as corresponding
        updated.forEach((a, i) => {
          if (i !== index) a.is_corresponding = false;
        });
        const current = updated[index];
        onChangeCorresponding({
          full_name: `${current.given_name} ${current.surname}`.trim(),
          email: current.email || "",
          affiliation: null,
          phone: null,
        });
      }
    }

    onChangeAuthors(updated);
  };

  const handleRemoveAuthor = (index: number) => {
    const updated = authors.filter((_, i) => i !== index);
    onChangeAuthors(updated);
  };

  const handleMoveAuthor = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === authors.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...authors];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onChangeAuthors(updated);
  };

  // ── Affiliation handlers ───────────────────────────────────────────
  const handleAddAffiliation = () => {
    const newIndex = affiliations.length + 1;
    const newAffil: Affiliation = {
      index: newIndex,
      institution: "",
      department: null,
      city: null,
      country: null,
    };
    onChangeAffiliations([...affiliations, newAffil]);
  };

  const handleUpdateAffiliation = (
    index: number,
    field: keyof Affiliation,
    value: unknown
  ) => {
    const updated = [...affiliations];
    updated[index] = { ...updated[index], [field]: value };
    onChangeAffiliations(updated);
  };

  const handleRemoveAffiliation = (index: number) => {
    const removedIndex = affiliations[index].index;
    const updated = affiliations
      .filter((_, i) => i !== index)
      .map((a, i) => ({ ...a, index: i + 1 }));

    onChangeAffiliations(updated);

    // Re-index authors' affiliation indices
    const updatedAuthors = authors.map((author) => ({
      ...author,
      affiliation_indices: author.affiliation_indices
        .filter((idx) => idx !== removedIndex)
        .map((idx) => (idx > removedIndex ? idx - 1 : idx)),
    }));
    onChangeAuthors(updatedAuthors);
  };

  return (
    <div className="space-y-8">
      {/* ── Authors Section ─────────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
              [ 01 · AUTHORS LIST ]
            </span>
            <span className="ml-3 text-xs text-[#707070]">
              Ordered contributor sequence ({authors.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddAuthor}
            className="px-3 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] text-[11px] font-mono uppercase tracking-wider transition-colors"
          >
            + ADD AUTHOR
          </button>
        </div>

        <div className="border border-[#E0E0E0] bg-white overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-[#F5F5F5] font-mono text-[11px] text-[#707070] uppercase">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Given Name</th>
                <th className="py-2.5 px-3">Surname</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">ORCID ID</th>
                <th className="py-2.5 px-3 w-28 text-center">Affiliations</th>
                <th className="py-2.5 px-3 w-28 text-center">Corresponding</th>
                <th className="py-2.5 px-3 w-24 text-right">Order / Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {authors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center font-mono text-[#707070]">
                    [ NO AUTHORS REGISTERED — CLICK "+ ADD AUTHOR" ]
                  </td>
                </tr>
              ) : (
                authors.map((author, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFA]">
                    <td className="py-2.5 px-3 font-mono text-center text-[#707070]">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={author.given_name}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "given_name", e.target.value)
                        }
                        placeholder="John"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={author.surname}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "surname", e.target.value)
                        }
                        placeholder="Smith"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="email"
                        value={author.email || ""}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "email", e.target.value || null)
                        }
                        placeholder="j.smith@univ.edu"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs font-mono focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={author.orcid || ""}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "orcid", e.target.value || null)
                        }
                        placeholder="0000-0002-1825-0097"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs font-mono focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="text"
                        value={author.affiliation_indices.join(", ")}
                        onChange={(e) => {
                          const indices = e.target.value
                            .split(",")
                            .map((s) => parseInt(s.trim(), 10))
                            .filter((n) => !isNaN(n));
                          handleUpdateAuthor(idx, "affiliation_indices", indices);
                        }}
                        placeholder="1, 2"
                        className="w-16 px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs font-mono text-center focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={author.is_corresponding}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "is_corresponding", e.target.checked)
                        }
                        className="cursor-pointer accent-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1 font-mono">
                      <button
                        type="button"
                        onClick={() => handleMoveAuthor(idx, "up")}
                        disabled={idx === 0}
                        className="px-1.5 py-0.5 border border-[#E0E0E0] hover:border-[#111111] disabled:opacity-30 text-[10px]"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAuthor(idx, "down")}
                        disabled={idx === authors.length - 1}
                        className="px-1.5 py-0.5 border border-[#E0E0E0] hover:border-[#111111] disabled:opacity-30 text-[10px]"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAuthor(idx)}
                        className="px-1.5 py-0.5 border border-[#E0E0E0] hover:border-[#D0021B] text-[#D0021B] text-[10px]"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Affiliations Section ────────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
              [ 02 · INSTITUTIONAL AFFILIATIONS ]
            </span>
            <span className="ml-3 text-xs text-[#707070]">
              Indexed affiliations referenced by authors ({affiliations.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddAffiliation}
            className="px-3 py-1 bg-white border border-[#111111] hover:bg-[#111111] hover:text-white text-[#111111] text-[11px] font-mono uppercase tracking-wider transition-colors"
          >
            + ADD AFFILIATION
          </button>
        </div>

        <div className="border border-[#E0E0E0] bg-white overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-[#F5F5F5] font-mono text-[11px] text-[#707070] uppercase">
                <th className="py-2.5 px-3 w-16 text-center">Index</th>
                <th className="py-2.5 px-3">Institution / University *</th>
                <th className="py-2.5 px-3">Department / Division</th>
                <th className="py-2.5 px-3">City / State</th>
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3 w-16 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {affiliations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center font-mono text-[#707070]">
                    [ NO AFFILIATIONS REGISTERED — CLICK "+ ADD AFFILIATION" ]
                  </td>
                </tr>
              ) : (
                affiliations.map((affil, idx) => (
                  <tr key={idx} className="hover:bg-[#FAFAFA]">
                    <td className="py-2.5 px-3 font-mono text-center font-bold text-[#111111]">
                      [{affil.index}]
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.institution}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "institution", e.target.value)
                        }
                        placeholder="Harvard Medical School"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.department || ""}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "department", e.target.value || null)
                        }
                        placeholder="Department of Radiology"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.city || ""}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "city", e.target.value || null)
                        }
                        placeholder="Boston, MA"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.country || ""}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "country", e.target.value || null)
                        }
                        placeholder="USA"
                        className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs focus:border-[#111111]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <button
                        type="button"
                        onClick={() => handleRemoveAffiliation(idx)}
                        className="px-2 py-0.5 border border-[#E0E0E0] hover:border-[#D0021B] text-[#D0021B] text-[10px]"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Corresponding Author Metadata ──────────────────────────── */}
      {correspondingAuthor && (
        <div className="border border-[#E0E0E0] bg-[#F5F5F5] p-4">
          <div className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
            [ CORRESPONDING AUTHOR DETAILS ]
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-mono text-[10px] text-[#707070] uppercase block mb-1">
                Name
              </span>
              <input
                type="text"
                value={correspondingAuthor.full_name}
                onChange={(e) =>
                  onChangeCorresponding({
                    ...correspondingAuthor,
                    full_name: e.target.value,
                  })
                }
                className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs"
              />
            </div>
            <div>
              <span className="font-mono text-[10px] text-[#707070] uppercase block mb-1">
                Direct Contact Email
              </span>
              <input
                type="email"
                value={correspondingAuthor.email}
                onChange={(e) =>
                  onChangeCorresponding({
                    ...correspondingAuthor,
                    email: e.target.value,
                  })
                }
                className="w-full px-2 py-1 bg-white border border-[#E0E0E0] rounded-[2px] text-xs font-mono"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorTable;
