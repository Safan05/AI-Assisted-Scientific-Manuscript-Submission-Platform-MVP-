"use client";

// src/hooks/use-preflight.ts - React Query hooks for Preflight evaluation

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { preflightApi } from "@/lib/api";

export function usePreflightResult(manuscriptId: string) {
  return useQuery({
    queryKey: ["preflight-result", manuscriptId],
    queryFn: () => preflightApi.getLatest(manuscriptId).then((r) => r.data),
    enabled: !!manuscriptId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useRunPreflight(manuscriptId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => preflightApi.run(manuscriptId).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["preflight-result", manuscriptId], data);
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      if (projectId) {
        qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
      }
    },
  });
}

export function useOverridePreflightItem(manuscriptId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      reason,
      overridden,
    }: {
      itemId: string;
      reason?: string;
      overridden?: boolean;
    }) =>
      preflightApi
        .override(manuscriptId, itemId, reason, overridden)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["preflight-result", manuscriptId], data);
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
    },
  });
}

export function useConfirmPreflight(manuscriptId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => preflightApi.confirm(manuscriptId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      qc.invalidateQueries({ queryKey: ["preflight-result", manuscriptId] });
      if (projectId) {
        qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
      }
    },
  });
}
