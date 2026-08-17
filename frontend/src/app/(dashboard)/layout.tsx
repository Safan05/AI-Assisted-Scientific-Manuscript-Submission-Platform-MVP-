"use client";

// src/app/(dashboard)/layout.tsx
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  iconLetter: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", iconLetter: "O" },
  { label: "Projects", href: "/projects", iconLetter: "P" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center text-xs text-[#6e6d68]">
        Loading your workspace...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] flex text-[#141413]">
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-[#e6e4dc] bg-[#f5f3ec] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / Workspace Title */}
          <div className="p-6 border-b border-[#e6e4dc]">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#141413] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                M
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-[#141413]">
                  Manuscript Studio
                </div>
                <div className="text-[11px] text-[#6e6d68]">
                  Research Workspace
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-[#8c8b85] uppercase">
              Menu
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#141413] text-white shadow-sm"
                      : "text-[#141413] hover:bg-[#eae7de]"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                      isActive ? "bg-[#2b2a27] text-white" : "bg-[#e6e4dc] text-[#6e6d68]"
                    }`}
                  >
                    {item.iconLetter}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & session bottom section */}
        <div className="p-4 border-t border-[#e6e4dc] space-y-3">
          <div className="px-2">
            <div className="text-[11px] font-semibold uppercase text-[#8c8b85] tracking-wider">
              Signed in as
            </div>
            <div className="text-sm font-semibold text-[#141413] truncate mt-0.5">
              {user.full_name || "Author"}
            </div>
            <div className="text-xs text-[#6e6d68] truncate">
              {user.email}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 border border-[#e6e4dc] hover:border-[#141413] bg-white text-xs font-medium rounded-lg text-[#141413] hover:bg-[#faf9f5] transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content Shell ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#faf9f5]">
        {/* Top bar header with scientific coordinate indicators */}
        <header className="h-14 border-b border-[#e6e4dc] bg-[#faf9f5]/90 backdrop-blur flex items-center justify-between px-8 shrink-0 relative">
          <div className="flex items-center gap-3 text-xs text-[#6e6d68]">
            <span className="font-mono text-[11px] text-[#8c8b85]">⌖</span>
            <span className="font-medium text-[#141413]">Manuscript Preparation & Submission</span>
            <span className="text-[#e6e4dc]">|</span>
            <span className="font-mono text-[10px] text-[#8c8b85]">SYS · RESEARCH LAB</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#6e6d68]">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b6b37]" />
              <span>ONLINE</span>
            </span>
            <span className="text-[#e6e4dc]">|</span>
            <span className="text-xs">{user.email}</span>
          </div>
        </header>

        {/* Page Content Viewport with subtle dot grid backdrop */}
        <main className="flex-1 overflow-auto p-8 lg:p-10 bg-grid-dots relative">{children}</main>
      </div>
    </div>
  );
}
