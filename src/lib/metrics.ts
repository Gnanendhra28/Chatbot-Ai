export interface InferenceMetrics {
  latency: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  model: string;
  timestamp: Date;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function calculateLatency(start: number): number {
  return Date.now() - start;
}
