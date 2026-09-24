"use client";

import Link from "next/link";
import { MessageSquare, FileText, Database, CheckCircle2, Sparkles, Cpu, ShieldCheck } from "lucide-react";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Sidebar } from "../components/Sidebar";

export default function Home() {
  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-200">NeuralLog AI</span>
          </div>

          <div className="flex items-center space-x-3">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700">
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
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
        <div className="space-y-3 pt-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NeuralLog AI • Generative RAG Platform</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Enterprise Document Intelligence & Inference Observability
          </h1>
          <p className="text-slate-400 text-base max-w-3xl leading-relaxed">
            Production-grade Retrieval-Augmented Generation architecture built with Python 3.13, FastAPI, PostgreSQL + pgvector, Groq Llama 3.3, and Next.js 15.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/chat"
            className="p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition group shadow-lg hover:shadow-indigo-500/5"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">ChatGPT-Style RAG Assistant</h2>
                <span className="text-xs text-indigo-400 font-mono">/chat</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ask questions about your uploaded documents. Interactive source citation drawer, prompt suggestion cards, model switcher, and real-time thread history.
            </p>
          </Link>

          <Link
            href="/documents"
            className="p-6 bg-slate-900 border border-slate-800 hover:border-indigo-500/60 rounded-2xl transition group shadow-lg hover:shadow-indigo-500/5"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Knowledge Base Ingestion</h2>
                <span className="text-xs text-indigo-400 font-mono">/documents</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload PDF documents for page text extraction, recursive chunking, and 384-dimensional dense vector indexing.
            </p>
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
          <h3 className="text-lg font-semibold text-slate-200 flex items-center space-x-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <span>System Architecture Specs</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>FastAPI async endpoints with Pydantic v2 schemas</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>SQLAlchemy 2 ORM with pgvector HNSW / IVF Flat index</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Sentence Transformers 384-dim dense embeddings</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Groq Cloud API integration for Llama 3.3 70B inference</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Multi-tenant document isolation and security rules</span>
            </div>
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
              <span>Next.js 15 App Router & Tailwind CSS UI</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
