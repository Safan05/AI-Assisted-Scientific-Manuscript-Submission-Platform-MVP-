"use client";

// src/app/(auth)/login/page.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";

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
      setError(getErrorMessage(err, "Unable to sign in. Please verify your email and password."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e6e4dc] rounded-xl p-8 sm:p-10 shadow-sm">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#141413]">
          Welcome back
        </h1>
        <p className="text-sm text-[#6e6d68] mt-1">
          Sign in to access your research papers and submissions.
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="mb-5 p-3.5 border border-[#f5c6cb] bg-[#fdf2f2] text-[#c93b2b] text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#141413] mb-1.5">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@university.edu"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#141413] mb-1.5">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#141413] hover:bg-[#2b2a27] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 mt-6"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {/* Sign up link */}
      <div className="mt-6 pt-5 border-t border-[#e6e4dc] flex justify-between items-center text-xs">
        <span className="text-[#6e6d68]">Don't have an account?</span>
        <Link
          href="/register"
          className="font-semibold text-[#141413] hover:underline"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
