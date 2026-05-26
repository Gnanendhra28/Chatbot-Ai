import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Conversation from "@/lib/db/models/Conversation";

// GET /api/conversations — list all for user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const skip = (page - 1) * limit;

  await connectDB();

  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = status;

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ updatedAt: -1 })
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

// POST /api/conversations — create new
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  await connectDB();

  const conversation = await Conversation.create({
    userId,
    title: body.title ?? "New Conversation",
    provider: body.provider ?? "groq",
    model: body.model ?? "llama-3.3-70b-versatile",
    systemPrompt: body.systemPrompt,
  });

  return NextResponse.json(conversation, { status: 201 });
}
