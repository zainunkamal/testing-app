/**
 * Safe server-side logger that sanitizes sensitive data (passwords, connection strings, secrets)
 */

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    // Redact postgres:// and redis:// connection strings with passwords
    return value
      .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.+)/gi, "$1***$2")
      .replace(/(redis:\/\/[^:]*:)[^@]+(@.+)/gi, "$1***$2");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (typeof value === "object" && value !== null) {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (/password|secret|token|credential|key/i.test(k) && typeof v === "string" && k.toLowerCase() !== "primarykey") {
        sanitizedObj[k] = "***";
      } else {
        sanitizedObj[k] = sanitizeValue(v);
      }
    }
    return sanitizedObj;
  }
  return value;
}

function sanitizeMessage(message: unknown): string {
  if (typeof message === "string") {
    return message
      .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.+)/gi, "$1***$2")
      .replace(/(redis:\/\/[^:]*:)[^@]+(@.+)/gi, "$1***$2");
  }
  if (message instanceof Error) {
    return sanitizeMessage(message.message);
  }
  return String(message);
}

export const logger = {
  info: (context: string, message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? JSON.stringify(sanitizeValue(meta)) : "";
    console.log(`[INFO] [${timestamp}] [${context}] ${sanitizeMessage(message)}`, cleanMeta);
  },
  warn: (context: string, message: string, meta?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? JSON.stringify(sanitizeValue(meta)) : "";
    console.warn(`[WARN] [${timestamp}] [${context}] ${sanitizeMessage(message)}`, cleanMeta);
  },
  error: (context: string, message: string, error?: unknown) => {
    const timestamp = new Date().toISOString();
    const cleanError = error instanceof Error ? sanitizeMessage(error.message) : sanitizeMessage(error);
    console.error(`[ERROR] [${timestamp}] [${context}] ${sanitizeMessage(message)}: ${cleanError}`);
  },
};
