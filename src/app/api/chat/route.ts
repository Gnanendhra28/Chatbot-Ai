import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getInferenceLogger } from "@/lib/inference-logger";
import { connectDB } from "@/lib/db/mongoose";
import { retrieveRelevantChunks, buildRAGContext } from "@/lib/rag/retrieval";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import InferenceLog from "@/lib/db/models/InferenceLog";
import { redactPII, getRedactionSummary } from "@/lib/pii-redaction";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = await req.json();

    const { message, conversationId, model, ragEnabled } = body;

    if (!message) {
      return NextResponse.json(
        {
          error: "Message required",
        },
        {
          status: 400,
        },
      );
    }

    // Safe model fallback
    const safeModel = model || "llama-3.3-70b-versatile";

    let conversation;

    // Existing conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    }

    // Create new conversation
    if (!conversation) {
      conversation = await Conversation.create({
        title: message.slice(0, 40),
        userId,
        status: "active",
        provider: "groq",
        model: safeModel,
      });
    }
    // Save user message
    const redactedUserMessage = redactPII(message);

    const redactionInfo = getRedactionSummary(message, redactedUserMessage);

    await Message.create({
      conversationId: String(conversation._id),

      role: "user",

      content: message,

      contentRedacted: redactedUserMessage,

      metadata: {
        piiDetected: redactionInfo.hadPII,

        redactedCount: redactionInfo.redactedCount,
      },
    });

    // RAG Prompt
    let finalPrompt = message;

    let ragSources = [];

    if (ragEnabled && userId) {
      const chunks = await retrieveRelevantChunks(userId, message, 3);

      ragSources = chunks;

      if (chunks.length > 0) {
        const ragContext = buildRAGContext(chunks);

        finalPrompt = `
${ragContext}

User Question:
${message}
`;
      }
    }

    // Generate AI response
    const startTime = Date.now();

    const logger = getInferenceLogger();

    const result = await logger.complete({
      conversationId: String(conversation._id),

      userId,

      messages: [
        {
          role: "user",

          content: finalPrompt,
        },
      ],

      temperature: 0.7,

      ragEnabled,
    });

    const latency = Date.now() - startTime;

    const aiContent = result.content || "No response";

    const aiMetrics = {
      latency,

      promptTokens: result.usage.promptTokens,

      completionTokens: result.usage.completionTokens,

      totalTokens: result.usage.totalTokens,
    };

    // Save assistant message
    const redactedAIContent = redactPII(aiContent);

    await Message.create({
      conversationId: String(conversation._id),

      role: "assistant",

      content: aiContent,

      contentRedacted: redactPII(aiContent),

      tokens: aiMetrics.completionTokens,

      finishReason: "stop",

      ragSources: ragSources.map((chunk) => ({
        documentId: chunk.documentId,

        score: chunk.score,

        excerpt: chunk.text.slice(0, 200),
      })),

      metadata: {},
    });

    // Save inference log
    await InferenceLog.create({
      sessionId: String(conversation._id),

      conversationId: String(conversation._id),

      userId,

      provider: "groq",

      model: safeModel,

      requestedAt: new Date(),

      respondedAt: new Date(),

      latencyMs: aiMetrics.latency,

      promptTokens: aiMetrics.promptTokens,

      completionTokens: aiMetrics.completionTokens,

      totalTokens: aiMetrics.totalTokens,

      status: "success",

      stream: false,

      inputPreview: redactPII(message),

      outputPreview: redactPII(aiContent),

      ragEnabled: ragEnabled || false,

      tokensPerSecond:
        aiMetrics.completionTokens / Math.max(aiMetrics.latency / 1000, 1),

      metadata: {},
    });
    await Conversation.findByIdAndUpdate(conversation._id, {
      $inc: {
        messageCount: 2,
        totalTokens: aiMetrics.totalTokens,
      },

      $set: {
        avgLatency: aiMetrics.latency,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      content: aiContent,

      conversationId: conversation._id,

      aiMetrics,
    });
  } catch (error) {
    console.error("Chat API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate response",
      },
      {
        status: 500,
      },
    );
  }
}
