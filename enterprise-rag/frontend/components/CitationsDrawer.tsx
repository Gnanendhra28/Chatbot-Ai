"use client";

import { useState } from "react";
import { X, FileText, Copy, Check, ExternalLink, Layers, Sparkles } from "lucide-react";
import { Citation } from "../types";

interface CitationsDrawerProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationsDrawer({ citation, onClose }: CitationsDrawerProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(citation.text_snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate score percentage
  const scorePercent = Math.min(Math.round(citation.score * 100), 100);

  // Score color gradient
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "from-emerald-500 to-teal-400 text-emerald-400";
    if (score >= 0.6) return "from-indigo-500 to-blue-400 text-indigo-400";
    return "from-amber-500 to-orange-400 text-amber-400";
  };

  return (
    <aside className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-screen text-slate-100 z-10 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <span>Source Inspector</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-5 text-xs">
        {/* Document Info Card */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Source File</span>
            <span className="bg-indigo-600/20 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-mono">
              Page {citation.page_number}
            </span>
          </div>
          <div className="text-slate-200 font-semibold text-sm break-all flex items-center space-x-1.5">
            <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>{citation.filename}</span>
          </div>
        </div>

        {/* Semantic Similarity Gauge */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Cosine Similarity</span>
            </span>
            <span className={`font-mono font-bold text-xs ${getScoreColor(citation.score)}`}>
              {(citation.score * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getScoreColor(citation.score)} transition-all duration-500`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-500 flex justify-between pt-0.5">
            <span>Low Vector Match</span>
            <span>Exact Match</span>
          </div>
        </div>

        {/* Metadata Details */}
        {(citation.chunk_id || citation.section) && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
            {citation.section && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] uppercase font-semibold">Section:</span>
                <span className="text-slate-300 font-medium">{citation.section}</span>
              </div>
            )}
            {citation.chunk_id && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-[10px] uppercase font-semibold flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>Chunk ID:</span>
                </span>
                <span className="text-slate-400 font-mono text-[10px] truncate max-w-[140px]">
                  {citation.chunk_id}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Text Snippet Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              Extracted Vector Snippet:
            </span>
            <button
              onClick={handleCopySnippet}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 bg-indigo-600/10 hover:bg-indigo-600/20 px-2 py-1 rounded transition border border-indigo-500/30"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Snippet</span>
                </>
              )}
            </button>
          </div>
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px] leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30 selection:text-indigo-200">
            {citation.text_snippet}
          </div>
        </div>
      </div>
    </aside>
  );
}
