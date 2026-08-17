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
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-[#141413]">
              Authors & Contributors ({authors.length})
            </h3>
            <p className="text-xs text-[#6e6d68]">
              Ordered sequence of authors as they will appear on the title page.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddAuthor}
            className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            + Add Author
          </button>
        </div>

        <div className="bg-white border border-[#e6e4dc] rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4dc] bg-[#f5f3ec] text-[#6e6d68] font-medium">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">First Name</th>
                <th className="py-2.5 px-3">Last Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">ORCID</th>
                <th className="py-2.5 px-3 w-24 text-center">Affiliation #</th>
                <th className="py-2.5 px-3 w-28 text-center">Corresponding</th>
                <th className="py-2.5 px-3 w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4dc]">
              {authors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-xs text-[#6e6d68]">
                    No authors listed. Click "+ Add Author" to add one.
                  </td>
                </tr>
              ) : (
                authors.map((author, idx) => (
                  <tr key={idx} className="hover:bg-[#faf9f5]">
                    <td className="py-2.5 px-3 text-center text-[#6e6d68] font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={author.given_name}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "given_name", e.target.value)
                        }
                        placeholder="First name"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={author.surname}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "surname", e.target.value)
                        }
                        placeholder="Last name"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="email"
                        value={author.email || ""}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "email", e.target.value || null)
                        }
                        placeholder="author@univ.edu"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
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
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs font-mono"
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
                        className="w-16 px-2 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs text-center font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={author.is_corresponding}
                        onChange={(e) =>
                          handleUpdateAuthor(idx, "is_corresponding", e.target.checked)
                        }
                        className="cursor-pointer accent-[#141413] w-4 h-4 rounded"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleMoveAuthor(idx, "up")}
                        disabled={idx === 0}
                        className="px-2 py-0.5 border border-[#e6e4dc] hover:border-[#141413] rounded text-xs disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveAuthor(idx, "down")}
                        disabled={idx === authors.length - 1}
                        className="px-2 py-0.5 border border-[#e6e4dc] hover:border-[#141413] rounded text-xs disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAuthor(idx)}
                        className="px-2 py-0.5 border border-[#e6e4dc] hover:border-[#c93b2b] text-[#c93b2b] rounded text-xs"
                        title="Remove"
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
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-[#141413]">
              Institutional Affiliations ({affiliations.length})
            </h3>
            <p className="text-xs text-[#6e6d68]">
              Institutions, departments, and research centers.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddAffiliation}
            className="px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            + Add Institution
          </button>
        </div>

        <div className="bg-white border border-[#e6e4dc] rounded-xl overflow-x-auto shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4dc] bg-[#f5f3ec] text-[#6e6d68] font-medium">
                <th className="py-2.5 px-3 w-14 text-center">#</th>
                <th className="py-2.5 px-3">Institution / University *</th>
                <th className="py-2.5 px-3">Department / Division</th>
                <th className="py-2.5 px-3">City / State</th>
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3 w-16 text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4dc]">
              {affiliations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-[#6e6d68]">
                    No affiliations listed. Click "+ Add Institution" to add one.
                  </td>
                </tr>
              ) : (
                affiliations.map((affil, idx) => (
                  <tr key={idx} className="hover:bg-[#faf9f5]">
                    <td className="py-2.5 px-3 text-center font-bold text-[#141413]">
                      [{affil.index}]
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.institution}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "institution", e.target.value)
                        }
                        placeholder="e.g. Stanford University"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.department || ""}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "department", e.target.value || null)
                        }
                        placeholder="e.g. Department of Radiology"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.city || ""}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "city", e.target.value || null)
                        }
                        placeholder="e.g. Stanford, CA"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={affil.country || ""}
                        onChange={(e) =>
                          handleUpdateAffiliation(idx, "country", e.target.value || null)
                        }
                        placeholder="e.g. United States"
                        className="w-full px-2.5 py-1 bg-white border border-[#e6e4dc] rounded-lg text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveAffiliation(idx)}
                        className="px-2 py-0.5 border border-[#e6e4dc] hover:border-[#c93b2b] text-[#c93b2b] rounded text-xs"
                        title="Remove"
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
        <div className="bg-[#f5f3ec] border border-[#e6e4dc] rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-[#141413] mb-3 uppercase tracking-wider">
            Corresponding Author Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[#6e6d68] block mb-1 font-medium">
                Full Name
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
                className="w-full px-3 py-1.5 bg-white border border-[#e6e4dc] rounded-lg text-xs"
              />
            </div>
            <div>
              <span className="text-[#6e6d68] block mb-1 font-medium">
                Email Address
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
                className="w-full px-3 py-1.5 bg-white border border-[#e6e4dc] rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthorTable;
