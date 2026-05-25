/**
 * Lightweight PII redaction using regex patterns.
 * For production, consider a proper NLP-based solution (Presidio, AWS Comprehend, etc.)
 */

interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string;
}

const REDACTION_RULES: RedactionRule[] = [
  // Email addresses
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL]",
  },
  // Phone numbers (various formats)
  {
    name: "phone",
    pattern: /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
    replacement: "[PHONE]",
  },
  // Social Security Numbers
  {
    name: "ssn",
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: "[SSN]",
  },
  // Credit card numbers (basic)
  {
    name: "credit_card",
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: "[CREDIT_CARD]",
  },
  // IP addresses
  {
    name: "ip_address",
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: "[IP_ADDRESS]",
  },
  // Dates of birth patterns (MM/DD/YYYY, DD-MM-YYYY, etc.)
  {
    name: "date",
    pattern: /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g,
    replacement: "[DATE]",
  },
  // API keys / secrets (heuristic: long alphanumeric strings)
  {
    name: "api_key",
    pattern: /\b(sk-|pk-|gsk_|Bearer\s)[A-Za-z0-9_\-]{20,}\b/g,
    replacement: "[API_KEY]",
  },
  // AWS access keys
  {
    name: "aws_key",
    pattern: /\b(AKIA|ASIA|AROA)[A-Z0-9]{16}\b/g,
    replacement: "[AWS_KEY]",
  },
];

export function redactPII(text: string): string {
  let redacted = text;
  for (const rule of REDACTION_RULES) {
    redacted = redacted.replace(rule.pattern, rule.replacement);
  }
  return redacted;
}

export function redactPIIFromMessages(
  messages: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    ...msg,
    content: redactPII(msg.content),
  }));
}

export function getRedactionSummary(
  original: string,
  redacted: string,
): {
  hadPII: boolean;
  redactedCount: number;
} {
  const redactedCount = (
    redacted.match(
      /\[(EMAIL|PHONE|SSN|CREDIT_CARD|IP_ADDRESS|DATE|API_KEY|AWS_KEY)\]/g,
    ) ?? []
  ).length;
  return {
    hadPII: redactedCount > 0,
    redactedCount,
  };
}
