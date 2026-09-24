import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getEmbeddingService } from "@/lib/rag/embeddings";
import { getQdrantService } from "@/lib/rag/qdrant";
import { retrieveRelevantChunks } from "@/lib/rag/retrieval";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { query, topK = 5, scoreThreshold, documentId } = body;

    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
    }

    const startTime = Date.now();
    const embeddingService = getEmbeddingService();
    const qdrantService = getQdrantService();

    // Measure embedding latency
    const t0 = Date.now();
    const queryVector = await embeddingService.embedQuery(query);
    const embeddingLatencyMs = Date.now() - t0;

    // Measure vector search latency
    const t1 = Date.now();
    const vectorResults = await qdrantService.search(queryVector, {
      userId,
      topK,
      documentId: documentId || undefined,
      scoreThreshold: typeof scoreThreshold === "number" ? scoreThreshold : undefined,
    });
    const vectorSearchLatencyMs = Date.now() - t1;
    const totalRetrievalLatencyMs = Date.now() - startTime;

    let results = vectorResults.map((res) => ({
      documentId: String(res.payload.documentId),
      filename: String(res.payload.filename || "Document"),
      text: String(res.payload.text),
      score: Number(res.score.toFixed(4)),
      chunkIndex: Number(res.payload.chunkIndex ?? 0),
      pageNumber: res.payload.pageNumber ? Number(res.payload.pageNumber) : 1,
      source: "qdrant_vector_search",
    }));

    // Fallback if vector search returned 0 results
    if (results.length === 0) {
      const fallbackChunks = await retrieveRelevantChunks(userId, query, topK);
      results = fallbackChunks.map((chunk) => ({
        documentId: chunk.documentId,
        filename: chunk.filename,
        text: chunk.text,
        score: chunk.score,
        chunkIndex: chunk.index,
        pageNumber: chunk.pageNumber ?? 1,
        source: "keyword_fallback",
      }));
    }

    return NextResponse.json({
      success: true,
      query,
      resultsCount: results.length,
      timings: {
        embeddingLatencyMs,
        vectorSearchLatencyMs,
        totalRetrievalLatencyMs,
      },
      results,
    });
  } catch (error) {
    console.error("Semantic search error:", error);
    return NextResponse.json(
      { error: "Semantic search failed" },
      { status: 500 },
    );
  }
}
