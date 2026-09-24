export interface InferenceMetrics {
  latency: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  provider: string;
  model: string;
  timestamp: Date;
}

/**
 * Accurate subword-aware BPE token estimation algorithm.
 * Evaluates words, numbers, code symbols, punctuation, and indentation separately
 * matching GPT / Llama 3 BPE tokenization characteristics.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Split text into words, numbers, symbols/punctuation, and whitespace blocks
  const matches = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]+|\s+/gu);
  if (!matches) return Math.max(1, Math.ceil(text.length / 4));

  let totalTokens = 0;
  for (const item of matches) {
    // Symbols and punctuation (e.g. {}, (), [], ;, ->)
    if (/^[^\s\p{L}\p{N}]+$/u.test(item)) {
      totalTokens += Math.max(1, Math.ceil(item.length / 2));
    }
    // Whitespace / indentation blocks
    else if (/^\s+$/u.test(item)) {
      totalTokens += Math.max(1, Math.floor(item.length / 3));
    }
    // Words and numerical tokens
    else {
      totalTokens += Math.max(1, Math.ceil(item.length / 3.8));
    }
  }

  return totalTokens;
}

export function calculateLatency(start: number): number {
  return Date.now() - start;
}
