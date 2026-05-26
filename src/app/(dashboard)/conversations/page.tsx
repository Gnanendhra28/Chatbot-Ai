"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Play,
  XCircle,
  Trash2,
  Search,
  RefreshCw,
  Plus,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";

interface Conversation {
  _id: string;
  title: string;
  status: "active" | "archived" | "cancelled";
  provider: string;
  model: string;
  messageCount: number;
  totalTokens: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG = {
  active: { label: "Active", class: "tag-success" },
  archived: { label: "Archived", class: "tag-muted" },
  cancelled: { label: "Cancelled", class: "tag-error" },
};

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [total, setTotal] = useState(0);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations ?? []);
      setTotal(data.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  const handleCancel = async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      toast.success("Conversation cancelled");
      fetchConversations();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this conversation and all its messages?")) return;
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      toast.success("Deleted");
      fetchConversations();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--text-primary)",
            }}
          >
            Conversations
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {total} total conversations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchConversations}
            className="btn btn-ghost"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <Link href="/chat" className="btn btn-primary">
            <Plus size={14} />
            New Chat
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            className="input-base pl-9 text-sm"
            placeholder="Search conversations…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "cancelled", "archived"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`btn text-xs capitalize ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--accent)" }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <MessageSquare size={32} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No conversations found
            </p>
            <Link href="/chat" className="btn btn-primary mt-2 text-xs">
              <Plus size={12} /> Start one
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[
                  "Title",
                  "Status",
                  "Provider",
                  "Messages",
                  "Tokens",
                  "Updated",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((conv) => (
                <tr
                  key={conv._id}
                  className="group transition-colors hover:bg-[var(--surface-2)]"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare
                        size={14}
                        style={{ color: "var(--text-muted)" }}
                      />
                      <span
                        className="text-sm font-medium truncate max-w-[240px]"
                        title={conv.title}
                      >
                        {conv.title}
                      </span>
                    </div>
                    <p
                      className="text-xs mt-0.5 font-mono ml-5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      #{conv._id.slice(-8)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`tag ${STATUS_CONFIG[conv.status]?.class ?? "tag-muted"}`}
                    >
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-mono"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {conv.provider || "unknown"}/
                      {conv.model
                        ? conv.model.split("-").slice(0, 2).join("-")
                        : "no-model"}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-center"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {conv.messageCount}
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-mono"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {conv.totalTokens.toLocaleString()}
                  </td>
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatDistanceToNow(new Date(conv.updatedAt), {
                      addSuffix: true,
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {conv.status === "active" && (
                        <Link
                          href={`/chat/${conv._id}`}
                          className="btn btn-ghost p-1.5"
                          title="Resume"
                        >
                          <Play size={13} style={{ color: "var(--accent)" }} />
                        </Link>
                      )}
                      {conv.status === "active" && (
                        <button
                          onClick={() => handleCancel(conv._id)}
                          className="btn btn-ghost p-1.5"
                          title="Cancel"
                        >
                          <XCircle
                            size={13}
                            style={{ color: "var(--warning)" }}
                          />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(conv._id)}
                        className="btn btn-ghost p-1.5"
                        title="Delete"
                      >
                        <Trash2 size={13} style={{ color: "var(--error)" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
