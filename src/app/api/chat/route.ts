import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getInferenceLogger } from "@/lib/inference-logger";
import { connectDB } from "@/lib/db/mongoose";
import { retrieveRelevantChunks, buildRAGContext } from "@/lib/rag/retrieval";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import { redactPII, getRedactionSummary } from "@/lib/pii-redaction";

export const dynamic = "force-dynamic";

const PROVIDER_MODELS = {
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ],
  openai: ["gpt-4o-mini", "gpt-4o"],
} as const;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { userId } = await auth();

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

    const { message, conversationId, model, provider, ragEnabled } = body;

    if (typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        {
          error: "Message required",
        },
        {
          status: 400,
        },
      );
    }

    const safeProvider =
      typeof provider === "string" && provider in PROVIDER_MODELS
        ? (provider as keyof typeof PROVIDER_MODELS)
        : "groq";
    const requestedModel = typeof model === "string" ? model : "";
    const allowedModels: readonly string[] = PROVIDER_MODELS[safeProvider];
    const safeModel = allowedModels.includes(requestedModel)
      ? requestedModel
      : allowedModels[0];

    let conversation;

    // Existing conversation
    if (conversationId) {
      if (typeof conversationId !== "string" || !mongoose.isValidObjectId(conversationId)) {
        return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
      }
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }

    // Create new conversation
    if (!conversation) {
      const title = await getUniqueConversationTitle(userId, message);
      conversation = await Conversation.create({
        title,
        userId,
        status: "active",
        provider: safeProvider,
        modelname: safeModel,
        lastMessageAt: new Date(),
      });
    }
    // Save user message
    const redactedUserMessage = redactPII(message);

    const redactionInfo = getRedactionSummary(message, redactedUserMessage);

    await Message.create({
      conversationId: String(conversation._id),

      role: "user",

      content: message.trim(),

      contentRedacted: redactedUserMessage,

      metadata: {
        piiDetected: redactionInfo.hadPII,

        redactedCount: redactionInfo.redactedCount,
      },
    });

    // RAG Prompt & Telemetry
    let finalPrompt = message;
    let ragSources: any[] = [];
    let retrievalLatencyMs = 0;
    let topSimilarityScore = 0;
    let retrievedDocumentIds: string[] = [];
    let retrievedPages: number[] = [];

    if (ragEnabled && userId) {
      const ragStart = Date.now();
      const chunks = await retrieveRelevantChunks(userId, message, 3);
      retrievalLatencyMs = Date.now() - ragStart;
      ragSources = chunks;

      if (chunks.length > 0) {
        topSimilarityScore = Math.max(...chunks.map((c) => c.score || 0));
        retrievedDocumentIds = Array.from(new Set(chunks.map((c) => c.documentId)));
        retrievedPages = Array.from(
          new Set(chunks.map((c) => c.pageNumber).filter((p): p is number => p != null)),
        );

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

    const logger = getInferenceLogger({
      provider: safeProvider,
      model: safeModel,
      ingestUrl: new URL("/api/ingest", req.url).toString(),
      asyncLogging: false,
    });

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
      retrievalLatencyMs,
      retrievedChunkCount: ragSources.length,
      topSimilarityScore,
      retrievedDocumentIds,
      retrievedPages,
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
        pageNumber: chunk.pageNumber,
      })),

      metadata: {},
    });

    await Conversation.findByIdAndUpdate(conversation._id, {
      $inc: {
        messageCount: 2,
      },

      $set: {
        provider: safeProvider,
        modelname: safeModel,
        lastMessageAt: new Date(),
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

async function getUniqueConversationTitle(userId: string, message: string) {
  const title = createConversationTitle(message);
  const expression = new RegExp(`^${escapeRegExp(title)}(?: \\(\\d+\\))?$`, "i");
  const matchingTitles = await Conversation.find({ userId, title: expression })
    .select("title")
    .lean();

  if (!matchingTitles.length) return title;

  const usedTitles = new Set(matchingTitles.map((conversation) => conversation.title.toLowerCase()));
  let suffix = 2;
  while (usedTitles.has(`${title} (${suffix})`.toLowerCase())) suffix += 1;
  return `${title} (${suffix})`;
}

function createConversationTitle(message: string): string {
  const words = message
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const leadingVerbs = new Set(["explain", "write", "create", "build", "show", "tell", "give", "help"]);
  if (leadingVerbs.has(words[0]?.toLowerCase())) words.shift();
  const title = words.slice(0, 8).join(" ");
  return title || "Untitled chat";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
