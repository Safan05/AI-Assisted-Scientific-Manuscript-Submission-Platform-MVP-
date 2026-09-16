import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred."): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("response" in error && error.response && typeof error.response === "object") {
      const res = error.response as { data?: { detail?: string | any[] } };
      if (res.data?.detail) {
        if (typeof res.data.detail === "string") return res.data.detail;
        if (Array.isArray(res.data.detail)) {
          return res.data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        }
      }
    }
    if ("message" in error && typeof (error as any).message === "string") {
      return (error as any).message;
    }
  }
  return fallback;
}
