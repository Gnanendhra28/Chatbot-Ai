import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";
import InferenceLog from "@/lib/db/models/InferenceLog";
import Conversation from "@/lib/db/models/Conversation";

import { z } from "zod";

// ======================================
// Validation Schema
// ======================================

const IngestPayloadSchema = z.object({
  sessionId: z.string().min(1),

  conversationId: z.string().min(1),

  messageId: z.string().optional(),

  userId: z.string().optional(),

  provider: z.string().min(1),

  model: z.string().min(1),

  requestedAt: z.string().datetime(),

  respondedAt: z.string().datetime().optional(),

  latencyMs: z.number().min(0),

  timeToFirstTokenMs: z.number().optional(),

  promptTokens: z.number().min(0).default(0),

  completionTokens: z.number().min(0).default(0),

  totalTokens: z.number().min(0).default(0),

  status: z.enum(["success", "error", "timeout", "cancelled"]),

  errorMessage: z.string().optional(),

  errorCode: z.string().optional(),

  httpStatus: z.number().optional(),

  finishReason: z.string().optional(),

  inputPreview: z.string().max(500),

  outputPreview: z.string().max(500).optional(),

  temperature: z.number().optional(),

  maxTokens: z.number().optional(),

  stream: z.boolean().default(false),

  ragEnabled: z.boolean().default(false),

  tokensPerSecond: z.number().optional(),

  metadata: z.record(z.unknown()).optional(),
});

// ======================================
// API Key Validation
// ======================================

function validateApiKey(req: NextRequest): boolean {
  const key = req.headers.get("x-api-key");

  return key === process.env.INGEST_API_KEY;
}

// ======================================
// POST /api/ingest
// ======================================

export async function POST(req: NextRequest) {
  try {
    // API key auth
    if (!validateApiKey(req)) {
      return NextResponse.json(
        {
          error: "Invalid API key",
        },
        { status: 401 },
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";

    console.log(`[INGEST] Request from ${ip}`);

    // Parse body
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON body",
        },
        { status: 400 },
      );
    }

    // Validate payload
    const parsed = IngestPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",

          details: parsed.error.flatten(),
        },
        { status: 422 },
      );
    }

    const payload = parsed.data;

    await connectDB();

    // Compute TPS if missing
    const computedTokensPerSecond =
      payload.tokensPerSecond ??
      (payload.totalTokens > 0 && payload.latencyMs > 0
        ? Math.round((payload.totalTokens / payload.latencyMs) * 1000)
        : undefined);

    // Save log
    const log = await InferenceLog.create({
      sessionId: payload.sessionId,

      conversationId: payload.conversationId,

      messageId: payload.messageId,

      userId: payload.userId,

      provider: payload.provider,

      modelname: payload.model,

      requestedAt: new Date(payload.requestedAt),

      respondedAt: payload.respondedAt
        ? new Date(payload.respondedAt)
        : undefined,

      latencyMs: payload.latencyMs,

      timeToFirstTokenMs: payload.timeToFirstTokenMs,

      promptTokens: payload.promptTokens,

      completionTokens: payload.completionTokens,

      totalTokens: payload.totalTokens,

      status: payload.status,

      errorMessage: payload.errorMessage,

      errorCode: payload.errorCode,

      httpStatus: payload.httpStatus,

      finishReason: payload.finishReason,

      inputPreview: payload.inputPreview,

      outputPreview: payload.outputPreview,

      temperature: payload.temperature,

      maxTokens: payload.maxTokens,

      stream: payload.stream,

      ragEnabled: payload.ragEnabled,

      tokensPerSecond: computedTokensPerSecond,

      metadata: payload.metadata || {},
    });

    // Update conversation stats
    if (payload.status === "success") {
      await Conversation.findByIdAndUpdate(payload.conversationId, {
        $inc: {
          totalTokens: payload.totalTokens,

          messageCount: 1,
        },

        $set: {
          avgLatency: payload.latencyMs,

          updatedAt: new Date(),
        },
      }).catch(() => {
        console.warn("Conversation update failed");
      });
    }

    return NextResponse.json(
      {
        success: true,

        logId: log?._id ? String(log._id) : null,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[INGEST API ERROR]", err);

    return NextResponse.json(
      {
        error: "Failed to store log",
      },
      { status: 500 },
    );
  }
}

// ======================================
// GET /api/ingest
// ======================================

export async function GET() {
  return NextResponse.json({
    status: "ok",

    service: "ingestion-pipeline",

    database: "connected",

    timestamp: new Date().toISOString(),
  });
}
