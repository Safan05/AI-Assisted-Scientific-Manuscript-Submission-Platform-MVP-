"use client";

// src/app/(dashboard)/layout.tsx
import React, { useState, useEffect } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
      {/* ── Left Sidebar (Collapsible) ─────────────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } border-r border-[#e6e4dc] bg-[#f5f3ec] flex flex-col justify-between shrink-0 transition-all duration-200 ease-in-out relative`}
      >
        <div>
          {/* Logo / Workspace Title & Collapse Toggle */}
          <div className="p-4 border-b border-[#e6e4dc] flex items-center justify-between">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2.5 overflow-hidden ${
                !sidebarOpen && "justify-center w-full"
              }`}
              title="Manuscript Studio"
            >
              <div className="w-7 h-7 rounded-lg bg-[#141413] flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                M
              </div>
              {sidebarOpen && (
                <div className="truncate">
                  <div className="text-sm font-bold tracking-tight text-[#141413]">
                    Manuscript Studio
                  </div>
                  <div className="text-[10px] text-[#6e6d68] font-mono">
                    RESEARCH LAB
                  </div>
                </div>
              )}
            </Link>

            {sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-1 rounded-md text-[#8c8b85] hover:text-[#141413] hover:bg-[#eae7de] transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1.5">
            {sidebarOpen && (
              <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-[#8c8b85] uppercase">
                Menu
              </div>
            )}
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center ${
                    sidebarOpen ? "gap-3 px-3 py-2" : "justify-center px-2 py-2"
                  } text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#141413] text-white shadow-sm"
                      : "text-[#141413] hover:bg-[#eae7de]"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs shrink-0 ${
                      isActive ? "bg-[#2b2a27] text-white" : "bg-[#e6e4dc] text-[#6e6d68]"
                    }`}
                  >
                    {item.iconLetter}
                  </span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & session bottom section */}
        <div className="p-3 border-t border-[#e6e4dc] space-y-2">
          {sidebarOpen ? (
            <>
              <div className="px-2">
                <div className="text-[10px] font-semibold uppercase text-[#8c8b85] tracking-wider">
                  Signed in as
                </div>
                <div className="text-xs font-semibold text-[#141413] truncate mt-0.5">
                  {user.full_name || "Author"}
                </div>
                <div className="text-[11px] text-[#6e6d68] truncate">
                  {user.email}
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full text-left px-3 py-1.5 border border-[#e6e4dc] hover:border-[#141413] bg-white text-xs font-medium rounded-lg text-[#141413] hover:bg-[#faf9f5] transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 rounded-lg bg-[#eae7de] hover:bg-[#dfdbd0] text-[#141413] flex items-center justify-center text-xs font-medium transition-colors"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                →
              </button>
              <button
                onClick={logout}
                className="w-8 h-8 rounded-lg bg-white border border-[#e6e4dc] hover:border-[#c93b2b] text-[#c93b2b] flex items-center justify-center text-xs font-medium transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                ⏻
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content Shell ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#faf9f5]">
        {/* Top bar header with toggle button & scientific coordinate indicators */}
        <header className="h-14 border-b border-[#e6e4dc] bg-[#faf9f5]/90 backdrop-blur flex items-center justify-between px-6 lg:px-8 shrink-0 relative">
          <div className="flex items-center gap-3 text-xs text-[#6e6d68]">
            {!sidebarOpen && (
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 border border-[#e6e4dc] hover:border-[#141413] bg-white rounded-lg text-[#141413] transition-colors"
                title="Open sidebar"
                aria-label="Open sidebar"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            )}
            <span className="font-mono text-[11px] text-[#8c8b85]">⌖</span>
            <span className="font-medium text-[#141413]">Manuscript Preparation & Submission</span>
            <span className="text-[#e6e4dc] hidden sm:inline">|</span>
            <span className="font-mono text-[10px] text-[#8c8b85] hidden sm:inline">SYS · RESEARCH LAB</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#6e6d68]">
            <span className="flex items-center gap-1.5 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b6b37]" />
              <span>ONLINE</span>
            </span>
            <span className="text-[#e6e4dc]">|</span>
            <span className="text-xs truncate max-w-xs">{user.email}</span>
          </div>
        </header>

        {/* Page Content Viewport with 10% subtle dot grid backdrop */}
        <main className="flex-1 overflow-auto p-6 lg:p-10 bg-grid-dots relative">{children}</main>
      </div>
    </div>
  );
}
