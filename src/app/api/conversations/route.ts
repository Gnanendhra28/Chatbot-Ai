import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";

export const dynamic = "force-dynamic";

// GET /api/conversations — list all for user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();
  const requestedPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 50)
    : 20;
  const skip = (page - 1) * limit;

  await connectDB();

  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = status;

  if (search) {
    const expression = new RegExp(escapeRegExp(search), "i");
    const matchingConversationIds = await Message.distinct("conversationId", {
      content: expression,
    });
    filter.$or = [
      { title: expression },
      { _id: { $in: matchingConversationIds } },
    ];
  }

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ isPinned: -1, lastMessageAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  return NextResponse.json({
    conversations,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// POST /api/conversations — create new
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await connectDB();

  const conversation = await Conversation.create({
    userId,
    title: body.title ?? "Untitled chat",
    provider: body.provider ?? "groq",
    modelname: body.model ?? "llama-3.3-70b-versatile",
    systemPrompt: body.systemPrompt,
  });

  return NextResponse.json(conversation, { status: 201 });
}
