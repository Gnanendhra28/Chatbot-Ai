import Groq from "groq-sdk";

import { estimateTokens, calculateLatency, InferenceMetrics } from "./metrics";

import { logInfo, logError } from "./logger";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface GenerateOptions {
  model: string;

  message: string;

  temperature?: number;

  maxTokens?: number;
}

const SAFE_MODELS = [
  "llama-3.3-70b-versatile",

  "llama-3.1-8b-instant",

  "llama3-70b-8192",

  "gemma2-9b-it",
];

export async function generateLLMResponse({
  model,
  message,
  temperature = 0.7,
  maxTokens = 2048,
}: GenerateOptions) {
  const startTime = Date.now();

  const safeModel = SAFE_MODELS.includes(model)
    ? model
    : "llama-3.3-70b-versatile";

  try {
    logInfo("LLM request started", {
      model: safeModel,
    });

    const completion = await groq.chat.completions.create({
      model: safeModel,

      messages: [
        {
          role: "user",
          content: message,
        },
      ],

      temperature,

      max_tokens: maxTokens,
    });

    const response = completion.choices[0]?.message?.content || "";

    const usage = completion.usage;

    const metrics: InferenceMetrics = {
      latency: calculateLatency(startTime),

      promptTokens: usage?.prompt_tokens ?? estimateTokens(message),

      completionTokens: usage?.completion_tokens ?? estimateTokens(response),

      totalTokens: usage?.total_tokens ?? estimateTokens(message + response),

      provider: "groq",

      model: safeModel,

      timestamp: new Date(),
    };

    logInfo("LLM request completed", metrics);

    return {
      response,

      metrics,
    };
  } catch (error) {
    logError("LLM request failed", error);

    throw error;
  }
}
