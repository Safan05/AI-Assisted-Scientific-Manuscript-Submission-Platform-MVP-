// src/app/(auth)/layout.tsx
import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#faf9f5] text-[#141413] flex flex-col justify-between p-6 sm:p-12">
      {/* Top Header */}
      <header className="flex justify-between items-center border-b border-[#e6e4dc] pb-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-6 h-6 rounded-md bg-[#141413] flex items-center justify-center text-white text-xs font-bold">
            M
          </div>
          <span className="text-sm font-semibold tracking-tight text-[#141413]">
            Manuscript Studio
          </span>
        </Link>
        <div className="text-xs text-[#6e6d68]">
          Scientific Manuscript Assistant
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e6e4dc] pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-[#8c8b85] gap-2">
        <span>Simplified publication workflow for researchers</span>
        <span>Secure & Private</span>
      </footer>
    </div>
  );
}
