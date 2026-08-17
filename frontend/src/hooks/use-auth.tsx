"use client";

// src/hooks/use-auth.tsx — AuthProvider + useAuth hook
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthContext, storeToken, clearToken, getToken } from "@/lib/auth";
import { authApi, userApi } from "@/lib/api";
import type { User } from "@/lib/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, fetch current user if token exists
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    userApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    storeToken(res.data.access_token);
    const me = await userApi.me();
    setUser(me.data);
    router.push("/dashboard");
  }, [router]);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const res = await authApi.register({ email, password, full_name: fullName });
    storeToken(res.data.access_token);
    const me = await userApi.me();
    setUser(me.data);
    router.push("/dashboard");
  }, [router]);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export { useAuthContext as useAuth } from "@/lib/auth";
