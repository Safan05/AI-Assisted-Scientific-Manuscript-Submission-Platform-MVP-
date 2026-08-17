"use client";

// src/app/(dashboard)/layout.tsx
import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavItem {
  code: string;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { code: "01", label: "OVERVIEW", href: "/dashboard" },
  { code: "02", label: "PROJECTS", href: "/projects" },
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
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-mono text-xs text-[#707070]">
        [ 00 · INITIALIZING SYSTEM... ]
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex text-[#111111]">
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <aside className="w-64 border-r border-[#E0E0E0] bg-[#F5F5F5] flex flex-col justify-between shrink-0">
        <div>
          {/* Logo / System mark */}
          <div className="p-6 border-b border-[#E0E0E0]">
            <div className="font-mono text-[11px] font-bold text-[#111111] tracking-wider mb-1">
              [ SWISS-01 · CORE ]
            </div>
            <div className="text-xs font-bold uppercase tracking-tight text-[#111111]">
              Manuscript Pipeline
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-[#707070]">
              NAVIGATION
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.code}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-mono tracking-wider transition-colors ${
                    isActive
                      ? "bg-[#111111] text-[#FAFAFA] font-bold"
                      : "text-[#111111] hover:bg-[#EBEBEB]"
                  }`}
                >
                  <span
                    className={
                      isActive ? "text-[#FAFAFA]" : "text-[#707070]"
                    }
                  >
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & session bottom section */}
        <div className="p-4 border-t border-[#E0E0E0] space-y-3">
          <div className="px-1">
            <div className="text-[10px] font-mono uppercase text-[#707070] tracking-wider">
              AUTHENTICATED USER
            </div>
            <div className="text-xs font-medium text-[#111111] truncate mt-0.5">
              {user.full_name || user.email}
            </div>
            <div className="text-[11px] font-mono text-[#707070] truncate">
              {user.email}
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 border border-[#E0E0E0] hover:border-[#111111] bg-white text-[11px] font-mono uppercase tracking-wider text-[#111111] hover:text-[#D0021B] transition-colors"
          >
            [ LOG OUT ]
          </button>
        </div>
      </aside>

      {/* ── Main Content Shell ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar header */}
        <header className="h-14 border-b border-[#E0E0E0] bg-[#FAFAFA] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4 text-xs font-mono text-[#707070]">
            <span>ENV: DEVELOPMENT</span>
            <span>·</span>
            <span>STORAGE: LOCAL / S3</span>
            <span>·</span>
            <span>PARSER: DOCLING v2</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-[#111111] font-medium">
              STATUS: ONLINE
            </span>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
