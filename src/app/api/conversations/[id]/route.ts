import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import InferenceLog from "@/lib/db/models/InferenceLog";

// GET /api/conversations/[id]
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  await connectDB();

  const conversation = await Conversation.findOne({
    _id: id,
    userId,
  }).lean();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await Message.find({
    conversationId: id,
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({
    conversation,
    messages,
  });
}

// PATCH /api/conversations/[id]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  await connectDB();

  const body = await req.json();

  const allowedUpdates = ["title", "status", "tags", "systemPrompt"];

  const updates: Record<string, unknown> = {};

  for (const key of allowedUpdates) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  const conversation = await Conversation.findOneAndUpdate(
    {
      _id: id,
      userId,
    },
    {
      $set: updates,
    },
    {
      new: true,
    },
  );

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(conversation);
}

// DELETE /api/conversations/[id]
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  await connectDB();

  const conversation = await Conversation.findOneAndDelete({
    _id: id,
    userId,
  });

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await Promise.all([
    Message.deleteMany({
      conversationId: id,
    }),

    InferenceLog.deleteMany({
      conversationId: id,
    }),
  ]);

  return NextResponse.json({
    success: true,
  });
}
