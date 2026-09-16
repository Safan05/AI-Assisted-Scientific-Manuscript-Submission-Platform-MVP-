// src/lib/api.ts
import axios from "axios";
import { getToken } from "./auth";
import type {
  User,
  Project,
  ProjectCreate,
  Manuscript,
  ManuscriptIR,
  ManuscriptAsset,
  JournalTemplate,
  JournalTemplateDetail,
  PreflightResult,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    return apiClient.post<{ access_token: string; token_type: string }>(
      "/auth/login",
      formData,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
  },
  register: async (data: { email: string; password: string; full_name?: string }) => {
    return apiClient.post<{ access_token: string; token_type: string; user: User }>(
      "/auth/register",
      data
    );
  },
};

// User API
export const userApi = {
  me: async () => {
    return apiClient.get<User>("/users/me");
  },
};

// Project API
export const projectApi = {
  list: async () => {
    return apiClient.get<Project[]>("/projects");
  },
  get: async (id: string) => {
    return apiClient.get<Project>(`/projects/${id}`);
  },
  create: async (data: ProjectCreate) => {
    return apiClient.post<Project>("/projects", data);
  },
  delete: async (id: string) => {
    return apiClient.delete(`/projects/${id}`);
  },
  listManuscripts: async (projectId: string) => {
    return apiClient.get<Manuscript[]>(`/projects/${projectId}/manuscripts`);
  },
  uploadManuscript: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<Manuscript>(`/projects/${projectId}/manuscripts`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// Manuscript API
export const manuscriptApi = {
  get: async (id: string) => {
    return apiClient.get<Manuscript>(`/manuscripts/${id}`);
  },
  getIR: async (id: string) => {
    return apiClient.get<ManuscriptIR>(`/manuscripts/${id}/metadata`);
  },
  updateIR: async (id: string, metadata: Partial<ManuscriptIR>) => {
    return apiClient.patch<ManuscriptIR>(`/manuscripts/${id}/metadata`, metadata);
  },
  update: async (id: string, data: Partial<Manuscript>) => {
    return apiClient.patch<Manuscript>(`/manuscripts/${id}`, data);
  },
  upload: async (projectId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<Manuscript>(`/projects/${projectId}/manuscripts`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  parse: async (id: string) => {
    return apiClient.post<ManuscriptIR>(`/manuscripts/${id}/parse`);
  },
  updateMetadata: async (id: string, metadata: ManuscriptIR) => {
    return apiClient.patch<ManuscriptIR>(`/manuscripts/${id}/metadata`, metadata);
  },
  getAssets: async (id: string) => {
    return apiClient.get<ManuscriptAsset[]>(`/manuscripts/${id}/assets`);
  },
  setTargetJournal: async (id: string, journalSlug: string) => {
    return apiClient.patch<Manuscript>(`/manuscripts/${id}/target-journal`, {
      journal_slug: journalSlug,
    });
  },
  delete: async (id: string) => {
    return apiClient.delete(`/manuscripts/${id}`);
  },
};

// Journal API
export const journalApi = {
  list: async (_params?: any) => {
    return apiClient.get<JournalTemplate[]>("/journals");
  },
  get: async (slug: string) => {
    return apiClient.get<JournalTemplateDetail>(`/journals/${slug}`);
  },
};

// Preflight API
export const preflightApi = {
  run: async (manuscriptId: string) => {
    return apiClient.post<PreflightResult>(`/manuscripts/${manuscriptId}/preflight`);
  },
  get: async (manuscriptId: string) => {
    return apiClient.get<PreflightResult>(`/manuscripts/${manuscriptId}/preflight`);
  },
  getLatest: async (manuscriptId: string) => {
    return apiClient.get<PreflightResult>(`/manuscripts/${manuscriptId}/preflight`);
  },
  override: async (
    manuscriptId: string,
    itemId: string,
    reason?: string,
    overridden = true
  ) => {
    return apiClient.post<PreflightResult>(
      `/manuscripts/${manuscriptId}/preflight/override`,
      {
        item_id: itemId,
        reason,
        overridden,
      }
    );
  },
  confirm: async (manuscriptId: string) => {
    return apiClient.post<Manuscript>(`/manuscripts/${manuscriptId}/preflight/confirm`);
  },
};

// Export API
export const exportApi = {
  trigger: async (manuscriptId: string) => {
    return apiClient.post<{
      manuscript_id: string;
      status: string;
      exported_storage_key: string;
      message: string;
    }>(`/manuscripts/${manuscriptId}/export`);
  },
  status: async (manuscriptId: string) => {
    return apiClient.get<{
      manuscript_id: string;
      status: string;
      exported_storage_key: string | null;
      is_exported: boolean;
    }>(`/manuscripts/${manuscriptId}/export/status`);
  },
  download: async (manuscriptId: string, expiresIn = 3600) => {
    return apiClient.get<{
      manuscript_id: string;
      download_url: string;
      expires_in_seconds: number;
    }>(`/manuscripts/${manuscriptId}/export/download`, {
      params: { expires_in: expiresIn },
    });
  },
};
