"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageItem, Citation, ConversationItem } from "../types";
import { sendChatMessageApi, getConversationsApi, getMessagesApi } from "../lib/api";

export function useChat(initialConversationId?: string) {
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [selectedModel, setSelectedModel] = useState("qwen/qwen3.8-27b");

  // Fetch conversation history
  const refreshConversations = useCallback(async () => {
    try {
      const history = await getConversationsApi();
      setConversations(history || []);
    } catch {
      setConversations([]);
    }
  }, []);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load messages for a selected conversation
  const loadConversation = useCallback(async (id: string) => {
    setConversationId(id);
    setIsLoading(true);
    try {
      const msgs = await getMessagesApi(id);
      setMessages(msgs || []);
      const allCitations = (msgs || []).flatMap((m) => m.sources || []);
      setActiveCitations(allCitations);
    } catch {
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start a fresh empty chat session
  const startNewChat = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setActiveCitations([]);
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const tempUserMsg: MessageItem = {
        id: `temp_user_${Date.now()}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMsg]);
      setIsLoading(true);

      try {
        const response = await sendChatMessageApi(content, conversationId, ragEnabled, selectedModel);
        
        if (response.conversation_id && response.conversation_id !== conversationId) {
          setConversationId(response.conversation_id);
          refreshConversations();
        }

        const aiMsg: MessageItem = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: response.message,
          sources: response.citations,
          created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, aiMsg]);
        if (response.citations && response.citations.length > 0) {
          setActiveCitations(response.citations);
        }
      } catch (err) {
        const errorText = err instanceof Error ? err.message : "Failed to connect to backend service.";
        const errorMsg: MessageItem = {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ ${errorText}\n\nPlease ensure your FastAPI backend service is running and accessible.`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, ragEnabled, selectedModel, refreshConversations]
  );

  // Regenerate last assistant response
  const regenerateLastMessage = useCallback(async () => {
    if (messages.length === 0 || isLoading) return;
    
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex !== -1) {
      const lastUserContent = messages[lastUserIndex].content;
      setMessages((prev) => prev.slice(0, lastUserIndex));
      await sendMessage(lastUserContent);
    }
  }, [messages, isLoading, sendMessage]);

  return {
    conversationId,
    messages,
    conversations,
    isLoading,
    activeCitations,
    ragEnabled,
    setRagEnabled,
    selectedModel,
    setSelectedModel,
    sendMessage,
    startNewChat,
    loadConversation,
    refreshConversations,
    regenerateLastMessage,
    setMessages,
  };
}
