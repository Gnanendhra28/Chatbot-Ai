import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { connectDB } from "@/lib/db/mongoose";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";

import ChatInterface from "@/components/chat/ChatInterface";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params;

  const { userId } = await auth();

  if (!userId) {
    return notFound();
  }

  await connectDB();

  const conversation = await Conversation.findOne({
    _id: id,
    userId,
  }).lean();

  if (!conversation) {
    return notFound();
  }

  const messages = await Message.find({
    conversationId: id,
  })
    .sort({ createdAt: 1 })
    .lean();

  const serializedMessages = messages.map((m: any) => ({
    id: String(m._id),
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return (
    <div className="h-full">
      <ChatInterface
        conversationId={id}
        initialMessages={serializedMessages}
        conversationTitle={conversation.title}
      />
    </div>
  );
}
