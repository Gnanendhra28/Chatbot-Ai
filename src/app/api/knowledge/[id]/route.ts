import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import KnowledgeDocument from "@/lib/db/models/KnowledgeDocument";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
    }

    await connectDB();

    const document = await KnowledgeDocument.findOne({
      _id: id,
      userId,
    }).lean();

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json({
      document: {
        ...document,
        _id: String(document._id),
        chunks: (document.chunks || []).map((chunk) => ({
          ...chunk,
          hasEmbedding: Array.isArray(chunk.embedding) && chunk.embedding.length > 0,
          vectorDimension: Array.isArray(chunk.embedding) ? chunk.embedding.length : 0,
          embedding: undefined, // Omit raw vector array from client response payload to keep payload small
        })),
      },
    });
  } catch (error) {
    console.error("Fetch document error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document details" },
      { status: 500 },
    );
  }
}
