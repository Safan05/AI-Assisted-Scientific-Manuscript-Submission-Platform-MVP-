import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exportApi } from "@/lib/api";

export const useExportStatus = (manuscriptId: string) => {
  return useQuery({
    queryKey: ["exportStatus", manuscriptId],
    queryFn: async () => {
      const res = await exportApi.status(manuscriptId);
      return res.data;
    },
  });
};

export const useTriggerExport = (manuscriptId: string, projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await exportApi.trigger(manuscriptId);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exportStatus", manuscriptId] });
      queryClient.invalidateQueries({ queryKey: ["manuscript", manuscriptId] });
      queryClient.invalidateQueries({ queryKey: ["manuscripts", projectId] });
    },
  });
};

export const useExportDownloadUrl = (manuscriptId: string) => {
  return useMutation({
    mutationFn: async () => {
      const res = await exportApi.download(manuscriptId);
      return res.data;
    },
  });
};
