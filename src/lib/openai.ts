import OpenAI from "openai";
import {
  BaseProvider,
  CompletionOptions,
  CompletionResult,
  StreamChunk,
} from "./base";

export class OpenAIProvider extends BaseProvider {
  readonly name = "openai";
  readonly defaultModel = "gpt-4o-mini";

  private client: OpenAI;

  constructor(apiKey?: string) {
    super();
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages = this.buildMessages(options);

    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
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
    };
  }

  async stream(
    options: CompletionOptions,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<CompletionResult> {
    const messages = this.buildMessages(options);
    let fullContent = "";
    let finishReason = "stop";

    const stream = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
      stream_options: { include_usage: true },
    });

    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      const isDone = chunk.choices[0]?.finish_reason != null;
      fullContent += delta;

      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens ?? 0,
          completionTokens: chunk.usage.completion_tokens ?? 0,
          totalTokens: chunk.usage.total_tokens ?? 0,
        };
      }

      if (isDone) finishReason = chunk.choices[0]?.finish_reason ?? "stop";

      onChunk({ delta, done: isDone, usage: isDone ? usage : undefined });
    }

    return {
      content: fullContent,
      usage,
      finishReason,
      model: options.model ?? this.defaultModel,
      provider: this.name,
    };
  }

  private buildMessages(
    options: CompletionOptions,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (options.systemPrompt)
      msgs.push({ role: "system", content: options.systemPrompt });
    for (const m of options.messages)
      msgs.push({ role: m.role as "user" | "assistant", content: m.content });
    return msgs;
  }
}
