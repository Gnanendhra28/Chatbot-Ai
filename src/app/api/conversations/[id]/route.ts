import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";
import Conversation from "@/lib/db/models/Conversation";
import Message from "@/lib/db/models/Message";
import InferenceLog from "@/lib/db/models/InferenceLog";

interface Params {
  params: {
    id: string;
  };
}

// GET /api/conversations/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const conversation = await Conversation.findOne({
    _id: params.id,
    userId,
  }).lean();

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const messages = await Message.find({
    conversationId: params.id,
  })
    .sort({ createdAt: 1 })
    .lean();

  return NextResponse.json({
    conversation,
    messages,
  });
}

// PATCH /api/conversations/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();

  const allowedUpdates = ["title", "status", "tags", "systemPrompt"];

  const updates: Record<string, unknown> = {};

  for (const key of allowedUpdates) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  const updatedConversation = await Conversation.findOneAndUpdate(
    {
      _id: params.id,
      userId,
    },
    {
      $set: updates,
    },
    {
      new: true,
    },
  );

  if (!updatedConversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(updatedConversation);
}

// DELETE /api/conversations/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const deletedConversation = await Conversation.findOneAndDelete({
    _id: params.id,
    userId,
  });

  if (!deletedConversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  // Delete related messages + logs
  await Promise.all([
    Message.deleteMany({
      conversationId: params.id,
    }),

    InferenceLog.deleteMany({
      conversationId: params.id,
    }),
  ]);

  return NextResponse.json({
    success: true,
  });
}
