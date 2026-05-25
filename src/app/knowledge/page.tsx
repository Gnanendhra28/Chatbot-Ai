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
} from "lucide-react";

interface KnowledgeDoc {
  _id: string;

  filename: string;

  mimeType: string;

  characterCount: number;

  chunkCount: number;

  status: "processing" | "ready" | "error";

  createdAt: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);

  const [uploading, setUploading] = useState(false);

  const [file, setFile] = useState<File | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

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

  // =========================
  // Initial fetch
  // =========================
  useEffect(() => {
    fetchDocuments();
  }, []);

  // =========================
  // Auto refresh while processing
  // =========================
  useEffect(() => {
    const hasProcessing = documents.some((doc) => doc.status === "processing");

    if (!hasProcessing) {
      return;
    }

    const interval = setInterval(() => {
      fetchDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  // =========================
  // Upload document
  // =========================
  const uploadDocument = async () => {
    if (!file) return;

    setError("");
    setSuccess("");

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");

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

      setSuccess("Document uploaded successfully");

      setFile(null);

      fetchDocuments();
    } catch (err) {
      console.error(err);

      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // =========================
  // Delete document
  // =========================
  const deleteDocument = async (id: string) => {
    try {
      await fetch(`/api/knowledge?id=${id}`, {
        method: "DELETE",
      });

      fetchDocuments();
    } catch (err) {
      console.error(err);
    }
  };

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
            NeuralLog RAG
          </span>
        </div>

        <h1
          className="text-4xl font-bold"
          style={{
            color: "var(--text-primary)",

            fontFamily: "var(--font-display)",
          }}
        >
          Knowledge Base
        </h1>

        <p
          className="mt-2 text-sm"
          style={{
            color: "var(--text-secondary)",
          }}
        >
          Upload documents for Retrieval-Augmented Generation.
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
            Upload Knowledge Documents
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
                Uploading
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload
              </>
            )}
          </button>
        </div>

        {/* Messages */}
        {error && <div className="mt-4 text-sm text-red-500">{error}</div>}

        {success && (
          <div className="mt-4 text-sm text-green-500">{success}</div>
        )}

        <p
          className="text-xs mt-4"
          style={{
            color: "var(--text-muted)",
          }}
        >
          Supported: PDF, TXT, Markdown • Max 5MB
        </p>
      </div>

      {/* Documents */}
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
              Upload files to enable real RAG retrieval.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className="rounded-2xl border p-5"
              style={{
                background: "var(--surface)",

                borderColor: "var(--border)",
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{
                      background: "rgba(0,255,148,0.08)",

                      border: "1px solid rgba(0,255,148,0.15)",
                    }}
                  >
                    <FileText
                      size={20}
                      style={{
                        color: "var(--accent)",
                      }}
                    />
                  </div>

                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{
                        color: "var(--text-primary)",
                      }}
                    >
                      {doc.filename}
                    </h3>

                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        {doc.characterCount.toLocaleString()} chars
                      </span>

                      <span
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        {doc.chunkCount} chunks
                      </span>

                      <span
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        {doc.mimeType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Status */}
                  <div
                    className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
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

                    {doc.status === "processing" && (
                      <Loader2 size={14} className="animate-spin" />
                    )}

                    {doc.status === "error" && <AlertTriangle size={14} />}

                    {doc.status}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteDocument(doc._id)}
                    className="p-2 rounded-lg transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.1)",

                      color: "#ef4444",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
