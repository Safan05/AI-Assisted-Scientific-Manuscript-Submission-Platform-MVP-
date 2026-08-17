"use client";

// src/hooks/use-journals.ts - React Query hooks for Journal Templates and Rules

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { journalApi, manuscriptApi } from "@/lib/api";
import type { JournalTemplate, JournalTemplateDetail } from "@/lib/types";

export function useJournalTemplates(activeOnly = true) {
  return useQuery<JournalTemplate[]>({
    queryKey: ["journal-templates", activeOnly],
    queryFn: () => journalApi.list(activeOnly).then((res) => res.data),
  });
}

export function useJournalTemplateDetail(idOrSlug: string, enabled = true) {
  return useQuery<JournalTemplateDetail>({
    queryKey: ["journal-template-detail", idOrSlug],
    queryFn: () => journalApi.get(idOrSlug).then((res) => res.data),
    enabled: !!idOrSlug && enabled,
  });
}

export function useAssignTargetJournal(manuscriptId: string, projectId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetJournalId: string) =>
      manuscriptApi
        .update(manuscriptId, { target_journal_id: targetJournalId })
        .then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      if (projectId) {
        qc.invalidateQueries({ queryKey: ["project-manuscripts", projectId] });
      }
    },
  });
}
