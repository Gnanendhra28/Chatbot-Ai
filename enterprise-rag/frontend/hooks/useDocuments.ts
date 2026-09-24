"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentItem } from "../types";
import { getDocumentsApi, uploadDocumentApi } from "../lib/api";

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const data = await getDocumentsApi();
      setDocuments(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    try {
      const res = await uploadDocumentApi(file, (percent) => {
        setUploadProgress(percent);
      });
      await fetchDocuments();
      return res;
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
      throw err;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [fetchDocuments]);

  return {
    documents,
    isUploading,
    uploadProgress,
    error,
    uploadFile,
    refetch: fetchDocuments,
  };
}
