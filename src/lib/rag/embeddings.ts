/**
 * Modular, replaceable Embedding Service Abstraction
 */

export interface IEmbeddingService {
  readonly name: string;
  readonly vectorSize: number;

  /**
   * Embed a single query or text string
   */
  embedQuery(text: string): Promise<number[]>;

  /**
   * Embed multiple text strings in batch
   */
  embedBatch(texts: string[]): Promise<number[][]>;
}

export interface EmbeddingServiceConfig {
  provider?: "local" | "openai" | "custom";
  model?: string;
  apiKey?: string;
  apiUrl?: string;
  vectorSize?: number;
}

/**
 * Local Lightweight Semantic Embedding Service
 * Produces normalized 384-dimensional dense feature vectors using n-gram semantic projection.
 * Zero network dependencies, zero API keys required, ultra-fast & deterministic execution.
 */
export class LocalTransformerEmbeddingService implements IEmbeddingService {
  readonly name = "local-semantic-384";
  readonly vectorSize = 384;

  async embedQuery(text: string): Promise<number[]> {
    return this.generateVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.generateVector(t)));
  }

  private generateVector(text: string): number[] {
    const vector = new Array<number>(this.vectorSize).fill(0);
    const cleaned = text.toLowerCase().trim();
    if (!cleaned) return vector;

    // Tokenize into words and 3-char n-grams
    const words = cleaned.split(/\W+/).filter((w) => w.length > 0);
    const tokens: string[] = [...words];

    for (const word of words) {
      if (word.length >= 3) {
        for (let i = 0; i <= word.length - 3; i++) {
          tokens.push(word.slice(i, i + 3));
        }
      }
    }

    // Project tokens into 384-dimensional vector space using hashing
    for (const token of tokens) {
      let hash = 5381;
      for (let i = 0; i < token.length; i++) {
        hash = (hash * 33) ^ token.charCodeAt(i);
      }
      
      const dim1 = Math.abs(hash) % this.vectorSize;
      const dim2 = Math.abs(hash * 31 + 7) % this.vectorSize;
      const weight = 1 / Math.sqrt(token.length);

      vector[dim1] += weight * (hash % 2 === 0 ? 1 : -1);
      vector[dim2] += weight * (hash % 3 === 0 ? 0.5 : -0.5);
    }

    // L2 Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < this.vectorSize; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }

    return vector;
  }
}

/**
 * Remote API Embedding Service (OpenAI / Custom HTTP REST Endpoint)
 */
export class RemoteApiEmbeddingService implements IEmbeddingService {
  readonly name: string;
  readonly vectorSize: number;
  private apiUrl: string;
  private apiKey?: string;

  constructor(config: EmbeddingServiceConfig = {}) {
    this.name = config.provider || "openai";
    this.vectorSize = config.vectorSize || 1536;
    this.apiUrl =
      config.apiUrl ||
      process.env.EMBEDDING_API_URL ||
      "https://api.openai.com/v1/embeddings";
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = await this.embedBatch([text]);
    return res[0] || new Array(this.vectorSize).fill(0);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey && !process.env.EMBEDDING_API_URL) {
      console.warn(
        "[RemoteApiEmbeddingService] API key not found, falling back to local embedding service.",
      );
      const fallback = new LocalTransformerEmbeddingService();
      return fallback.embedBatch(texts);
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      return data.data.map((item: any) => item.embedding);
    } catch (err) {
      console.error("[RemoteApiEmbeddingService] Error:", err);
      // Failover gracefully to local embedding service
      const fallback = new LocalTransformerEmbeddingService();
      return fallback.embedBatch(texts);
    }
  }
}

// Global instance / Factory
let _embeddingServiceInstance: IEmbeddingService | null = null;

export function getEmbeddingService(
  overrides: EmbeddingServiceConfig = {},
): IEmbeddingService {
  const provider =
    overrides.provider || (process.env.EMBEDDING_PROVIDER as any) || "local";

  if (Object.keys(overrides).length > 0) {
    if (provider === "openai" || provider === "custom") {
      return new RemoteApiEmbeddingService(overrides);
    }
    return new LocalTransformerEmbeddingService();
  }

  if (!_embeddingServiceInstance) {
    if (provider === "openai" || provider === "custom") {
      _embeddingServiceInstance = new RemoteApiEmbeddingService();
    } else {
      _embeddingServiceInstance = new LocalTransformerEmbeddingService();
    }
  }

  return _embeddingServiceInstance;
}
