import Groq from "groq-sdk";
import { estimateTokens } from "./metrics";
import {
  BaseProvider,
  ChatMessage,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "./base";

export class GroqProvider extends BaseProvider {
  readonly name = "groq";
  readonly defaultModel = "llama-3.3-70b-versatile";

  private client: Groq;

  constructor(apiKey?: string) {
    super();
    this.client = new Groq({ apiKey: apiKey ?? process.env.GROQ_API_KEY });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages = this.buildMessages(options);

    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: false,
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice.message.content ?? "",
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason ?? "stop",
      model: response.model,
      provider: this.name,
      rawResponse: response,
    };
  }

  async stream(
    options: CompletionOptions,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<CompletionResult> {
    const messages = this.buildMessages(options);
    let fullContent = "";
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let finishReason = "stop";

    const streamResponse = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    });

    for await (const chunk of streamResponse) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      const isDone = chunk.choices[0]?.finish_reason != null;

      fullContent += delta;

      if (isDone) {
        finishReason = chunk.choices[0]?.finish_reason ?? "stop";

        usage = {
          promptTokens: 0,

          completionTokens: estimateTokens(fullContent),

          totalTokens: estimateTokens(fullContent),
        };
      }

      onChunk({
        delta,
        done: isDone,
        usage: isDone ? usage : undefined,
        finishReason: isDone ? finishReason : undefined,
      });

      if (isDone) break;
    }

    return {
      content: fullContent,
      usage,
      finishReason,
      model: options.model ?? this.defaultModel,
      provider: this.name,
    };
  }

  private buildMessages(options: CompletionOptions): any[] {
    const messages: any[] = [];

    if (options.systemPrompt) {
      messages.push({
        role: "system",
        content: options.systemPrompt,
      });
    }

    for (const msg of options.messages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }
}
