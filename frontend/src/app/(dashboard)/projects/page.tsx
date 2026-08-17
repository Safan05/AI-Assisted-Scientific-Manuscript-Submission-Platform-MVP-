"use client";

// src/app/(dashboard)/projects/page.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { projectApi } from "@/lib/api";
import type { Project, ProjectCreate } from "@/lib/types";

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch projects
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => projectApi.list().then((res) => res.data),
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: ProjectCreate) => projectApi.create(data).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setIsCreating(false);
      setName("");
      setDescription("");
      setError(null);
    },
    onError: (err: unknown) => {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Failed to create project");
      } else {
        setError("Network error creating project");
      }
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }
    setError(null);
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#E0E0E0] pb-6 flex justify-between items-end">
        <div>
          <div className="font-mono text-xs text-[#707070] uppercase tracking-wider mb-1">
            PROJECTS // 02
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111111]">
            Research Projects
          </h1>
          <p className="text-xs text-[#707070] mt-1">
            Organize manuscripts into project workspaces for journal standardization.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(!isCreating);
            setError(null);
          }}
          className="px-4 py-2 border border-[#111111] bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-xs font-mono font-medium uppercase tracking-wider transition-colors"
        >
          {isCreating ? "[ CANCEL ]" : "[ + NEW PROJECT ]"}
        </button>
      </div>

      {/* ── Inline Creation Panel (Swiss Style Hairline Drawer) ────── */}
      {isCreating && (
        <div className="border border-[#111111] bg-white p-6 transition-all">
          <div className="flex justify-between items-center mb-4 border-b border-[#E0E0E0] pb-3">
            <span className="font-mono text-xs font-bold text-[#111111] uppercase tracking-wider">
              [ CREATE NEW RESEARCH PROJECT ]
            </span>
            <span className="font-mono text-[11px] text-[#707070]">
              WORKSPACE REGISTRATION
            </span>
          </div>

          {error && (
            <div className="mb-4 p-2.5 border border-[#D0021B] bg-[rgba(208,2,27,0.05)] text-[#D0021B] text-xs font-mono">
              [ ERROR ] {error}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#707070] mb-1 font-mono">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deep Learning in Chest CT Radiomics"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#707070] mb-1 font-mono">
                Description / Research Scope
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Targeting submission to Radiology or Medical Image Analysis..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-xs font-mono font-medium uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {createMutation.isPending
                  ? "[ REGISTERING... ]"
                  : "[ SAVE PROJECT → ]"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-[#E0E0E0] bg-white text-[#707070] hover:text-[#111111] text-xs font-mono uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Project List Grid ───────────────────────────────────────── */}
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-[#707070] mb-4">
          REGISTERED WORKSPACES ({projects?.length || 0})
        </div>

        {isLoading ? (
          <div className="p-12 border border-[#E0E0E0] bg-white text-center font-mono text-xs text-[#707070]">
            [ QUERYING WORKSPACES... ]
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="p-12 border border-dashed border-[#E0E0E0] bg-white text-center">
            <div className="font-mono text-xs text-[#707070] uppercase mb-2">
              [ NO PROJECTS FOUND ]
            </div>
            <p className="text-sm text-[#111111] font-medium mb-4">
              Get started by creating your first research project workspace.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-xs font-mono uppercase tracking-wider"
            >
              [ + CREATE PROJECT ]
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project, idx) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block border border-[#E0E0E0] bg-white hover:border-[#111111] transition-all p-6 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-mono text-xs text-[#707070]">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[10px] text-[#707070] uppercase">
                      ID: {project.id.slice(0, 8)}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-[#111111] group-hover:text-[#D0021B] transition-colors line-clamp-2">
                    {project.name}
                  </h2>

                  <p className="text-xs text-[#707070] mt-2 line-clamp-3 leading-relaxed">
                    {project.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E0E0E0] flex justify-between items-center font-mono text-[11px] text-[#707070]">
                  <span>CREATED: {new Date(project.created_at).toLocaleDateString()}</span>
                  <span className="text-[#111111] group-hover:underline">
                    OPEN WORKSPACE →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
