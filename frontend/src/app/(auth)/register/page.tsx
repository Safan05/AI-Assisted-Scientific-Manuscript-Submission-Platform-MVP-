"use client";

// src/app/(auth)/register/page.tsx
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, fullName || undefined);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axErr = err as { response?: { data?: { detail?: string } } };
        setError(axErr.response?.data?.detail || "Registration failed. Please check your details.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e6e4dc] rounded-xl p-8 sm:p-10 shadow-sm">
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#141413]">
          Create your account
        </h1>
        <p className="text-sm text-[#6e6d68] mt-1">
          Prepare, standardize, and submit scientific manuscripts with ease.
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
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Eleanor Vance"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#141413] mb-1.5">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.vance@university.edu"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[#141413] mb-1.5">
            Password (min. 8 characters)
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

        <div>
          <label className="block text-xs font-medium text-[#141413] mb-1.5">
            Confirm password
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#e6e4dc] rounded-lg text-[#141413] focus:border-[#141413] focus:ring-1 focus:ring-[#141413] transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 px-4 bg-[#141413] hover:bg-[#2b2a27] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 mt-6"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {/* Sign in link */}
      <div className="mt-6 pt-5 border-t border-[#e6e4dc] flex justify-between items-center text-xs">
        <span className="text-[#6e6d68]">Already have an account?</span>
        <Link
          href="/login"
          className="font-semibold text-[#141413] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
