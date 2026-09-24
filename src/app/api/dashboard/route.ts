import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import InferenceLog from "@/lib/db/models/InferenceLog";
import KnowledgeDocument from "@/lib/db/models/KnowledgeDocument";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const conversations = await Conversation.find({ userId }).select("_id").lean();
    const conversationIds = conversations.map((conversation) => String(conversation._id));
    const messageFilter = { conversationId: { $in: conversationIds } };
    const logFilter = { userId };

    // ====================================
    // Basic Counts
    // ====================================

    const totalConversations = conversationIds.length;

    const totalMessages = await Message.countDocuments(messageFilter);

    const userMessages = await Message.countDocuments({
      ...messageFilter,
      role: "user",
    });

    const assistantMessages = await Message.countDocuments({
      ...messageFilter,
      role: "assistant",
    });

    // ====================================
    // Recent Messages
    // ====================================

    const recentMessages = await Message.find(messageFilter)
      .sort({
        createdAt: -1,
      })
      .limit(10)
      .lean();

    // ====================================
    // Activity Graph Data
    // ====================================

    const messages = await Message.find(messageFilter)
      .sort({
        createdAt: 1,
      })
      .lean();

    const hourlyMap: Record<string, number> = {};

    messages.forEach((msg: any) => {
      const date = new Date(msg.createdAt);

      const hour = `${date.getHours()}:00`;

      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    const activityData = Object.entries(hourlyMap).map(([hour, count]) => ({
      hour,
      count,
    }));

    // ====================================
    // REAL TOKEN ANALYTICS & RAG METRICS
    // ====================================

    const logs = await InferenceLog.find(logFilter).lean();

    let totalTokens = 0;
    let totalLatency = 0;
    let totalRetrievalLatency = 0;
    let totalEmbeddingLatency = 0;
    let ragRequestsCount = 0;
    let ragSuccessCount = 0;
    const docRetrievalCounts: Record<string, number> = {};

    logs.forEach((log: any) => {
      totalTokens += log.totalTokens || 0;
      totalLatency += log.latencyMs || 0;

      if (log.ragEnabled) {
        ragRequestsCount++;
        if ((log.retrievedChunkCount || 0) > 0) {
          ragSuccessCount++;
        }
        if (log.retrievalLatencyMs) {
          totalRetrievalLatency += log.retrievalLatencyMs;
        }
        if (log.embeddingLatencyMs) {
          totalEmbeddingLatency += log.embeddingLatencyMs;
        }
        if (Array.isArray(log.retrievedDocumentIds)) {
          log.retrievedDocumentIds.forEach((docId: string) => {
            docRetrievalCounts[docId] = (docRetrievalCounts[docId] || 0) + 1;
          });
        }
      }
    });

    const avgLatency = logs.length > 0 ? Math.round(totalLatency / logs.length) : 0;
    const avgRetrievalLatency = ragRequestsCount > 0 ? Math.round(totalRetrievalLatency / ragRequestsCount) : 0;
    const avgEmbeddingLatency = ragRequestsCount > 0 ? Math.round(totalEmbeddingLatency / ragRequestsCount) : 0;
    const retrievalSuccessRate = ragRequestsCount > 0 ? Math.round((ragSuccessCount / ragRequestsCount) * 100) : 100;

    // ====================================
    // Knowledge Base / Qdrant Stats
    // ====================================
    const documents = await KnowledgeDocument.find({ userId, status: "ready" }).lean();
    const indexedDocuments = documents.length;
    let totalEmbeddings = 0;
    let totalVectors = 0;

    const docMap = new Map<string, string>();
    documents.forEach((doc) => {
      totalEmbeddings += doc.chunkCount || 0;
      totalVectors += doc.chunkCount || 0;
      docMap.set(String(doc._id), doc.filename);
    });

    const topRetrievedDocuments = Object.entries(docRetrievalCounts)
      .map(([docId, count]) => ({
        documentId: docId,
        filename: docMap.get(docId) || "Deleted Document",
        retrievalCount: count,
      }))
      .sort((a, b) => b.retrievalCount - a.retrievalCount)
      .slice(0, 5);

    // ====================================
    // Latest Metrics
    // ====================================

    const latestLogs = await InferenceLog.find(logFilter)
      .sort({
        createdAt: -1,
      })
      .limit(5)
      .lean();

    // ====================================
    // Response
    // ====================================

    return NextResponse.json({
      stats: {
        totalConversations,
        totalMessages,
        userMessages,
        assistantMessages,
        totalTokens,
        avgLatency,
        // RAG Stats
        indexedDocuments,
        totalEmbeddings,
        totalVectors,
        retrievalSuccessRate,
        avgRetrievalLatency,
        avgEmbeddingLatency,
      },

      topRetrievedDocuments,

      activityData,

      recentMessages,

      latestLogs,
    });
  } catch (error) {
    console.error("[Dashboard API Error]", error);

    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
      },
      {
        status: 500,
      },
    );
  }
}
