"use client";

// src/app/(dashboard)/dashboard/page.tsx
import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import StatusBadge from "@/components/manuscripts/status-badge";
import type { Manuscript, Project, ManuscriptStatus } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";

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
    <div className="max-w-7xl mx-auto space-y-10">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="border-b border-[#E0E0E0] pb-6 flex justify-between items-end">
        <div>
          <div className="font-mono text-xs text-[#707070] uppercase tracking-wider mb-1">
            OVERVIEW // 01
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            System Dashboard
          </h1>
          <p className="text-xs text-[#707070] mt-1">
            Aggregated metrics, active manuscript pipeline, and project workspaces.
          </p>
        </div>

        <Link
          href="/projects"
          className="px-4 py-2 border border-[#111111] bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-xs font-mono font-medium uppercase tracking-wider transition-colors"
        >
          [ + NEW PROJECT ]
        </Link>
      </div>

      {/* ── High-Level Numeric Stats Grid ──────────────────────────── */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-[#707070] mb-4">
          SYSTEM METRICS
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border-t border-l border-[#E0E0E0]">
          {/* Total Projects */}
          <div className="p-5 border-r border-b border-[#E0E0E0] bg-white">
            <div className="text-[11px] font-mono text-[#707070] uppercase mb-1">
              PROJECTS
            </div>
            <div className="text-3xl font-mono font-bold text-[#111111]">
              {isLoading ? "-" : String(totalProjects).padStart(2, "0")}
            </div>
          </div>

          {/* Total Manuscripts */}
          <div className="p-5 border-r border-b border-[#E0E0E0] bg-white">
            <div className="text-[11px] font-mono text-[#707070] uppercase mb-1">
              TOTAL MSS
            </div>
            <div className="text-3xl font-mono font-bold text-[#111111]">
              {isLoading ? "-" : String(totalManuscripts).padStart(2, "0")}
            </div>
          </div>

          {/* Status Breakdown (01 - 06) */}
          {STATUS_ORDER.map((st) => (
            <div
              key={st}
              className={`p-5 border-r border-b border-[#E0E0E0] bg-white ${
                st === "DRAFT" && (statusCounts[st] || 0) > 0
                  ? "bg-[rgba(208,2,27,0.02)]"
                  : ""
              }`}
            >
              <div className="text-[10px] font-mono text-[#707070] uppercase mb-1 truncate">
                {st}
              </div>
              <div
                className={`text-3xl font-mono font-bold ${
                  (st === "DRAFT" || st === "PARSED") && (statusCounts[st] || 0) > 0
                    ? "text-[#D0021B]"
                    : "text-[#111111]"
                }`}
              >
                {isLoading ? "-" : String(statusCounts[st] || 0).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Manuscript Feed ──────────────────────────────────── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#707070]">
            RECENT MANUSCRIPTS // INGESTION & EDITING
          </div>
          <Link
            href="/projects"
            className="text-xs font-mono text-[#707070] hover:text-[#111111] underline"
          >
            VIEW ALL BY PROJECT →
          </Link>
        </div>

        <div className="border border-[#E0E0E0] bg-white overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E0E0E0] bg-[#F5F5F5] font-mono text-[11px] text-[#707070] uppercase">
                <th className="py-3 px-4 font-medium">Original Filename</th>
                <th className="py-3 px-4 font-medium">Project</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Word Count</th>
                <th className="py-3 px-4 font-medium">Created</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E0E0]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-mono text-[#707070]">
                    [ QUERYING ACTIVE MANUSCRIPTS... ]
                  </td>
                </tr>
              ) : !allManuscripts || allManuscripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center font-mono text-[#707070]">
                    No manuscripts uploaded yet. Create a project and upload a .docx paper.
                  </td>
                </tr>
              ) : (
                allManuscripts.map((m) => (
                  <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-[#111111]">
                      {m.original_filename}
                    </td>
                    <td className="py-3.5 px-4 text-[#111111]">
                      <Link
                        href={`/projects/${m.project_id}`}
                        className="hover:underline text-[#707070] hover:text-[#111111]"
                      >
                        {m.projectName}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#707070]">
                      {m.word_count > 0 ? `${m.word_count.toLocaleString()} w` : "—"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#707070]">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/projects/${m.project_id}/manuscripts/${m.id}/editor`}
                        className="inline-block px-3 py-1 bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-[11px] font-mono uppercase tracking-wider transition-colors"
                      >
                        [ OPEN EDITOR → ]
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
