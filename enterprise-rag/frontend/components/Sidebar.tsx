"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  MessageSquare,
  FileText,
  Database,
  ShieldCheck,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  BookOpen
} from "lucide-react";
import { ConversationItem } from "../types";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

interface SidebarProps {
  conversations?: ConversationItem[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  isOpen = true,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();

  if (!isOpen) {
    return (
      <div className="bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4 px-2 h-screen z-20 transition-all duration-300">
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition mb-4"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={onNewChat}
          className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition mb-4 shadow-lg shadow-indigo-500/20"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
        <div className="flex-1 space-y-4">
          <Link
            href="/chat"
            className={`p-2.5 rounded-lg flex items-center justify-center transition ${
              pathname === "/chat"
                ? "bg-slate-800 text-indigo-400 border border-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="Chat UI"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
          <Link
            href="/documents"
            className={`p-2.5 rounded-lg flex items-center justify-center transition ${
              pathname === "/documents"
                ? "bg-slate-800 text-indigo-400 border border-slate-700"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
            title="Knowledge Base"
          >
            <FileText className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen border-r border-slate-800/80 select-none z-20 transition-all duration-300">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide text-slate-100 block leading-tight">
              NeuralLog AI
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Enterprise RAG v2.0</span>
          </div>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-800 transition"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Nav & Chat History */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-xs">
        {/* Quick Links */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navigation
          </div>
          <div className="mt-1 space-y-1">
            <Link
              href="/chat"
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium transition ${
                pathname === "/chat"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>RAG Assistant</span>
            </Link>

            <Link
              href="/documents"
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium transition ${
                pathname === "/documents"
                  ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Knowledge Base</span>
            </Link>
          </div>
        </div>

        {/* Recent Conversations */}
        <div>
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span>Recent Chats</span>
            {conversations.length > 0 && (
              <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px]">
                {conversations.length}
              </span>
            )}
          </div>

          <div className="mt-1 space-y-1">
            {conversations.length === 0 ? (
              <div className="px-3 py-3 text-slate-500 text-[11px] text-center italic rounded-lg bg-slate-950/40 border border-slate-800/50">
                No chat history yet. Start a new query!
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConversationId === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation?.(conv.id)}
                    className={`w-full text-left flex items-center space-x-2 px-3 py-2 rounded-lg transition truncate group ${
                      isActive
                        ? "bg-slate-800 text-slate-100 font-medium border border-slate-700"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                    <span className="truncate flex-1 text-xs">
                      {conv.title || "Untitled Conversation"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* System Architecture Badges */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Engine Specs
          </div>
          <div className="mt-2 space-y-1.5 text-[11px] text-slate-400 px-2">
            <div className="flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span>pgvector (PostgreSQL 16)</span>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Groq Llama 3.3 70B</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tenant Isolation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Profile/Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <Show when="signed-out">
          <div className="flex items-center space-x-2">
            <SignInButton mode="modal">
              <button className="flex-1 text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="flex-1 text-xs font-semibold text-white px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition shadow-sm">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </Show>
        <Show when="signed-in">
          <div className="flex items-center space-x-3">
            <UserButton />
            <div className="flex-1 truncate">
              <div className="text-xs font-semibold text-slate-200 truncate">Account Active</div>
              <div className="text-[10px] text-emerald-400 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Cluster Online</span>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </aside>
  );
}
