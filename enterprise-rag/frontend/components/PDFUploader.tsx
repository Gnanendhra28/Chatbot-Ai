"use client";

import { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { DocumentItem } from "../types";

interface PDFUploaderProps {
  documents: DocumentItem[];
  isUploading: boolean;
  uploadProgress?: number;
  onUpload: (file: File) => Promise<any>;
}

export function PDFUploader({
  documents,
  isUploading,
  uploadProgress = 0,
  onUpload,
}: PDFUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }
    setError(null);
    try {
      await onUpload(file);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          dragActive
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
        }`}
      >
        <UploadCloud className="w-12 h-12 mx-auto text-indigo-400 mb-3" />
        <h4 className="text-base font-semibold text-slate-200">Upload PDF Document</h4>
        <p className="text-xs text-slate-500 mt-1">
          Drag & drop your PDF file here, or click to browse (Up to 25 MB)
        </p>

        <label className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium cursor-pointer transition">
          {isUploading ? (
            <span className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Uploading ({uploadProgress}%)...</span>
            </span>
          ) : (
            "Select PDF"
          )}
          <input
            type="file"
            accept=".pdf"
            disabled={isUploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
        </label>

        {/* Progress Bar Indicator */}
        {isUploading && (
          <div className="mt-4 max-w-xs mx-auto">
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{uploadProgress}% complete</div>
          </div>
        )}

        {error && (
          <div className="mt-3 text-xs text-red-400 flex items-center justify-center space-x-1">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Document List */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Documents ({documents.length})
        </h3>

        <div className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No documents uploaded yet.</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">{doc.filename}</div>
                    <div className="text-xs text-slate-500">
                      ID: {doc.id} {doc.file_size ? `• ${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : ''} {doc.created_at ? `• ${new Date(doc.created_at).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-emerald-400 flex items-center space-x-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{doc.status}</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
