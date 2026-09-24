"use client";

import { useState } from "react";
import { useChat } from "../../hooks/useChat";
import { Sidebar } from "../../components/Sidebar";
import { ChatWindow } from "../../components/ChatWindow";
import { CitationsDrawer } from "../../components/CitationsDrawer";
import { Citation } from "../../types";

export default function ChatPage() {
  const {
    conversationId,
    messages,
    conversations,
    isLoading,
    ragEnabled,
    setRagEnabled,
    selectedModel,
    setSelectedModel,
    sendMessage,
    startNewChat,
    loadConversation,
    regenerateLastMessage,
  } = useChat();

  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex-1 flex h-screen overflow-hidden bg-slate-950">
      {/* ChatGPT Collapsible Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onSelectConversation={loadConversation}
        onNewChat={startNewChat}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Central Chat Canvas */}
      <ChatWindow
        messages={messages}
        isLoading={isLoading}
        ragEnabled={ragEnabled}
        onToggleRag={setRagEnabled}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onSendMessage={sendMessage}
        onRegenerateMessage={regenerateLastMessage}
        onNewChat={startNewChat}
        onSelectCitation={(cit) => setSelectedCitation(cit)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Slide-over Source Citation Inspector Drawer */}
      <CitationsDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
