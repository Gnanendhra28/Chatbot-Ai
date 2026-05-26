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
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: BarChart3,
  },
  {
    href: "/chat",
    label: "New Chat",
    icon: PlusCircle,
  },
  {
    href: "/conversations",
    label: "Conversations",
    icon: List,
  },
  {
    href: "/knowledge",
    label: "Knowledge Base",
    icon: BookOpen,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="
        h-screen
        w-screen
        overflow-hidden
        flex flex-col
      "
      style={{
        background: "var(--background)",
      }}
    >
      {/* TOP BAR */}
      <header
        className="
          h-14
          flex items-center
          gap-3
          px-4
          border-b
          shrink-0
          z-50
        "
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        {/* MENU BUTTON */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="
            flex items-center justify-center
            h-9 w-9
            rounded-md
            hover:bg-[var(--surface-2)]
            transition-colors
          "
        >
          <Menu size={20} />
        </button>

        {/* LOGO */}
        <div className="flex items-center gap-2">
          <Zap
            size={18}
            style={{
              color: "var(--accent)",
              filter: "drop-shadow(0 0 6px var(--accent))",
            }}
          />

          <span
            className="font-bold text-sm"
            style={{
              fontFamily: "var(--font-display)",
            }}
          >
            NeuralLog
          </span>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* OVERLAY */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={cn(
            `
              fixed top-0 left-0 z-50
              h-screen
              w-[260px]
              flex flex-col
              transition-transform duration-300
            `,
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
          style={{
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {/* SIDEBAR HEADER */}
          <div
            className="
              h-14
              px-4
              flex items-center justify-between
              border-b
              shrink-0
            "
            style={{
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-2">
              <Zap
                size={18}
                style={{
                  color: "var(--accent)",
                }}
              />

              <span
                className="font-bold text-sm"
                style={{
                  fontFamily: "var(--font-display)",
                }}
              >
                NeuralLog
              </span>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="
                h-8 w-8
                rounded-md
                flex items-center justify-center
                hover:bg-[var(--surface-2)]
              "
            >
              <X size={18} />
            </button>
          </div>

          {/* NAVIGATION */}
          <nav
            className="
              flex-1
              overflow-y-auto
              p-2
              flex flex-col gap-1
            "
          >
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    `
                      flex items-center gap-3
                      px-3 py-2.5
                      rounded-lg
                      text-sm
                      transition-colors
                    `,
                    active ? "text-black" : "hover:bg-[var(--surface-2)]",
                  )}
                  style={
                    active
                      ? {
                          background: "var(--accent)",
                        }
                      : {
                          color: "var(--text-secondary)",
                        }
                  }
                >
                  <Icon size={18} />

                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* ACCOUNT */}
          <div
            className="
              p-3
              border-t
              flex items-center gap-3
              shrink-0
            "
            style={{
              borderColor: "var(--border)",
            }}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: {
                    width: 32,
                    height: 32,
                  },
                },
              }}
            />

            <div>
              <p
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                }}
              >
                Account
              </p>
            </div>
          </div>
        </aside>

        {/* PAGE CONTENT */}
        <main
          className="
            flex-1
            w-full
            min-w-0
            h-[calc(100vh-56px)]
          "
        >
          {children}
        </main>
      </div>
    </div>
  );
}
