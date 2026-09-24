import zlib from "zlib";

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedPdfResult {
  pageCount: number;
  pages: ExtractedPdfPage[];
  text: string;
}

/**
 * Pure Node.js PDF text extractor using built-in zlib.
 * No external npm packages, worker threads, or .mjs Webpack bundle dependencies.
 */
export function parsePdfBuffer(buffer: Buffer): ExtractedPdfResult {
  const content = buffer.toString("binary");
  const pages: ExtractedPdfPage[] = [];

  // Match PDF stream blocks: stream ... endstream
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;
  const textSegments: string[] = [];
  let pageNum = 1;

  while ((match = streamRegex.exec(content)) !== null) {
    const rawStreamData = match[1];
    let decompressedText = "";

    try {
      const streamBuf = Buffer.from(rawStreamData, "binary");
      const decompressed = zlib.unzipSync(streamBuf);
      decompressedText = decompressed.toString("utf-8");
    } catch {
      // If uncompressed stream or alternative encoding
      decompressedText = rawStreamData;
    }

    const pageText = extractTextFromPdfCommands(decompressedText);
    if (pageText.trim()) {
      pages.push({
        pageNumber: pageNum,
        text: pageText,
      });
      textSegments.push(pageText);
      pageNum++;
    }
  }

  // Fallback: If no stream matches, attempt direct PostScript text extraction
  if (textSegments.length === 0) {
    const fallbackText = extractTextFromPdfCommands(content);
    if (fallbackText.trim()) {
      pages.push({
        pageNumber: 1,
        text: fallbackText,
      });
      textSegments.push(fallbackText);
    }
  }

  const fullText = textSegments.join("\n\n");
  return {
    pageCount: Math.max(pages.length, 1),
    pages: pages.length > 0 ? pages : [{ pageNumber: 1, text: fullText }],
    text: fullText,
  };
}

/**
 * Extract plain text from PostScript PDF operators: (text) Tj, [(text)] TJ, etc.
 */
function extractTextFromPdfCommands(commandText: string): string {
  const textMatches: string[] = [];

  // Match array strings: [(string1) 120 (string2)] TJ
  const arrayRegex = /\[([\s\S]*?)\]\s*TJ/gi;
  let m: RegExpExecArray | null;
  while ((m = arrayRegex.exec(commandText)) !== null) {
    const arrayContent = m[1];
    const subStringRegex = /\(([\s\S]*?)\)/g;
    let subM: RegExpExecArray | null;
    let combined = "";
    while ((subM = subStringRegex.exec(arrayContent)) !== null) {
      combined += cleanPdfString(subM[1]);
    }
    if (combined.trim()) {
      textMatches.push(combined.trim());
    }
  }

  // Match direct strings: (string) Tj or (string) TJ
  const stringRegex = /\(([\s\S]*?)\)\s*(?:Tj|'|")/gi;
  while ((m = stringRegex.exec(commandText)) !== null) {
    const str = cleanPdfString(m[1]);
    if (str.trim()) {
      textMatches.push(str.trim());
    }
  }

  return textMatches.join(" ");
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\\( /g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}
