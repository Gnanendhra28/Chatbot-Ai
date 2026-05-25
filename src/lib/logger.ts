export function logInfo(message: string, data?: unknown) {
  console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || "");
}

export function logError(message: string, error?: unknown) {
  console.error(
    `[ERROR] ${new Date().toISOString()} - ${message}`,
    error || "",
  );
}
