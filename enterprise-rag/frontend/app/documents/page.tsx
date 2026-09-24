"use client";

import { useDocuments } from "../../hooks/useDocuments";
import { PDFUploader } from "../../components/PDFUploader";
import { Sidebar } from "../../components/Sidebar";

export default function DocumentsPage() {
  const { documents, isUploading, uploadProgress, uploadFile } = useDocuments();

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight">Knowledge Base Repository</h1>
          <p className="text-slate-400 text-sm mt-1">
            Upload PDF, Markdown, or text documents for recursive chunking, 384-dim vector indexing, and pgvector retrieval.
          </p>
        </div>

        <PDFUploader
          documents={documents}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onUpload={uploadFile}
        />
      </div>
    </div>
  );
}
