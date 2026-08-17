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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-[#e6e4dc] pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#141413]">
            Research Projects
          </h1>
          <p className="text-sm text-[#6e6d68] mt-1">
            Organize your scientific manuscripts into research projects.
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreating(!isCreating);
            setError(null);
          }}
          className="px-4 py-2 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          {isCreating ? "Cancel" : "+ New Project"}
        </button>
      </div>

      {/* ── Inline Creation Panel ─────────────────────────────────── */}
      {isCreating && (
        <div className="bg-white border border-[#e6e4dc] rounded-xl p-6 shadow-sm transition-all">
          <div className="flex justify-between items-center mb-4 border-b border-[#e6e4dc] pb-3">
            <h2 className="text-sm font-semibold text-[#141413]">
              Create New Project
            </h2>
            <span className="text-xs text-[#6e6d68]">
              Project Workspace
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 border border-[#f5c6cb] bg-[#fdf2f2] text-[#c93b2b] text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Deep Learning for Medical Imaging"
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#141413] mb-1">
                Description / Research Scope
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of study scope, methodologies, or target journals..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Save Project"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-[#e6e4dc] bg-white hover:bg-[#f5f3ec] text-[#6e6d68] text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Project List Grid ───────────────────────────────────────── */}
      <div>
        <div className="text-xs font-semibold text-[#8c8b85] uppercase tracking-wider mb-4">
          Your Projects ({projects?.length || 0})
        </div>

        {isLoading ? (
          <div className="p-12 bg-white border border-[#e6e4dc] rounded-xl text-center text-xs text-[#6e6d68]">
            Loading projects...
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="p-12 bg-white border border-dashed border-[#e6e4dc] rounded-xl text-center">
            <h2 className="text-base font-semibold text-[#141413] mb-1">
              No projects yet
            </h2>
            <p className="text-xs text-[#6e6d68] mb-4">
              Get started by creating your first research project.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-[#141413] hover:bg-[#2b2a27] text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              + Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="bg-white border border-[#e6e4dc] hover:border-[#141413] rounded-xl transition-all p-6 flex flex-col justify-between group shadow-sm hover:shadow"
              >
                <div>
                  <h2 className="text-base font-semibold text-[#141413] group-hover:underline line-clamp-2">
                    {project.name}
                  </h2>

                  <p className="text-xs text-[#6e6d68] mt-2 line-clamp-3 leading-relaxed">
                    {project.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e6e4dc] flex justify-between items-center text-xs text-[#8c8b85]">
                  <span suppressHydrationWarning>{new Date(project.created_at).toLocaleDateString()}</span>
                  <span className="text-[#141413] font-medium group-hover:underline">
                    View Project →
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
