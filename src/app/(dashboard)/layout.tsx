"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Loader2,
  Menu,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Settings,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface Conversation {
  _id: string;
  title: string;
  provider: string;
  isPinned?: boolean;
  lastMessageAt?: string;
  updatedAt: string;
}

const NAV_ITEMS = [
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function relativeTime(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return "Yesterday";
  return `${Math.floor(seconds / 86400)}d ago`;
}

function conversationGroup(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "Previous 7 Days";
  return "Older";
}

const PROVIDER_BADGES: Record<string, { label: string; color: string }> = {
  groq: { label: "Groq", color: "#3fb950" },
  openai: { label: "OpenAI", color: "#60a5fa" },
  anthropic: { label: "Claude", color: "#c084fc" },
};

const ConversationItem = memo(function ConversationItem({
  conversation,
  active,
  onSelect,
  onRename,
  onTogglePin,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = PROVIDER_BADGES[conversation.provider] ?? {
    label: conversation.provider,
    color: "var(--text-muted)",
  };
  const activityAt = conversation.lastMessageAt ?? conversation.updatedAt;

  return (
    <div className="relative group">
      <Link
        href={`/chat/${conversation._id}`}
        onClick={onSelect}
        className={cn(
          "block rounded-lg px-2.5 py-2 pr-8 transition-colors",
          active ? "bg-[var(--surface-2)]" : "hover:bg-[var(--surface-2)]",
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {conversation.isPinned && <Pin size={11} style={{ color: "var(--text-muted)" }} />}
          <span className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
            {conversation.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: badge.color }} />
            {badge.label}
          </span>
          <span>{relativeTime(activityAt)}</span>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Conversation actions for ${conversation.title}`}
        onClick={() => setMenuOpen((open) => !open)}
        className="absolute right-1.5 top-2 rounded p-1 text-[var(--text-muted)] opacity-100 hover:bg-[var(--border)] md:opacity-0 md:group-hover:opacity-100"
      >
        <MoreHorizontal size={15} />
      </button>

      {menuOpen && (
        <div className="absolute right-1 top-8 z-[70] w-36 rounded-md border p-1 shadow-xl" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <button type="button" onClick={() => { setMenuOpen(false); onRename(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]">
            <Pencil size={13} /> Rename
          </button>
          <button type="button" onClick={() => { setMenuOpen(false); onTogglePin(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--surface-2)]">
            <Pin size={13} /> {conversation.isPinned ? "Unpin" : "Pin"}
          </button>
          <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-[var(--error)] hover:bg-[var(--surface-2)]">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const pageRef = useRef(1);
  const loadingRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async (reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const nextPage = reset ? 1 : pageRef.current;
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "20" });
      if (deferredSearch) params.set("search", deferredSearch);
      const response = await fetch(`/api/conversations?${params}`);
      if (!response.ok) return;
      const data = await response.json();
      const nextConversations = data.conversations ?? [];
      setConversations((current) => reset ? nextConversations : [...current, ...nextConversations]);
      pageRef.current = nextPage + 1;
      setHasMore(nextPage < (data.pagination?.pages ?? 0));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [deferredSearch]);

  useEffect(() => {
    void loadConversations(true);
  }, [loadConversations]);

  useEffect(() => {
    const refresh = () => void loadConversations(true);
    window.addEventListener("conversation-updated", refresh);
    return () => window.removeEventListener("conversation-updated", refresh);
  }, [loadConversations]);

  const updateConversation = useCallback(async (id: string, updates: Partial<Conversation>) => {
    const previous = conversations;
    setConversations((current) => current.map((conversation) => conversation._id === id ? { ...conversation, ...updates } : conversation));
    const response = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) setConversations(previous);
  }, [conversations]);

  const deleteConversation = useCallback(async (id: string) => {
    if (!window.confirm("Delete this conversation and all of its messages?")) return;
    const previous = conversations;
    setConversations((current) => current.filter((conversation) => conversation._id !== id));
    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!response.ok) setConversations(previous);
  }, [conversations]);

  const groupedConversations = useMemo(() => {
    const groups: Record<string, Conversation[]> = { Today: [], Yesterday: [], "Previous 7 Days": [], Older: [] };
    for (const conversation of conversations.filter((item) => !item.isPinned)) {
      groups[conversationGroup(conversation.lastMessageAt ?? conversation.updatedAt)].push(conversation);
    }
    return groups;
  }, [conversations]);
  const pinnedConversations = useMemo(() => conversations.filter((conversation) => conversation.isPinned), [conversations]);

  const handleConversationScroll = (event: React.UIEvent<HTMLElement>) => {
    const element = event.currentTarget;
    if (hasMore && !loading && element.scrollTop + element.clientHeight >= element.scrollHeight - 48) {
      void loadConversations();
    }
  };

  const renderConversation = (conversation: Conversation) => (
    <ConversationItem
      key={conversation._id}
      conversation={conversation}
      active={pathname === `/chat/${conversation._id}`}
      onSelect={() => setSidebarOpen(false)}
      onRename={() => {
        const title = window.prompt("Rename conversation", conversation.title);
        if (title?.trim()) void updateConversation(conversation._id, { title: title.trim() });
      }}
      onTogglePin={() => void updateConversation(conversation._id, { isPinned: !conversation.isPinned })}
      onDelete={() => void deleteConversation(conversation._id)}
    />
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden" style={{ background: "var(--background)" }}>
      <header className="z-50 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <button type="button" onClick={() => setSidebarOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-[var(--surface-2)]" aria-label="Open sidebar">
          <Menu size={20} />
        </button>
        <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>NeuralLog</span>
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {sidebarOpen && <button type="button" aria-label="Close sidebar" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

        <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col overflow-hidden border-r transition-transform duration-300 md:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")} style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <div className="flex items-center gap-2"><Zap size={18} style={{ color: "var(--accent)" }} /><span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>NeuralLog</span></div>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded p-1.5 hover:bg-[var(--surface-2)] md:hidden" aria-label="Close sidebar"><X size={18} /></button>
          </div>

          <div className="shrink-0 px-3 pb-3">
            <Link href="/chat" onClick={() => setSidebarOpen(false)} className="btn btn-secondary w-full justify-start"><Plus size={16} /> New Chat</Link>
            <label className="relative mt-3 block">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search chats" className="input-base py-2 pl-3 pr-8 text-sm" />
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-[-90deg]" style={{ color: "var(--text-muted)" }} />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" onScroll={handleConversationScroll}>
            {pinnedConversations.length > 0 && <section className="border-t pt-3" style={{ borderColor: "var(--border)" }}><p className="px-2 pb-1 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>📌 Pinned</p>{pinnedConversations.map(renderConversation)}</section>}
            {Object.entries(groupedConversations).map(([group, items]) => items.length > 0 && <section key={group} className="border-t pt-3 first:border-t-0" style={{ borderColor: "var(--border)" }}><p className="px-2 pb-1 text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>{group}</p>{items.map(renderConversation)}</section>)}
            {!loading && conversations.length === 0 && <p className="px-2 py-6 text-center text-xs" style={{ color: "var(--text-muted)" }}>{search ? "No matching chats" : "No conversations yet"}</p>}
            {loading && <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin" style={{ color: "var(--text-muted)" }} /></div>}
          </div>

          <nav className="shrink-0 border-t p-2" style={{ borderColor: "var(--border)" }}>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-2)]", pathname.startsWith(href) && "bg-[var(--surface-2)]")} style={{ color: "var(--text-secondary)" }}><Icon size={16} />{label}</Link>)}
          </nav>

          <div className="relative z-[60] flex shrink-0 items-center gap-3 border-t p-3 pointer-events-auto" style={{ borderColor: "var(--border)" }}>
            {isLoaded && isSignedIn ? <><UserButton appearance={{ elements: { avatarBox: { width: 32, height: 32 } } }} /><span className="text-xs" style={{ color: "var(--text-muted)" }}>Account</span></> : isLoaded ? <SignInButton mode="modal"><button type="button" className="btn btn-secondary text-xs">Sign In</button></SignInButton> : null}
          </div>
        </aside>

        <main className="h-full min-w-0 flex-1 md:ml-[280px]">{children}</main>
      </div>
    </div>
  );
}
