// src/app/(auth)/layout.tsx
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] flex flex-col justify-between p-6 sm:p-12">
      {/* Top Bar Header */}
      <header className="flex justify-between items-center border-b border-[#E0E0E0] pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium tracking-wider uppercase text-[#111111]">
            [ SWISS-01 ]
          </span>
          <span className="text-sm font-bold tracking-tight">
            Scientific Manuscript Submission Platform
          </span>
        </div>
        <div className="font-mono text-xs text-[#707070]">
          v0.1.0 · SYSTEM READY
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E0E0E0] pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-[#707070] gap-2">
        <span>International Typographic System · Strict Grid</span>
        <span className="font-mono">SECURE · ENCRYPTED JWT</span>
      </footer>
    </div>
  );
}
