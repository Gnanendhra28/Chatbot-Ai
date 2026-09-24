export interface DocumentItem {
  id: string;
  user_id?: string;
  tenant_id?: string;
  filename: string;
  mime_type?: string;
  file_size?: number;
  status: "UPLOADED" | "PROCESSING" | "EMBEDDING" | "COMPLETED" | "FAILED" | "processing" | "ready" | "error";
  error_message?: string;
  created_at?: string;
}

export interface Citation {
  citation_index?: number;
  document_id: string;
  chunk_id?: string;
  filename: string;
  page_number: number;
  section?: string;
  text_snippet: string;
  score: number;
}

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Citation[];
  created_at?: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
}
