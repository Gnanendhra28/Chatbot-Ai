"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  FileText,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Database,
  Sliders,
  ChevronDown,
  Trash2,
  BookOpen,
  Zap,
  ShieldAlert,
  Menu
} from "lucide-react";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { MessageItem, Citation } from "../types";

interface ChatWindowProps {
  messages: MessageItem[];
  isLoading: boolean;
  ragEnabled: boolean;
  onToggleRag: (enabled: boolean) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  onSendMessage: (msg: string) => void;
  onRegenerateMessage?: () => void;
  onNewChat?: () => void;
  onSelectCitation?: (citation: Citation) => void;
  onToggleSidebar?: () => void;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: FileText,
    title: "Summarize Policy Documents",
    desc: "Generate an executive summary of uploaded PDF files",
    prompt: "Summarize the key policy guidelines and terms from the uploaded documents.",
  },
  {
    icon: Zap,
    title: "Refund & Payment Terms",
    desc: "What are the rules and timelines for customer refunds?",
    prompt: "What is our refund policy timeline and what conditions must be met?",
  },
  {
    icon: ShieldAlert,
    title: "Security & Data Governance",
    desc: "Explain our data privacy and access control rules",
    prompt: "What security measures and access controls are enforced for document storage?",
  },
  {
    icon: BookOpen,
    title: "HR & Employee Benefits",
    desc: "Check rules for leaves, travel, and office perks",
    prompt: "What are the employee leave policies and holiday entitlements?",
  },
];

export function ChatWindow({
  messages,
  isLoading,
  ragEnabled,
  onToggleRag,
  selectedModel,
  onSelectModel,
  onSendMessage,
  onRegenerateMessage,
  onNewChat,
  onSelectCitation,
  onToggleSidebar,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Header Bar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Model Selector */}
          <div className="relative flex items-center">
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="qwen/qwen3.8-27b">⚡ Groq: Qwen 3.8 27B</option>
              <option value="openai/gpt-oss-120b">⚡ Groq: GPT-OSS 120B</option>
              <option value="gemini-3.5-flash">✨ Google: Gemini 3.5 Flash</option>
              <option value="gemini-3.5-flash-lite">✨ Google: Gemini 3.5 Flash Lite</option>
              <option value="gpt-4o-mini">🤖 OpenAI: GPT-4o Mini</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>

          {/* RAG Switch */}
          <button
            onClick={() => onToggleRag(!ragEnabled)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              ragEnabled
                ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
                : "bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${ragEnabled ? "text-indigo-400" : "text-slate-500"}`} />
            <span>RAG Context: {ragEnabled ? "ON" : "OFF"}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                ragEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
              }`}
            />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition shadow-sm">
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>

          {onNewChat && (
            <button
              onClick={onNewChat}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition flex items-center space-x-1.5 border border-slate-800"
              title="Reset Chat Session"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
        {messages.length === 0 ? (
          /* Empty Welcome Canvas */
          <div className="max-w-3xl mx-auto h-full flex flex-col justify-center items-center text-center space-y-8 py-12">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20 ring-4 ring-indigo-500/10">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-100">
                What would you like to explore today?
              </h2>
              <p className="text-slate-400 text-sm max-w-lg mx-auto">
                Ask questions backed by page-level citations from your pgvector Knowledge Base.
              </p>
            </div>

            {/* Interactive Prompt Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl">
              {PROMPT_SUGGESTIONS.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(item.prompt)}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 text-left transition group shadow-sm hover:shadow-indigo-500/5 active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-2.5 text-indigo-400 mb-1.5">
                      <IconComponent className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold text-xs text-slate-200">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Message List */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3.5 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className="space-y-2 max-w-2xl">
                    {/* Bubble */}
                    <div
                      className={`rounded-2xl p-4 text-sm leading-relaxed ${
                        isUser
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                          : "bg-slate-900 border border-slate-800/90 text-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap selection:bg-indigo-500/30">
                        {msg.content}
                      </div>

                      {/* Interactive Citations Badges */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                          <div className="text-[11px] font-semibold text-indigo-400 flex items-center space-x-1.5">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Verified Grounding Sources ({msg.sources.length}):</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((cit, idx) => (
                              <button
                                key={idx}
                                onClick={() => onSelectCitation?.(cit)}
                                className="text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 hover:border-indigo-500/40 transition flex items-center space-x-1.5 font-mono shadow-sm group"
                              >
                                <span className="text-indigo-400 font-bold">
                                  [{cit.citation_index || idx + 1}]
                                </span>
                                <span className="truncate max-w-[140px]">{cit.filename}</span>
                                <span className="text-slate-500 text-[10px]">p.{cit.page_number}</span>
                                <span className="bg-indigo-500/10 text-indigo-400 text-[9px] px-1 rounded group-hover:bg-indigo-500/20">
                                  {(cit.score * 100).toFixed(0)}%
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Bar for AI Response */}
                    {!isUser && (
                      <div className="flex items-center space-x-3 text-slate-400 text-xs px-1">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="hover:text-slate-200 flex items-center space-x-1 transition"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400 text-[11px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
                          )}
                        </button>

                        {onRegenerateMessage && (
                          <button
                            onClick={onRegenerateMessage}
                            className="hover:text-slate-200 flex items-center space-x-1 transition"
                            title="Regenerate response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Regenerate</span>
                          </button>
                        )}

                        <div className="flex items-center space-x-1 border-l border-slate-800 pl-2">
                          <button className="hover:text-slate-200 p-0.5 rounded" title="Helpful">
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button className="hover:text-slate-200 p-0.5 rounded" title="Not helpful">
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Avatar */}
                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center space-x-3 text-slate-400 text-xs bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl max-w-md animate-pulse">
                <div className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span>Searching vector database & synthesizing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Input Area */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur z-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          <div className="relative flex items-center bg-slate-950 border border-slate-800 focus-within:border-indigo-500/70 rounded-2xl shadow-xl transition overflow-hidden">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your document knowledge base... (Press Enter to send)"
              disabled={isLoading}
              className="w-full bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-40 min-h-[52px]"
            />
            <div className="pr-3 flex items-center space-x-2">
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white p-2.5 rounded-xl font-medium transition shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 px-2">
            <span>NeuralLog AI • Page-grounded RAG Engine</span>
            <span>Press Shift+Enter for new line</span>
          </div>
        </form>
      </div>
    </div>
  );
}
