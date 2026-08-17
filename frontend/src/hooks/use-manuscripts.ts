"use client";

// src/hooks/use-manuscripts.ts - React Query hooks for manuscripts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { manuscriptApi, projectApi } from "@/lib/api";
import type { ManuscriptIR } from "@/lib/types";

export function useManuscript(manuscriptId: string) {
  return useQuery({
    queryKey: ["manuscript", manuscriptId],
    queryFn: () => manuscriptApi.get(manuscriptId).then((r) => r.data),
    enabled: !!manuscriptId,
  });
}

export function useManuscriptIR(manuscriptId: string, enabled = true) {
  return useQuery({
    queryKey: ["manuscript-ir", manuscriptId],
    queryFn: () => manuscriptApi.getIR(manuscriptId).then((r) => r.data),
    enabled: !!manuscriptId && enabled,
    retry: false,
  });
}

export function useManuscriptAssets(manuscriptId: string) {
  return useQuery({
    queryKey: ["manuscript-assets", manuscriptId],
    queryFn: () => manuscriptApi.getAssets(manuscriptId).then((r) => r.data),
    enabled: !!manuscriptId,
  });
}

export function useProjectManuscripts(projectId: string) {
  return useQuery({
    queryKey: ["project-manuscripts", projectId],
    queryFn: () => projectApi.listManuscripts(projectId).then((r) => r.data),
    enabled: !!projectId,
  });
}

export function useParseManuscript(manuscriptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => manuscriptApi.parse(manuscriptId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["manuscript-ir", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["manuscript-assets", manuscriptId] });
    },
  });
}

export function useSaveManuscriptIR(manuscriptId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ir: Partial<ManuscriptIR>) =>
      manuscriptApi.updateIR(manuscriptId, ir).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["manuscript-ir", manuscriptId] });
      if (projectId) {
        qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
      }
    },
  });
}
