import { DocumentItem, ConversationItem, MessageItem, Citation } from "../types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function uploadDocumentApi(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ document_id: string; status: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", `${API_BASE_URL}/documents`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          resolve({ document_id: "doc_uploaded", status: "uploaded" });
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => reject(new Error("Backend service is offline or unreachable."));
    xhr.send(formData);
  });
}

export async function getDocumentsApi(): Promise<DocumentItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/documents`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function sendChatMessageApi(
  message: string,
  conversationId?: string,
  ragEnabled = true,
  model?: string
): Promise<{ conversation_id: string; message: string; citations: Citation[] }> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        rag_enabled: ragEnabled,
        model: model,
      }),
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP status ${res.status}`);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof Error && err.message.includes("HTTP")) {
      throw err;
    }
    throw new Error("Cannot connect to backend server. Ensure the FastAPI service is running.");
  }
}

export async function getConversationsApi(): Promise<ConversationItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/conversations`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getMessagesApi(conversationId: string): Promise<MessageItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
