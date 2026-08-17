"use client";

// src/app/(dashboard)/dashboard/page.tsx
// User-friendly research overview dashboard with subtle scientific motifs

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import StatusBadge from "@/components/manuscripts/status-badge";
import type { Project, Manuscript } from "@/lib/types";

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectApi.list().then((r) => r.data),
  });

  const { data: allManuscripts, isLoading: manuscriptsLoading } = useQuery<Manuscript[]>({
    queryKey: ["all-manuscripts"],
    queryFn: async () => {
      const projList = await projectApi.list().then((r) => r.data);
      const results = await Promise.all(
        projList.map((p) =>
          projectApi.listManuscripts(p.id).then((r) => r.data).catch(() => [])
        )
      );
      return results.flat();
    },
  });

  const isLoading = projectsLoading || manuscriptsLoading;

  const statusCounts = (allManuscripts || []).reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalManuscripts = (allManuscripts || []).length;
  const totalProjects = (projects || []).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Page Header with Scientific Coordinate Annotations ───────── */}
      <div className="border-b border-[#e6e4dc] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[11px] text-[#8c8b85]">⌖ [ REF · OVERVIEW ]</span>
            <span className="text-[#e6e4dc]">·</span>
            <span className="font-mono text-[10px] text-[#8c8b85]">GRID: 24mm · ISO-216</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#141413]">
            Research Overview
          </h1>
          <p className="text-sm text-[#6e6d68] mt-1">
            Track your research projects, uploaded manuscripts, and submission progress.
          </p>
        </div>

        <Link
          href="/projects"
          className="px-4 py-2 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          + New Project
        </Link>
      </div>

      {/* ── Abstract Pipeline Flow Indicator ──────────────────────────── */}
      <div className="bg-white border border-[#e6e4dc] rounded-xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider">
            Manuscript Pipeline Architecture
          </span>
          <span className="font-mono text-[10px] text-[#8c8b85]">AUTOMATED WORKFLOW</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="p-2.5 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg space-y-1">
            <div className="font-mono text-[10px] text-[#8c8b85]">01 · INGEST</div>
            <div className="font-semibold text-[#141413]">Upload .DOCX</div>
          </div>
          <div className="p-2.5 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg space-y-1">
            <div className="font-mono text-[10px] text-[#8c8b85]">02 · EXTRACT</div>
            <div className="font-semibold text-[#141413]">Hierarchy & Figs</div>
          </div>
          <div className="p-2.5 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg space-y-1">
            <div className="font-mono text-[10px] text-[#8c8b85]">03 · EDIT</div>
            <div className="font-semibold text-[#141413]">Metadata & Citations</div>
          </div>
          <div className="p-2.5 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg space-y-1">
            <div className="font-mono text-[10px] text-[#8c8b85]">04 · STANDARDS</div>
            <div className="font-semibold text-[#141413]">Journal Rules</div>
          </div>
          <div className="p-2.5 bg-[#faf9f5] border border-[#e6e4dc] rounded-lg space-y-1">
            <div className="font-mono text-[10px] text-[#8c8b85]">05 · CHECK & EXPORT</div>
            <div className="font-semibold text-[#141413]">Pre-flight Check</div>
          </div>
        </div>
      </div>

      {/* ── Stat Highlights with Corner Crosshairs ───────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="scientific-box p-5 bg-white border border-[#e6e4dc] rounded-xl shadow-sm">
          <div className="text-xs font-medium text-[#6e6d68]">
            Active Projects
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1 font-mono">
            {isLoading ? "-" : totalProjects}
          </div>
          <div className="text-[10px] text-[#8c8b85] mt-2 font-mono">WORKSPACE TOTAL</div>
        </div>

        <div className="scientific-box p-5 bg-white border border-[#e6e4dc] rounded-xl shadow-sm">
          <div className="text-xs font-medium text-[#6e6d68]">
            Total Manuscripts
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1 font-mono">
            {isLoading ? "-" : totalManuscripts}
          </div>
          <div className="text-[10px] text-[#8c8b85] mt-2 font-mono">INGESTED DOCS</div>
        </div>

        <div className="scientific-box p-5 bg-white border border-[#e6e4dc] rounded-xl shadow-sm">
          <div className="text-xs font-medium text-[#6e6d68]">
            Ready to Edit
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1 font-mono">
            {isLoading ? "-" : (statusCounts.PARSED || 0)}
          </div>
          <div className="text-[10px] text-[#8c8b85] mt-2 font-mono">EXTRACTED & READY</div>
        </div>

        <div className="scientific-box p-5 bg-white border border-[#e6e4dc] rounded-xl shadow-sm">
          <div className="text-xs font-medium text-[#6e6d68]">
            Target Selected
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1 font-mono">
            {isLoading ? "-" : (statusCounts.TARGET_SELECTED || 0)}
          </div>
          <div className="text-[10px] text-[#8c8b85] mt-2 font-mono">READY FOR CHECKS</div>
        </div>
      </div>

      {/* ── Active Manuscript Feed ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-[#141413]">
              Recent Manuscripts
            </h2>
            <p className="text-xs text-[#6e6d68]">
              All scientific papers across your active research projects.
            </p>
          </div>
          <Link
            href="/projects"
            className="text-xs font-medium text-[#6e6d68] hover:text-[#141413] hover:underline"
          >
            View all projects →
          </Link>
        </div>

        <div className="bg-white border border-[#e6e4dc] rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-[#e6e4dc] bg-[#f5f3ec] text-xs font-medium text-[#6e6d68]">
                <th className="py-3 px-4">Document</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4dc]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#6e6d68]">
                    Loading manuscripts...
                  </td>
                </tr>
              ) : !allManuscripts || allManuscripts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-[#6e6d68]">
                    No manuscripts uploaded yet. Create a project to start submitting papers.
                  </td>
                </tr>
              ) : (
                allManuscripts.slice(0, 10).map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-[#faf9f5] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#141413] truncate max-w-sm">
                        {m.original_filename}
                      </div>
                      <div className="font-mono text-[11px] text-[#8c8b85]">
                        ID: {m.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6e6d68]">
                      {m.word_count > 0 ? `${m.word_count.toLocaleString()} words` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#6e6d68]" suppressHydrationWarning>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Link
                          href={`/projects/${m.project_id}/manuscripts/${m.id}/editor`}
                          className="px-2.5 py-1 text-xs font-medium text-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-colors"
                        >
                          Editor
                        </Link>
                        {m.target_journal_id ? (
                          <Link
                            href={`/projects/${m.project_id}/manuscripts/${m.id}/preflight`}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-[#141413] hover:bg-[#141413]/90 rounded-lg transition-colors shadow-2xs"
                          >
                            Pre-flight →
                          </Link>
                        ) : (
                          <Link
                            href={`/projects/${m.project_id}/manuscripts/${m.id}/journal`}
                            className="px-2.5 py-1 text-xs font-medium text-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-colors"
                          >
                            Journal →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
