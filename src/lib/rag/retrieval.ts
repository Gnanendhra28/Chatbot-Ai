import { connectDB } from "../db/mongoose";
import KnowledgeDocument from "../db/models/KnowledgeDocument";
import { estimateTokens } from "../metrics";
import { getEmbeddingService } from "./embeddings";
import { getQdrantService } from "./qdrant";

export const DEFAULT_CHUNK_SIZE = 500;
export const DEFAULT_CHUNK_OVERLAP = 50;

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  pageNumber?: number;
  startIndex?: number;
}

export interface ProcessedChunk {
  text: string;
  index: number;
  pageNumber?: number;
  characterCount: number;
  tokenCount: number;
}

/**
 * Clean extracted text (normalize whitespace, control chars, excessive blank lines)
 */
export function cleanExtractedText(text: string): string {
  if (!text) return "";
  return text
    // Replace null bytes and non-printable control characters except \n, \r, \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normalize Windows line endings to \n
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Trim trailing spaces per line
    .replace(/[ \t]+\n/g, "\n")
    // Replace 3+ consecutive newlines with double newline (paragraph break)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Recursive text splitter with configurable chunk size and overlap
 */
export function recursiveChunkText(
  rawText: string,
  options: ChunkOptions = {},
): ProcessedChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const pageNumber = options.pageNumber;
  const startIndexOffset = options.startIndex ?? 0;

  const text = cleanExtractedText(rawText);
  if (!text) return [];

  const chunks: ProcessedChunk[] = [];
  
  // Primary separators hierarchy
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  let currentChunk = "";
  let currentIndex = startIndexOffset;

  const pushChunk = (content: string) => {
    const trimmed = content.trim();
    if (trimmed.length > 20) {
      chunks.push({
        text: trimmed,
        index: currentIndex++,
        pageNumber,
        characterCount: trimmed.length,
        tokenCount: estimateTokens(trimmed),
      });
    }
  };

  for (const para of paragraphs) {
    if ((currentChunk + "\n\n" + para).length <= chunkSize) {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    } else {
      if (currentChunk) {
        pushChunk(currentChunk);
      }
      
      // If single paragraph is larger than chunkSize, split recursively by sentence / character
      if (para.length > chunkSize) {
        let start = 0;
        while (start < para.length) {
          let end = Math.min(start + chunkSize, para.length);
          // Try to snap to sentence end if possible
          if (end < para.length) {
            const nextPeriod = para.slice(start, end).lastIndexOf(". ");
            if (nextPeriod > chunkSize / 2) {
              end = start + nextPeriod + 1;
            }
          }
          const slice = para.slice(start, end).trim();
          pushChunk(slice);
          start += chunkSize - chunkOverlap;
        }
        currentChunk = "";
      } else {
        // Carry overlap from previous chunk if possible
        const overlapText = currentChunk
          ? currentChunk.slice(Math.max(0, currentChunk.length - chunkOverlap))
          : "";
        currentChunk = overlapText ? `${overlapText}\n\n${para}` : para;
      }
    }
  }

  if (currentChunk) {
    pushChunk(currentChunk);
  }

  return chunks;
}

/**
 * Split text into chunks (backwards compatible wrapper)
 */
export function chunkText(text: string): string[] {
  return recursiveChunkText(text).map((c) => c.text);
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
  pageNumber?: number;
}

/**
 * Retrieve best chunks via Qdrant Dense Vector Search with Keyword Fallback
 */
export async function retrieveRelevantChunks(
  userId: string,
  query: string,
  topK = 3,
): Promise<RetrievedChunk[]> {
  try {
    // 1. Vector Search Pipeline via EmbeddingService & QdrantService
    const embeddingService = getEmbeddingService();
    const qdrantService = getQdrantService();

    const queryVector = await embeddingService.embedQuery(query);
    const vectorResults = await qdrantService.search(queryVector, {
      userId,
      topK,
    });

    if (vectorResults.length > 0) {
      return vectorResults.map((res) => ({
        documentId: String(res.payload.documentId),
        filename: String(res.payload.filename || "Document"),
        text: String(res.payload.text),
        score: Number(res.score.toFixed(4)),
        index: Number(res.payload.chunkIndex ?? 0),
        pageNumber: res.payload.pageNumber ? Number(res.payload.pageNumber) : undefined,
      }));
    }

    // 2. Fallback to MongoDB Keyword Scoring if Qdrant yields no results or is unpopulated
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
            pageNumber: (chunk as any).pageNumber,
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

  const sections = chunks.map((chunk, index) => {
    const pageInfo = chunk.pageNumber ? ` (Page ${chunk.pageNumber})` : "";
    return `[Source ${index + 1}: ${chunk.filename}${pageInfo}]\n${chunk.text}`;
  });

  return `
You have access to the following context from the user's knowledge base.

Use this information when answering.

${sections.join("\n\n---\n\n")}
`;
}

