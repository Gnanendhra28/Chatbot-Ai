import { connectDB } from "../db/mongoose";

import KnowledgeDocument from "../db/models/KnowledgeDocument";

const CHUNK_SIZE = 500;

const CHUNK_OVERLAP = 50;

/**
 * Split text into chunks
 */
export function chunkText(text: string): string[] {
  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);

    const chunk = text.slice(start, end).trim();

    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Simple keyword scoring
 */
export function scoreChunk(chunk: string, query: string): number {
  const queryTerms = query.toLowerCase().split(/\W+/).filter(Boolean);

  const chunkLower = chunk.toLowerCase();

  let score = 0;

  for (const term of queryTerms) {
    const matches = chunkLower.match(new RegExp(`\\b${term}\\b`, "g")) ?? [];

    score += matches.length;
  }

  // phrase bonus
  if (chunkLower.includes(query.toLowerCase())) {
    score += 10;
  }

  return score;
}

export interface RetrievedChunk {
  documentId: string;

  filename: string;

  text: string;

  score: number;

  index: number;
}

/**
 * Retrieve best chunks
 */
export async function retrieveRelevantChunks(
  userId: string,

  query: string,

  topK = 3,
): Promise<RetrievedChunk[]> {
  try {
    await connectDB();

    const documents = await KnowledgeDocument.find({
      userId,

      status: "ready",
    })
      .select("_id filename chunks")
      .lean();

    if (!documents.length) {
      return [];
    }

    const scored: RetrievedChunk[] = [];

    for (const doc of documents) {
      for (const chunk of doc.chunks) {
        const score = scoreChunk(chunk.text, query);

        if (score > 0) {
          scored.push({
            documentId: String(doc._id),

            filename: doc.filename,

            text: chunk.text,

            score,

            index: chunk.index,
          });
        }
      }
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch (err) {
    console.error("RAG retrieval failed", err);

    return [];
  }
}

/**
 * Build prompt context
 */
export function buildRAGContext(chunks: RetrievedChunk[]): string {
  if (!chunks.length) {
    return "";
  }

  const sections = chunks.map(
    (chunk, index) => `[Source ${index + 1}: ${chunk.filename}]\n${chunk.text}`,
  );

  return `
You have access to the following context from the user's knowledge base.

Use this information when answering.

${sections.join("\n\n---\n\n")}
`;
}
