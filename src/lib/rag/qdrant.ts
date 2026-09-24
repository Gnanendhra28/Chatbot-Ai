import { nanoid } from "nanoid";

export const DEFAULT_QDRANT_COLLECTION = "neurallog_chunks";
export const DEFAULT_VECTOR_SIZE = 384; // Standard embedding size for bge-small-en / MiniLM

export interface QdrantPointPayload {
  documentId: string;
  userId: string;
  filename: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  characterCount?: number;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  [key: string]: unknown;
}

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload: QdrantPointPayload;
}

export interface QdrantSearchResult {
  id: string | number;
  score: number;
  payload: QdrantPointPayload;
}

export interface SearchOptions {
  userId: string;
  topK?: number;
  documentId?: string;
  scoreThreshold?: number;
  collectionName?: string;
}

export class QdrantService {
  private baseUrl: string;
  private apiKey?: string;
  private defaultCollection: string;

  constructor() {
    this.baseUrl = (process.env.QDRANT_URL || "http://localhost:6333").replace(/\/$/, "");
    this.apiKey = process.env.QDRANT_API_KEY;
    this.defaultCollection = process.env.QDRANT_COLLECTION || DEFAULT_QDRANT_COLLECTION;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["api-key"] = this.apiKey;
    }
    return headers;
  }

  /**
   * Health check / ping Qdrant instance
   */
  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/readyz`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch (err) {
      console.warn("[QdrantService] Ping failed:", err instanceof Error ? err.message : err);
      return false;
    }
  }

  /**
   * Ensure collection exists in Qdrant with correct vector size & metric
   */
  async ensureCollection(
    collectionName: string = this.defaultCollection,
    vectorSize: number = DEFAULT_VECTOR_SIZE,
  ): Promise<boolean> {
    try {
      // Check if collection exists
      const checkRes = await fetch(`${this.baseUrl}/collections/${collectionName}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (checkRes.ok) {
        return true;
      }

      // Create collection if missing
      const createRes = await fetch(`${this.baseUrl}/collections/${collectionName}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          vectors: {
            size: vectorSize,
            distance: "Cosine",
          },
        }),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error(`[QdrantService] Failed to create collection "${collectionName}":`, errorText);
        return false;
      }

      // Create payload indexes for fast user isolation filtering
      await this.createPayloadIndex(collectionName, "userId", "keyword");
      await this.createPayloadIndex(collectionName, "documentId", "keyword");

      return true;
    } catch (err) {
      this.handleError("EnsureCollection", err);
      return false;
    }
  }

  /**
   * Create index on payload field
   */
  private async createPayloadIndex(
    collectionName: string,
    fieldName: string,
    fieldType: "keyword" | "integer" | "float" = "keyword",
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/collections/${collectionName}/index`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          field_name: fieldName,
          field_schema: fieldType,
        }),
      });
    } catch (err) {
      // Index creation error ignored silently if Qdrant offline
    }
  }

  /**
   * Upsert vector points into Qdrant
   */
  async upsertPoints(
    points: QdrantPoint[],
    collectionName: string = this.defaultCollection,
  ): Promise<boolean> {
    if (!points.length) return true;

    try {
      await this.ensureCollection(collectionName, points[0].vector.length);

      const formattedPoints = points.map((p) => ({
        id: p.id || nanoid(),
        vector: p.vector,
        payload: p.payload,
      }));

      const res = await fetch(`${this.baseUrl}/collections/${collectionName}/points?wait=true`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          points: formattedPoints,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("[QdrantService] Upsert failed:", errText);
        return false;
      }

      return true;
    } catch (err) {
      this.handleError("UpsertPoints", err);
      return false;
    }
  }

  /**
   * Search vectors with strict user isolation filtering
   */
  async search(
    queryVector: number[],
    options: SearchOptions,
  ): Promise<QdrantSearchResult[]> {
    const collectionName = options.collectionName || this.defaultCollection;
    const topK = options.topK ?? 3;

    try {
      await this.ensureCollection(collectionName, queryVector.length);

      const mustFilters: Array<Record<string, unknown>> = [
        {
          key: "userId",
          match: { value: options.userId },
        },
      ];

      if (options.documentId) {
        mustFilters.push({
          key: "documentId",
          match: { value: options.documentId },
        });
      }

      const requestBody: Record<string, unknown> = {
        vector: queryVector,
        limit: topK,
        with_payload: true,
        filter: {
          must: mustFilters,
        },
      };

      if (options.scoreThreshold != null) {
        requestBody.score_threshold = options.scoreThreshold;
      }

      const res = await fetch(`${this.baseUrl}/collections/${collectionName}/points/search`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const results: QdrantSearchResult[] = (data.result || []).map((item: any) => ({
        id: item.id,
        score: item.score,
        payload: item.payload,
      }));

      return results;
    } catch (err) {
      this.handleError("Search", err);
      return [];
    }
  }

  /**
   * Delete points matching documentId and userId
   */
  async deleteByDocumentId(
    documentId: string,
    userId: string,
    collectionName: string = this.defaultCollection,
  ): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/collections/${collectionName}/points/delete?wait=true`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          filter: {
            must: [
              { key: "documentId", match: { value: documentId } },
              { key: "userId", match: { value: userId } },
            ],
          },
        }),
      });

      return res.ok;
    } catch (err) {
      this.handleError("Delete", err);
      return false;
    }
  }

  private handleError(operation: string, err: unknown): void {
    const isOffline =
      err instanceof Error &&
      (err.message.includes("ECONNREFUSED") ||
        (err.cause as any)?.code === "ECONNREFUSED" ||
        String(err.cause).includes("ECONNREFUSED"));

    if (isOffline) {
      console.warn(`[QdrantService] ${operation} skipped: Qdrant service offline at ${this.baseUrl} (ECONNREFUSED). Falling back gracefully.`);
    } else {
      console.error(`[QdrantService] ${operation} error:`, err);
    }
  }

  /**
   * Get collection stats (vector count, status)
   */
  async getCollectionInfo(collectionName: string = this.defaultCollection): Promise<{
    exists: boolean;
    vectorsCount: number;
    pointsCount: number;
    status: string;
  }> {
    try {
      const res = await fetch(`${this.baseUrl}/collections/${collectionName}`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!res.ok) {
        return { exists: false, vectorsCount: 0, pointsCount: 0, status: "not_found" };
      }

      const data = await res.json();
      const result = data.result || {};

      return {
        exists: true,
        vectorsCount: result.vectors_count || result.points_count || 0,
        pointsCount: result.points_count || 0,
        status: result.status || "green",
      };
    } catch (err) {
      return { exists: false, vectorsCount: 0, pointsCount: 0, status: "error" };
    }
  }
}

// Singleton factory
let _qdrantInstance: QdrantService | null = null;

export function getQdrantService(): QdrantService {
  if (!_qdrantInstance) {
    _qdrantInstance = new QdrantService();
  }
  return _qdrantInstance;
}
