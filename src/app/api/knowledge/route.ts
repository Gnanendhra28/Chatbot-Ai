import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db/mongoose";
import KnowledgeDocument from "@/lib/db/models/KnowledgeDocument";
import { cleanExtractedText, recursiveChunkText, ProcessedChunk } from "@/lib/rag/retrieval";
import { getEmbeddingService } from "@/lib/rag/embeddings";
import { getQdrantService, QdrantPoint } from "@/lib/rag/qdrant";
import mongoose from "mongoose";

import { parsePdfBuffer } from "@/lib/rag/pdf-parser";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

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
        { error: "File size exceeds the 25 MB upload limit." },
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

    // Process file & index into Qdrant & MongoDB
    await processDocument(String(doc._id), file, userId);

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
// Process Document Pipeline
// ==============================
async function processDocument(docId: string, file: File, userId: string) {
  try {
    let content = "";
    let pageCount = 1;
    const processedChunks: ProcessedChunk[] = [];

    // PDF Extraction
    if (file.type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfResult = parsePdfBuffer(buffer);
      pageCount = pdfResult.pageCount;

      for (const page of pdfResult.pages) {
        const pageText = cleanExtractedText(page.text);
        if (!pageText) continue;

        content += (content ? "\n\n" : "") + pageText;

        const pageChunks = recursiveChunkText(pageText, {
          pageNumber: page.pageNumber,
          startIndex: processedChunks.length,
        });
        processedChunks.push(...pageChunks);
      }
    }
    // TXT / MD Extraction
    else {
      const rawText = await file.text();
      content = cleanExtractedText(rawText);
      const chunks = recursiveChunkText(content, { pageNumber: 1 });
      processedChunks.push(...chunks);
    }

    // Step: Generate Embeddings
    const embeddingService = getEmbeddingService();
    const chunkTexts = processedChunks.map((c) => c.text);
    const embeddings = await embeddingService.embedBatch(chunkTexts);

    // Step: Prepare Qdrant points
    const qdrantService = getQdrantService();
    const nowIso = new Date().toISOString();

    const qdrantPoints: QdrantPoint[] = processedChunks.map((chunk, idx) => ({
      id: `${docId}_${chunk.index}`,
      vector: embeddings[idx],
      payload: {
        documentId: docId,
        userId,
        filename: file.name,
        pageNumber: chunk.pageNumber ?? 1,
        chunkIndex: chunk.index,
        text: chunk.text,
        characterCount: chunk.characterCount,
        tokenCount: chunk.tokenCount,
        metadata: {
          mimeType: file.type,
        },
        createdAt: nowIso,
      },
    }));

    // Step: Store in Qdrant Vector DB
    const qdrantSuccess = await qdrantService.upsertPoints(qdrantPoints);

    // Step: Update MongoDB indexing status & document details
    await KnowledgeDocument.findByIdAndUpdate(docId, {
      content: content.slice(0, 50000),
      chunks: processedChunks.map((chunk, idx) => ({
        text: chunk.text,
        embedding: embeddings[idx],
        index: chunk.index,
        pageNumber: chunk.pageNumber ?? 1,
        characterCount: chunk.characterCount,
        tokenCount: chunk.tokenCount,
        metadata: {
          filename: file.name,
          mimeType: file.type,
        },
      })),
      characterCount: content.length,
      chunkCount: processedChunks.length,
      pageCount,
      status: "ready",
      metadata: {
        fileSize: file.size,
        lastModified: file.lastModified,
        processedAt: nowIso,
        indexedInQdrant: qdrantSuccess,
        vectorDimension: embeddingService.vectorSize,
        embeddingProvider: embeddingService.name,
      },
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

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();

    // Clean up vectors from Qdrant
    const qdrantService = getQdrantService();
    await qdrantService.deleteByDocumentId(id, userId);

    // Delete document record from MongoDB
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
