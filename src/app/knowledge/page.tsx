"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Eye,
  X,
  Search,
  Layers,
  Sparkles,
  Calendar,
} from "lucide-react";

interface KnowledgeDoc {
  _id: string;
  filename: string;
  mimeType: string;
  characterCount: number;
  chunkCount: number;
  pageCount?: number;
  status: "processing" | "ready" | "error";
  createdAt: string;
  metadata?: {
    fileSize?: number;
    indexedInQdrant?: boolean;
    vectorDimension?: number;
    embeddingProvider?: string;
  };
}

interface ChunkDetail {
  text: string;
  index: number;
  pageNumber?: number;
  characterCount?: number;
  tokenCount?: number;
  hasEmbedding?: boolean;
  vectorDimension?: number;
}

interface DocDetailsResponse extends KnowledgeDoc {
  content: string;
  chunks: ChunkDetail[];
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocDetails, setSelectedDocDetails] = useState<DocDetailsResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState<"chunks" | "preview">("chunks");
  const [chunkFilter, setChunkFilter] = useState("");

  // =========================
  // Fetch docs
  // =========================
  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Auto refresh while processing
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  // Upload document
  const uploadDocument = async () => {
    if (!file) return;

    setError("");
    setSuccess("");

    if (file.size > 25 * 1024 * 1024) {
      setError("File size exceeds the 25 MB upload limit.");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess("Document uploaded and indexed successfully");
      setFile(null);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const deleteDocument = async (id: string) => {
    try {
      await fetch(`/api/knowledge?id=${id}`, {
        method: "DELETE",
      });
      if (selectedDocId === id) {
        setSelectedDocId(null);
        setSelectedDocDetails(null);
      }
      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Document Modal
  const openDocumentPreview = async (id: string) => {
    setSelectedDocId(id);
    setLoadingDetails(true);
    setChunkFilter("");
    setModalTab("chunks");

    try {
      const res = await fetch(`/api/knowledge/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedDocDetails(data.document);
      }
    } catch (err) {
      console.error("Failed to load document details", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredChunks = (selectedDocDetails?.chunks || []).filter((c) =>
    chunkFilter
      ? c.text.toLowerCase().includes(chunkFilter.toLowerCase()) ||
        String(c.pageNumber || "").includes(chunkFilter)
      : true,
  );

  return (
    <div
      className="min-h-screen p-6 md:p-8"
      style={{
        background: "var(--background)",
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: "var(--accent)",
              boxShadow: "0 0 10px var(--accent)",
            }}
          />

          <span
            className="text-xs uppercase tracking-[0.3em]"
            style={{
              color: "var(--accent)",
              fontFamily: "var(--font-mono)",
            }}
          >
            NeuralLog RAG Platform
          </span>
        </div>

        <h1
          className="text-4xl font-bold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          Knowledge Base & Vector Store
        </h1>

        <p
          className="mt-2 text-sm"
          style={{
            color: "var(--text-secondary)",
          }}
        >
          Upload PDF, Text, and Markdown documents to chunk, embed, and index into Qdrant for semantic search.
        </p>
      </div>

      {/* Upload Card */}
      <div
        className="rounded-2xl border p-6 mb-8"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <Database
            size={18}
            style={{
              color: "var(--accent)",
            }}
          />

          <h2
            className="text-lg font-semibold"
            style={{
              color: "var(--text-primary)",
            }}
          >
            Upload & Index Knowledge Documents
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="file"
            accept=".txt,.md,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="flex-1 rounded-xl border px-4 py-3 text-sm"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />

          <button
            onClick={uploadDocument}
            disabled={!file || uploading}
            className="px-5 py-3 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            style={{
              background: "var(--accent)",
              color: "#000",
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing & Indexing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload & Embed
              </>
            )}
          </button>
        </div>

        {/* Messages */}
        {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
        {success && <div className="mt-4 text-sm text-green-500">{success}</div>}

        <p
          className="text-xs mt-4"
          style={{
            color: "var(--text-muted)",
          }}
        >
          Supported: PDF, TXT, Markdown • Max 25MB • Recursive Chunking & Qdrant Vector Indexing
        </p>
      </div>

      {/* Documents Grid */}
      <div className="grid gap-5">
        {documents.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <FileText
              size={40}
              className="mx-auto mb-4"
              style={{
                color: "var(--text-muted)",
              }}
            />

            <h3
              className="text-lg font-medium mb-2"
              style={{
                color: "var(--text-primary)",
              }}
            >
              No Documents Uploaded
            </h3>

            <p
              className="text-sm"
              style={{
                color: "var(--text-secondary)",
              }}
            >
              Upload files to extract text, chunk recursively, generate embeddings, and index in Qdrant.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className="rounded-2xl border p-5 transition-all hover:border-[var(--accent)]"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-xl flex-shrink-0"
                    style={{
                      background: "rgba(0,255,148,0.08)",
                      border: "1px solid rgba(0,255,148,0.15)",
                    }}
                  >
                    <FileText
                      size={22}
                      style={{
                        color: "var(--accent)",
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3
                        className="text-lg font-semibold"
                        style={{
                          color: "var(--text-primary)",
                        }}
                      >
                        {doc.filename}
                      </h3>

                      {/* Vector Indexed Badge */}
                      {doc.status === "ready" && (
                        <span
                          className="px-2.5 py-0.5 rounded-md text-[11px] font-mono flex items-center gap-1"
                          style={{
                            background: "rgba(0,255,148,0.1)",
                            border: "1px solid rgba(0,255,148,0.25)",
                            color: "#00ff94",
                          }}
                        >
                          <Sparkles size={11} /> Qdrant 384d Vector
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span>📄 {doc.pageCount || 1} {doc.pageCount === 1 ? "page" : "pages"}</span>
                      <span>🧩 {doc.chunkCount} chunks</span>
                      <span>📝 {doc.characterCount.toLocaleString()} chars</span>
                      <span>📁 {doc.mimeType}</span>
                      <span><Calendar size={12} className="inline mr-1" />{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Status */}
                  <div
                    className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2"
                    style={{
                      background:
                        doc.status === "ready"
                          ? "rgba(0,255,148,0.1)"
                          : doc.status === "processing"
                            ? "rgba(245,158,11,0.1)"
                            : "rgba(239,68,68,0.1)",
                      color:
                        doc.status === "ready"
                          ? "#00ff94"
                          : doc.status === "processing"
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    {doc.status === "ready" && <CheckCircle2 size={14} />}
                    {doc.status === "processing" && <Loader2 size={14} className="animate-spin" />}
                    {doc.status === "error" && <AlertTriangle size={14} />}
                    {doc.status}
                  </div>

                  {/* Preview / Chunks Button */}
                  <button
                    onClick={() => openDocumentPreview(doc._id)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Eye size={14} style={{ color: "var(--accent)" }} />
                    View Chunks
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteDocument(doc._id)}
                    className="p-2 rounded-lg transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "#ef4444",
                    }}
                    title="Delete Document & Vectors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chunk Inspector / Document Preview Modal */}
      {selectedDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-4xl max-h-[90vh] rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {/* Modal Header */}
            <div
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <FileText size={20} style={{ color: "var(--accent)" }} />
                <div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selectedDocDetails?.filename || "Loading document..."}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {selectedDocDetails?.pageCount || 1} pages · {selectedDocDetails?.chunkCount || 0} chunks ·{" "}
                    {selectedDocDetails?.characterCount?.toLocaleString() || 0} characters
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedDocId(null);
                  setSelectedDocDetails(null);
                }}
                className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs & Search */}
            <div
              className="px-6 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalTab("chunks")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    modalTab === "chunks" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  <Layers size={13} />
                  Chunks ({selectedDocDetails?.chunks?.length || 0})
                </button>
                <button
                  onClick={() => setModalTab("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                    modalTab === "preview" ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)] hover:text-white"
                  }`}
                >
                  <FileText size={13} />
                  Full Clean Text
                </button>
              </div>

              {modalTab === "chunks" && (
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={chunkFilter}
                    onChange={(e) => setChunkFilter(e.target.value)}
                    placeholder="Search chunk text or page #..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none border"
                    style={{
                      background: "var(--surface)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingDetails ? (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                  <span className="text-xs text-[var(--text-muted)] font-mono">Loading document chunks & vectors...</span>
                </div>
              ) : modalTab === "chunks" ? (
                filteredChunks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No chunks found matching &quot;{chunkFilter}&quot;
                  </div>
                ) : (
                  filteredChunks.map((chunk) => (
                    <div
                      key={chunk.index}
                      className="rounded-xl border p-4 transition-all hover:border-[var(--accent)]"
                      style={{
                        background: "var(--surface)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2 py-0.5 rounded font-mono font-semibold"
                            style={{
                              background: "rgba(0,255,148,0.1)",
                              color: "#00ff94",
                            }}
                          >
                            Chunk #{chunk.index + 1}
                          </span>
                          {chunk.pageNumber && (
                            <span className="px-2 py-0.5 rounded font-mono" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                              Page {chunk.pageNumber}
                            </span>
                          )}
                          <span style={{ color: "var(--text-muted)" }}>
                            {chunk.characterCount} chars · ~{chunk.tokenCount} tokens
                          </span>
                        </div>

                        {chunk.hasEmbedding && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded text-emerald-400 bg-emerald-950/50 border border-emerald-800/40">
                            ⚡ 384d Qdrant Vector Embedded
                          </span>
                        )}
                      </div>

                      <p className="text-xs leading-relaxed whitespace-pre-wrap font-mono" style={{ color: "var(--text-primary)" }}>
                        {chunk.text}
                      </p>
                    </div>
                  ))
                )
              ) : (
                <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono p-4 rounded-xl border bg-[var(--surface-2)] text-[var(--text-primary)]" style={{ borderColor: "var(--border)" }}>
                  {selectedDocDetails?.content || "No raw text content available."}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

