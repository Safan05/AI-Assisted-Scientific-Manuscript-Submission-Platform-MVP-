"use client";

// src/app/(dashboard)/dashboard/page.tsx
import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import StatusBadge from "@/components/manuscripts/status-badge";
import type { Manuscript, Project, ManuscriptStatus } from "@/lib/types";

export default function DashboardPage() {
  // 1. Fetch user projects
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectApi.list().then((res) => res.data),
  });

  // 2. Fetch manuscripts across all user projects
  const { data: allManuscripts, isLoading: manuscriptsLoading } = useQuery<
    (Manuscript & { projectName: string })[]
  >({
    queryKey: ["all-manuscripts", projects?.map((p) => p.id)],
    queryFn: async () => {
      if (!projects || projects.length === 0) return [];
      const results = await Promise.all(
        projects.map(async (project) => {
          const res = await projectApi.listManuscripts(project.id);
          return res.data.map((m) => ({
            ...m,
            projectName: project.name,
          }));
        })
      );
      return results.flat().sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!projects && projects.length > 0,
  });

  const isLoading = projectsLoading || manuscriptsLoading;

  // Calculate status counts
  const statusCounts: Record<ManuscriptStatus, number> = {
    DRAFT: 0,
    PARSED: 0,
    EDITED: 0,
    TARGET_SELECTED: 0,
    CHECKLIST_PASSED: 0,
    EXPORTED: 0,
  };

  (allManuscripts || []).forEach((m) => {
    if (statusCounts[m.status] !== undefined) {
      statusCounts[m.status] += 1;
    }
  });

  const totalManuscripts = (allManuscripts || []).length;
  const totalProjects = (projects || []).length;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-b border-[#e6e4dc] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
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

      {/* ── Stat Highlights ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-[#e6e4dc] rounded-xl">
          <div className="text-xs font-medium text-[#6e6d68]">
            Active Projects
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1">
            {isLoading ? "-" : totalProjects}
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e6e4dc] rounded-xl">
          <div className="text-xs font-medium text-[#6e6d68]">
            Total Manuscripts
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1">
            {isLoading ? "-" : totalManuscripts}
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e6e4dc] rounded-xl">
          <div className="text-xs font-medium text-[#6e6d68]">
            Ready to Edit
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1">
            {isLoading ? "-" : statusCounts.PARSED}
          </div>
        </div>

        <div className="p-5 bg-white border border-[#e6e4dc] rounded-xl">
          <div className="text-xs font-medium text-[#6e6d68]">
            Target Selected
          </div>
          <div className="text-2xl font-bold text-[#141413] mt-1">
            {isLoading ? "-" : statusCounts.TARGET_SELECTED}
          </div>
        </div>
      </div>

      {/* ── Active Manuscript Feed ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-[#141413]">
            Recent Manuscripts
          </h2>
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
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Word Count</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e4dc]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#6e6d68]">
                    Loading manuscripts...
                  </td>
                </tr>
              ) : !allManuscripts || allManuscripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[#6e6d68]">
                    No manuscripts uploaded yet. Create a project to get started.
                  </td>
                </tr>
              ) : (
                allManuscripts.map((m) => (
                  <tr key={m.id} className="hover:bg-[#faf9f5] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-[#141413]">
                      {m.original_filename}
                    </td>
                    <td className="py-3.5 px-4 text-[#6e6d68]">
                      <Link
                        href={`/projects/${m.project_id}`}
                        className="hover:underline hover:text-[#141413]"
                      >
                        {m.projectName}
                      </Link>
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
                      <Link
                        href={`/projects/${m.project_id}/manuscripts/${m.id}/editor`}
                        className="inline-block px-3 py-1.5 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        Open Editor →
                      </Link>
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
