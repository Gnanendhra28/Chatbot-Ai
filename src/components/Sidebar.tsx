"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black">
        <h1 className="text-xl font-bold text-green-400">NeuralLog</h1>

        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg border border-zinc-700"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen w-[260px]
          bg-black border-r border-zinc-800
          transform transition-transform duration-300

          ${open ? "translate-x-0" : "-translate-x-full"}

          md:translate-x-0 md:static md:flex
        `}
      >
        <div className="flex flex-col w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h1 className="text-2xl font-bold text-green-400">NeuralLog</h1>

            <button onClick={() => setOpen(false)} className="md:hidden">
              <X size={24} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2 p-4">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl hover:bg-zinc-900"
            >
              Dashboard
            </Link>

            <Link
              href="/chat"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl hover:bg-zinc-900"
            >
              New Chat
            </Link>

            <Link
              href="/conversations"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl hover:bg-zinc-900"
            >
              Conversations
            </Link>

            <Link
              href="/knowledge"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl hover:bg-zinc-900"
            >
              Knowledge Base
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="p-3 rounded-xl hover:bg-zinc-900"
            >
              Settings
            </Link>
          </nav>
        </div>
      </aside>
    </>
  );
}
