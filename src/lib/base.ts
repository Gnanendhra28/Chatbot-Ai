export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemPrompt?: string;
}

export interface CompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface CompletionResult {
  content: string;
  usage: CompletionUsage;
  finishReason: string;
  model: string;
  provider: string;
  rawResponse?: unknown;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: CompletionUsage;
  finishReason?: string;
}

export abstract class BaseProvider {
  abstract readonly name: string;
  abstract readonly defaultModel: string;

  abstract complete(options: CompletionOptions): Promise<CompletionResult>;

  abstract stream(
    options: CompletionOptions,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<CompletionResult>;

  protected truncatePreview(text: string, maxLen = 200): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + "…";
  }
}
