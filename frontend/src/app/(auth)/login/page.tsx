"use client";

// src/app/(auth)/login/page.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Authentication failed. Check your credentials.");
      } else {
        setError("Network error or server unreachable.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-[#E0E0E0] bg-[#FAFAFA] p-8 sm:p-10">
      {/* Title block */}
      <div className="mb-8 border-b border-[#E0E0E0] pb-6">
        <div className="font-mono text-xs text-[#707070] uppercase tracking-wider mb-1">
          AUTH // 01
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
          Sign In
        </h1>
        <p className="text-xs text-[#707070] mt-1">
          Enter credentials to access your manuscript workspace.
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-3 border border-[#D0021B] bg-[rgba(208,2,27,0.05)] text-[#D0021B] text-xs font-mono">
          [ ERROR ] {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#707070] mb-2 font-mono">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="author@institution.edu"
            className="w-full px-3 py-2 text-sm bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#707070] font-mono">
              Password
            </label>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3 py-2 text-sm bg-white border border-[#E0E0E0] rounded-[2px] text-[#111111] focus:border-[#111111] focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#222222] text-[#FAFAFA] text-xs font-mono font-medium uppercase tracking-wider transition-colors disabled:opacity-50 mt-6"
        >
          {isLoading ? "[ AUTHENTICATING... ]" : "[ SIGN IN → ]"}
        </button>
      </form>

      {/* Secondary links */}
      <div className="mt-8 pt-6 border-t border-[#E0E0E0] flex justify-between items-center text-xs">
        <span className="text-[#707070]">No account yet?</span>
        <Link
          href="/register"
          className="font-medium text-[#111111] underline hover:text-[#D0021B] transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
