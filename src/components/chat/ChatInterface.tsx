"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Square,
  Zap,
  Database,
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  ragEnabled?: boolean;
}

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
  conversationTitle?: string;
}

const PROVIDERS = [
  {
    id: "groq",
    label: "Groq",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
    ],
  },
  { id: "openai", label: "OpenAI", models: ["gpt-4o-mini", "gpt-4o"] },
];

export default function ChatInterface({
  conversationId: initialConvId,
  initialMessages = [],
  conversationTitle,
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(initialConvId);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]);
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ragEnabled, setRagEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neurallog-settings");

      if (saved) {
        return JSON.parse(saved).ragEnabled;
      }
    }

    return true;
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neurallog-settings");

      if (saved) {
        return JSON.parse(saved).defaultModel || "llama-3.3-70b-versatile";
      }
    }

    return "llama-3.3-70b-versatile";
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [autoScrollEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neurallog-settings");

      if (saved) {
        return JSON.parse(saved).autoScroll;
      }
    }

    return true;
  });
  useEffect(() => {
    if (autoScrollEnabled && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, autoScrollEnabled]);
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const handleCancel = useCallback(async () => {
    abortController?.abort();
    setIsLoading(false);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );

    if (conversationId) {
      await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      toast.success("Conversation cancelled");
      router.push("/conversations");
    }
  }, [abortController, conversationId, router]);

  const copyMessage = useCallback(async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const trimmed = input.trim();

    if (!trimmed || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        role: "user",
        content: trimmed,
      },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          model: selectedModel,
          ragEnabled,
        }),
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const data = await res.json();

      const fullResponse = data.content || "No response";

      let currentText = "";

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: "",
        },
      ]);

      const words = fullResponse.split(" ");

      for (let i = 0; i < words.length; i++) {
        currentText += words[i] + " ";

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: currentText,
                }
              : msg,
          ),
        );

        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";

      toast.error(msg);

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: "assistant",
          content: `Error: ${msg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "var(--background)" }}
    >
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
    fixed top-0 left-0 z-50
    h-screen w-[260px]
    transition-transform duration-300
    bg-black border-r border-zinc-800

    ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}

    md:hidden
  `}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h1 className="text-xl font-bold text-green-400">NeuralLog</h1>

          <button onClick={() => setSidebarOpen(false)} className="p-2">
            ✕
          </button>
        </div>

        <nav className="flex flex-col p-4 gap-2">
          <button
            onClick={() => {
              router.push("/dashboard");
              setSidebarOpen(false);
            }}
            className="text-left p-3 rounded-lg hover:bg-zinc-900"
          >
            Dashboard
          </button>

          <button
            onClick={() => {
              router.push("/chat");
              setSidebarOpen(false);
            }}
            className="text-left p-3 rounded-lg hover:bg-zinc-900"
          >
            New Chat
          </button>

          <button
            onClick={() => {
              router.push("/conversations");
              setSidebarOpen(false);
            }}
            className="text-left p-3 rounded-lg hover:bg-zinc-900"
          >
            Conversations
          </button>

          <button
            onClick={() => {
              router.push("/knowledge");
              setSidebarOpen(false);
            }}
            className="text-left p-3 rounded-lg hover:bg-zinc-900"
          >
            Knowledge Base
          </button>

          <button
            onClick={() => {
              router.push("/settings");
              setSidebarOpen(false);
            }}
            className="text-left p-3 rounded-lg hover:bg-zinc-900"
          >
            Settings
          </button>
        </nav>
      </aside>
      {/* Header */}

      <div
        className="flex items-center justify-between px-3 md:px-4 py-3 gap-2 flex-wrap sticky top-0 z-30 backdrop-blur"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="
    md:hidden
    p-2 rounded-lg
    border border-[var(--border)]
  "
          ></button>
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: conversationId
                ? "var(--success)"
                : "var(--text-muted)",
              boxShadow: conversationId ? "0 0 6px var(--success)" : "none",
            }}
          />
          <span
            className="text-xs md:text-sm font-medium truncate max-w-[120px] md:max-w-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {conversationTitle ??
              (conversationId ? "Active Conversation" : "New Conversation")}
          </span>
          {conversationId && (
            <span className="tag tag-muted">{conversationId.slice(-8)}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* RAG Toggle */}
          <button
            onClick={() => setRagEnabled(!ragEnabled)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-all",
              ragEnabled ? "tag tag-accent" : "btn btn-ghost",
            )}
            title="Toggle RAG (knowledge base retrieval)"
          >
            <Database size={12} />
            RAG {ragEnabled ? "ON" : "OFF"}
          </button>

          {/* Provider selector */}
          <div className="relative">
            <button
              className="btn btn-secondary text-[10px] md:text-xs flex items-center gap-1 px-2 py-1.5 max-w-[160px] truncate"
              onClick={() => setShowProviderMenu(!showProviderMenu)}
            >
              <Zap size={12} style={{ color: "var(--accent)" }} />
              {selectedProvider.label} /{" "}
              {selectedModel.split("-").slice(0, 2).join("-")}
              <ChevronDown size={12} />
            </button>

            {showProviderMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden animate-fade-in"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  minWidth: 220,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                {PROVIDERS.map((p) => (
                  <div key={p.id}>
                    <div
                      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider"
                      style={{
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {p.label}
                    </div>
                    {p.models.map((m) => (
                      <button
                        key={m}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--surface-2)] transition-colors"
                        style={{
                          color:
                            selectedModel === m
                              ? "var(--accent)"
                              : "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                        }}
                        onClick={() => {
                          setSelectedProvider(p);
                          setSelectedModel(m);
                          setShowProviderMenu(false);
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancel */}
          {isLoading && (
            <button onClick={handleCancel} className="btn btn-danger text-xs">
              <Square size={12} />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 md:py-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--accent-dim)",
                border: "1px solid rgba(0,255,148,0.2)",
              }}
            >
              <Zap size={24} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <p
                className="font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Start a conversation
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Powered by {selectedProvider.label} · {selectedModel}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 max-w-md w-full">
              {[
                "Explain transformer architecture",
                "Write a Python async function",
                "Compare REST vs GraphQL",
                "Summarize the CAP theorem",
              ].map((q) => (
                <button
                  key={q}
                  className="text-left text-xs px-3 py-2.5 rounded-lg transition-all hover:border-[var(--accent)]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => {
                    setInput(q);
                    textareaRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-[95%] md:max-w-3xl mx-auto flex flex-col gap-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3 animate-slide-up group",
                msg.role === "user" && "flex-row-reverse",
              )}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                style={{
                  background:
                    msg.role === "user"
                      ? "var(--surface-2)"
                      : "var(--accent-dim)",
                  color:
                    msg.role === "user"
                      ? "var(--text-secondary)"
                      : "var(--accent)",
                  border: `1px solid ${msg.role === "user" ? "var(--border)" : "rgba(0,255,148,0.2)"}`,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {msg.role === "user" ? "U" : "AI"}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "relative max-w-[92%] md:max-w-[80%] rounded-xl px-4 py-3",
                  msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm",
                )}
                style={{
                  background:
                    msg.role === "user" ? "var(--surface-2)" : "var(--surface)",
                  border: `1px solid ${msg.role === "user" ? "var(--border)" : "var(--border)"}`,
                }}
              >
                {msg.ragEnabled && msg.role === "assistant" && (
                  <span className="tag tag-accent mb-2 inline-flex">
                    <Database size={9} /> RAG
                  </span>
                )}

                {msg.role === "assistant" ? (
                  <div className="markdown-content text-sm">
                    {msg.isStreaming && !msg.content ? (
                      <div className="flex gap-1 items-center py-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: "var(--accent)",
                              animation: `pulseDot 1.4s ease-in-out ${i * 0.15}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    )}
                    {msg.isStreaming && (
                      <span
                        className="inline-block w-0.5 h-4 ml-0.5 align-middle"
                        style={{
                          background: "var(--accent)",
                          animation: "pulseDot 0.8s ease-in-out infinite",
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <p
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {msg.content}
                  </p>
                )}

                {/* Copy button */}
                {!msg.isStreaming && msg.content && (
                  <button
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                    style={{ color: "var(--text-muted)" }}
                    onClick={() => copyMessage(msg.id, msg.content)}
                  >
                    {copiedId === msg.id ? (
                      <Check size={12} style={{ color: "var(--success)" }} />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="
    px-3 md:px-4
    py-3
    sticky bottom-0 z-20
    backdrop-blur
  "
        style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(10,10,10,0.92)",
        }}
      >
        s
        <div className="max-w-[95%] md:max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div
              className="flex items-end gap-2 rounded-xl p-2"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={() => {}}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message… (Shift+Enter for newline)"
                rows={1}
                className="
  flex-1
  bg-transparent
  outline-none
  resize-none
  text-sm md:text-base
  py-2 px-2
  min-h-[44px]
  max-h-[160px]
"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                  maxHeight: 200,
                  lineHeight: "1.6",
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="h-11 w-11 md:h-auto md:w-auto flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{
                  background:
                    input.trim() && !isLoading
                      ? "var(--accent)"
                      : "var(--surface)",
                  color:
                    input.trim() && !isLoading ? "#000" : "var(--text-muted)",
                }}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <p
              className="text-xs mt-1.5 text-center"
              style={{ color: "var(--text-muted)" }}
            >
              {ragEnabled ? "📚 Knowledge base active · " : ""}
              {selectedProvider.label} · {selectedModel}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
