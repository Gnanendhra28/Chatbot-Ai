import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";
import KnowledgeDocument from "@/lib/db/models/KnowledgeDocument";
import { chunkText } from "@/lib/rag/retrieval";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["text/plain", "text/markdown", "application/pdf"];

// ==============================
// POST - Upload Knowledge File
// ==============================
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();

    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    // File type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error: "Unsupported file type. Use TXT, Markdown or PDF.",
        },
        { status: 400 },
      );
    }

    await connectDB();

    // Create document
    const doc = await KnowledgeDocument.create({
      userId,

      filename: file.name,

      mimeType: file.type,

      content: "processing",

      chunks: [],

      status: "processing",

      characterCount: 0,

      chunkCount: 0,
    });

    // Process file
    await processDocument(String(doc._id), file);

    return NextResponse.json({
      success: true,

      documentId: String(doc._id),

      filename: file.name,
    });
  } catch (error) {
    console.error("Knowledge upload error:", error);

    return NextResponse.json(
      {
        error: "Failed to upload knowledge document",
      },
      { status: 500 },
    );
  }
}

// ==============================
// Process Document
// ==============================
async function processDocument(docId: string, file: File) {
  try {
    let content = "";

    // PDF
    if (file.type === "application/pdf") {
      const pdfParse: any = await import("pdf-parse");

      const buffer = Buffer.from(await file.arrayBuffer());

      const pdfData = await pdfParse(buffer);

      content = pdfData.text || "";
    }

    // TXT / MD
    else {
      content = await file.text();
    }

    // Create chunks
    const chunks = chunkText(content);

    // Save processed data
    await KnowledgeDocument.findByIdAndUpdate(docId, {
      content: content.slice(0, 50000),

      chunks: chunks.map((text, index) => ({
        text,
        index,
      })),

      characterCount: content.length,

      chunkCount: chunks.length,

      status: "ready",
    });
  } catch (error) {
    console.error("Document processing failed:", error);

    await KnowledgeDocument.findByIdAndUpdate(docId, {
      status: "error",

      errorMessage: String(error),
    });
  }
}

// ==============================
// GET - List Documents
// ==============================
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const documents = await KnowledgeDocument.find({
      userId,
    })
      .select("-content -chunks")
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json({
      documents,
    });
  } catch (error) {
    console.error("Knowledge GET error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch documents",
      },
      { status: 500 },
    );
  }
}

// ==============================
// DELETE - Remove Document
// ==============================
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await connectDB();

    await KnowledgeDocument.findOneAndDelete({
      _id: id,
      userId,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Knowledge DELETE error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete document",
      },
      { status: 500 },
    );
  }
}
