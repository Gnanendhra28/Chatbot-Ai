"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BarChart3,
  BookOpen,
  Settings,
  List,
  PlusCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, exact: true },
  { href: "/chat", label: "New Chat", icon: PlusCircle, exact: true },
  { href: "/conversations", label: "Conversations", icon: List, exact: false },
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen, exact: false },
  { href: "/settings", label: "Settings", icon: Settings, exact: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className="h-screen overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* MOBILE TOP BAR */}
      <div
        className="
        md:hidden
        flex items-center
        h-14
        px-4
        border-b
        sticky top-0 z-40
      "
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <button onClick={() => setMobileOpen(true)} className="p-2 rounded-md">
          <Menu size={20} />
        </button>

        <span className="ml-3 font-bold" style={{ color: "var(--accent)" }}>
          NeuralLog
        </span>
      </div>

      <div className="flex h-[calc(100vh-56px)] md:h-screen overflow-hidden"></div>
      {/* MOBILE OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          `
    fixed md:static
    z-50 md:z-auto
    h-full
    flex flex-col
    transition-all duration-300 ease-in-out
    md:translate-x-0
    `,
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          width:
            typeof window !== "undefined" && window.innerWidth < 768
              ? 260
              : collapsed
                ? 56
                : 240,
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-4 overflow-hidden"
          style={{ borderBottom: "1px solid var(--border)", height: 56 }}
        >
          <div className="relative flex-shrink-0">
            <Zap
              size={18}
              style={{
                color: "var(--accent)",
                filter: "drop-shadow(0 0 6px var(--accent))",
              }}
            />
          </div>
          {!collapsed && (
            <span
              className="font-bold text-sm tracking-tight"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              NeuralLog
            </span>
          )}
          <button onClick={() => setMobileOpen(false)} className="md:hidden">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-all duration-100 relative group",
                  active
                    ? "text-black font-medium"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
                )}
                style={
                  active ? { background: "var(--accent)", color: "#000" } : {}
                }
                title={collapsed ? label : undefined}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div
          className="px-2 py-3 flex flex-col gap-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div
            className={cn(
              "flex items-center",
              collapsed ? "justify-center" : "gap-2 px-1",
            )}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: 28, height: 28 },
                },
              }}
            />
            {!collapsed && (
              <span
                className="text-xs truncate"
                style={{ color: "var(--text-muted)" }}
              >
                Account
              </span>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1.5 rounded-md transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-muted)" }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto w-full min-w-0">{children}</main>
    </div>
  );
}
