import { nanoid } from "nanoid";
import { redactPII } from "../lib/pii-redaction";
import {
  BaseProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "../lib/base";
import { GroqProvider } from "../lib/groq";
import { OpenAIProvider } from "../lib/openai";

// ─── Registry ───────────────────────────────────────────────────────────────

const providerRegistry: Record<string, () => BaseProvider> = {
  groq: () => new GroqProvider(),
  openai: () => new OpenAIProvider(),
};

export function registerProvider(name: string, factory: () => BaseProvider) {
  providerRegistry[name] = factory;
}

export function getProvider(name: string): BaseProvider {
  const factory = providerRegistry[name];
  if (!factory) throw new Error(`Provider "${name}" not registered`);
  return factory();
}

// ─── Log Payload ─────────────────────────────────────────────────────────────

export interface InferenceLogPayload {
  sessionId: string;
  conversationId: string;
  messageId?: string;
  userId?: string;

  provider: string;
  model: string;

  requestedAt: string; // ISO
  respondedAt?: string;
  latencyMs: number;
  timeToFirstTokenMs?: number;

  promptTokens: number;
  completionTokens: number;
  totalTokens: number;

  status: "success" | "error" | "timeout" | "cancelled";
  errorMessage?: string;
  errorCode?: string;
  httpStatus?: number;
  finishReason?: string;

  inputPreview: string;
  outputPreview?: string;

  temperature?: number;
  maxTokens?: number;
  stream: boolean;
  ragEnabled: boolean;

  tokensPerSecond?: number;
  metadata?: Record<string, unknown>;
}

// ─── SDK Config ───────────────────────────────────────────────────────────────

export interface InferenceLoggerConfig {
  ingestUrl: string;
  ingestApiKey: string;
  provider?: string;
  model?: string;
  redactPIIEnabled?: boolean;
  /**
   * Fire-and-forget: don't await log shipping (default: true)
   */
  asyncLogging?: boolean;
}

// ─── Main SDK Class ───────────────────────────────────────────────────────────

export class InferenceLogger {
  private config: Required<InferenceLoggerConfig>;
  private provider: BaseProvider;

  constructor(config: InferenceLoggerConfig) {
    this.config = {
      provider: "groq",
      model: process.env.DEFAULT_MODEL ?? "llama-3.3-70b-versatile",
      redactPIIEnabled: true,
      asyncLogging: true,
      ...config,
    };

    this.provider = getProvider(this.config.provider);
  }

  // ── Non-streaming completion ─────────────────────────────────────────────

  async complete(
    options: Omit<CompletionOptions, "model" | "stream"> & {
      conversationId: string;
      userId?: string;
      messageId?: string;
      ragEnabled?: boolean;
    },
  ): Promise<CompletionResult> {
    const sessionId = nanoid();
    const requestedAt = new Date();

    let result: CompletionResult;
    let status: InferenceLogPayload["status"] = "success";
    let errorMessage: string | undefined;

    try {
      result = await this.provider.complete({
        ...options,
        model: this.config.model,
        stream: false,
      });
    } catch (err: unknown) {
      status = "error";
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const respondedAt = new Date();
      const latencyMs = respondedAt.getTime() - requestedAt.getTime();

      const inputText = options.messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const inputPreview = this.maybeRedact(inputText).slice(0, 250);
      const outputPreview =
        status === "success"
          ? this.maybeRedact(result!.content).slice(0, 250)
          : undefined;

      const payload: InferenceLogPayload = {
        sessionId,
        conversationId: options.conversationId,
        messageId: options.messageId,
        userId: options.userId,
        provider: this.config.provider,
        model: this.config.model,
        requestedAt: requestedAt.toISOString(),
        respondedAt: respondedAt.toISOString(),
        latencyMs,
        promptTokens: result!?.usage.promptTokens ?? 0,
        completionTokens: result!?.usage.completionTokens ?? 0,
        totalTokens: result!?.usage.totalTokens ?? 0,
        status,
        errorMessage,
        finishReason: result!?.finishReason,
        inputPreview,
        outputPreview,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: false,
        ragEnabled: options.ragEnabled ?? false,
      };

      this.shipLog(payload);
    }

    return result!;
  }

  // ── Streaming completion ─────────────────────────────────────────────────

  async stream(
    options: Omit<CompletionOptions, "model" | "stream"> & {
      conversationId: string;
      userId?: string;
      messageId?: string;
      ragEnabled?: boolean;
    },
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<CompletionResult> {
    const sessionId = nanoid();
    const requestedAt = new Date();
    let firstChunkAt: Date | undefined;
    let status: InferenceLogPayload["status"] = "success";
    let errorMessage: string | undefined;
    let result: CompletionResult;

    try {
      result = await this.provider.stream(
        { ...options, model: this.config.model, stream: true },
        (chunk) => {
          if (!firstChunkAt && chunk.delta) firstChunkAt = new Date();
          onChunk(chunk);
        },
      );
    } catch (err: unknown) {
      status = "error";
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const respondedAt = new Date();
      const latencyMs = respondedAt.getTime() - requestedAt.getTime();
      const timeToFirstTokenMs = firstChunkAt
        ? firstChunkAt.getTime() - requestedAt.getTime()
        : undefined;

      const totalTokens = result!?.usage.totalTokens ?? 0;
      const tokensPerSecond =
        totalTokens > 0 && latencyMs > 0
          ? Math.round((totalTokens / latencyMs) * 1000)
          : undefined;

      const inputText = options.messages
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");

      const payload: InferenceLogPayload = {
        sessionId,
        conversationId: options.conversationId,
        messageId: options.messageId,
        userId: options.userId,
        provider: this.config.provider,
        model: this.config.model,
        requestedAt: requestedAt.toISOString(),
        respondedAt: respondedAt.toISOString(),
        latencyMs,
        timeToFirstTokenMs,
        promptTokens: result!?.usage.promptTokens ?? 0,
        completionTokens: result!?.usage.completionTokens ?? 0,
        totalTokens,
        status,
        errorMessage,
        finishReason: result!?.finishReason,
        inputPreview: this.maybeRedact(inputText).slice(0, 250),
        outputPreview:
          status === "success"
            ? this.maybeRedact(result!.content).slice(0, 250)
            : undefined,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        stream: true,
        ragEnabled: options.ragEnabled ?? false,
        tokensPerSecond,
      };

      this.shipLog(payload);
    }

    return result!;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  private maybeRedact(text: string): string {
    return this.config.redactPIIEnabled ? redactPII(text) : text;
  }

  private shipLog(payload: InferenceLogPayload): void {
    const send = async () => {
      try {
        await fetch(this.config.ingestUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.config.ingestApiKey,
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Non-fatal: log shipping should never break the main flow
        console.warn("[InferenceLogger] Failed to ship log:", err);
      }
    };

    if (this.config.asyncLogging) {
      // Fire and forget
      void send();
    } else {
      // Awaitable for testing / synchronous environments
      void send();
    }
  }
}

// ─── Singleton factory ───────────────────────────────────────────────────────

let _loggerInstance: InferenceLogger | null = null;

export function getInferenceLogger(): InferenceLogger {
  if (!_loggerInstance) {
    _loggerInstance = new InferenceLogger({
      ingestUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/ingest`,
      ingestApiKey: process.env.INGEST_API_KEY ?? "",
      provider: process.env.DEFAULT_PROVIDER ?? "groq",
      model: process.env.DEFAULT_MODEL ?? "llama-3.3-70b-versatile",
      redactPIIEnabled: true,
      asyncLogging: true,
    });
  }
  return _loggerInstance;
}
