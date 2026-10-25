import { logger } from "./logger";

export interface SafeErrorResponse {
  success: false;
  code: string;
  message: string;
}

function sanitizeErrorMessage(msg?: string): string {
  if (!msg) return "";
  return msg
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@.+)/gi, "$1***$2")
    .replace(/(redis:\/\/[^:]*:)[^@]+(@.+)/gi, "$1***$2");
}

export function handlePostgresError(error: unknown, context = "PostgreSQL"): SafeErrorResponse {
  logger.error(context, "Database operation error", error);

  if (typeof error === "object" && error !== null) {
    const err = error as { code?: string; message?: string; name?: string };
    const rawMsg = err.message || "";

    // 1. Validation and logical checks thrown from application service
    if (rawMsg.includes("does not exist in the public schema")) {
      return {
        success: false,
        code: "TABLE_NOT_FOUND",
        message: sanitizeErrorMessage(rawMsg),
      };
    }

    if (rawMsg.startsWith("Record not found")) {
      return {
        success: false,
        code: "NOT_FOUND",
        message: sanitizeErrorMessage(rawMsg),
      };
    }

    if (rawMsg.startsWith("Invalid") && (rawMsg.includes("integer") || rawMsg.includes("numeric") || rawMsg.includes("date") || rawMsg.includes("JSON"))) {
      return {
        success: false,
        code: "INVALID_DATA_TYPE",
        message: sanitizeErrorMessage(rawMsg),
      };
    }

    if (rawMsg.startsWith("Primary key column") || rawMsg.startsWith("No valid column data") || rawMsg.startsWith("No fields provided")) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: sanitizeErrorMessage(rawMsg),
      };
    }

    // 2. Network / Socket errors & Prisma unreachable database
    if (
      rawMsg.includes("ECONNREFUSED") ||
      rawMsg.includes("Can't reach database server") ||
      err.code === "ECONNREFUSED" ||
      err.code === "P1001"
    ) {
      return {
        success: false,
        code: "CONNECTION_REFUSED",
        message: "Unable to connect to PostgreSQL server. Please verify the host, port, and that PostgreSQL is running.",
      };
    }

    if (rawMsg.includes("ETIMEDOUT") || err.code === "ETIMEDOUT") {
      return {
        success: false,
        code: "CONNECTION_TIMEOUT",
        message: "Connection to PostgreSQL timed out. Check network reachability and firewall settings.",
      };
    }

    // 3. Auth errors
    if (
      err.code === "28P01" ||
      rawMsg.includes("password authentication failed") ||
      rawMsg.includes("Authentication failed")
    ) {
      return {
        success: false,
        code: "AUTH_FAILED",
        message: "Authentication failed. Please verify PostgreSQL credentials in server configuration.",
      };
    }

    // 4. PostgreSQL standard SQL error codes
    if (err.code === "23505") {
      return {
        success: false,
        code: "DUPLICATE_KEY",
        message: "A record with this unique value already exists.",
      };
    }

    if (err.code === "23503") {
      return {
        success: false,
        code: "FOREIGN_KEY_VIOLATION",
        message: "Operation violates a foreign key constraint. The referenced record does not exist or is in use.",
      };
    }

    if (err.code === "22P02") {
      return {
        success: false,
        code: "INVALID_DATA_TYPE",
        message: "Invalid data type provided for one or more columns.",
      };
    }

    // 5. Prisma specific error codes
    if (err.code === "P2025") {
      return {
        success: false,
        code: "NOT_FOUND",
        message: "The requested record was not found.",
      };
    }

    if (err.code === "42P01") {
      return {
        success: false,
        code: "TABLE_NOT_FOUND",
        message: "The requested table does not exist in the public schema.",
      };
    }
  }

  return {
    success: false,
    code: "PG_ERROR",
    message: "A database error occurred while processing your request.",
  };
}

export function handleRedisError(error: unknown, context = "Redis"): SafeErrorResponse {
  logger.error(context, "Redis operation error", error);

  if (typeof error === "object" && error !== null) {
    const err = error as { code?: string; message?: string };
    const rawMsg = err.message || "";

    // 1. Validation & Application errors
    if (rawMsg.includes("cannot be empty") || rawMsg.includes("TTL")) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        message: sanitizeErrorMessage(rawMsg),
      };
    }

    if (rawMsg.includes("does not exist or has expired")) {
      return {
        success: false,
        code: "NOT_FOUND",
        message: sanitizeErrorMessage(rawMsg),
      };
    }

    // 2. Connection errors
    if (
      err.code === "ECONNREFUSED" ||
      rawMsg.includes("ECONNREFUSED") ||
      rawMsg.includes("max retries per request") ||
      rawMsg.includes("Connection is closed")
    ) {
      return {
        success: false,
        code: "CONNECTION_REFUSED",
        message: "Unable to connect to Redis server. Verify that Redis is active and reachable.",
      };
    }

    if (err.code === "ETIMEDOUT" || rawMsg.includes("ETIMEDOUT")) {
      return {
        success: false,
        code: "CONNECTION_TIMEOUT",
        message: "Redis connection timed out.",
      };
    }

    // 3. Auth errors
    if (
      rawMsg.includes("NOAUTH") ||
      rawMsg.includes("WRONGPASS") ||
      rawMsg.includes("Authentication required")
    ) {
      return {
        success: false,
        code: "AUTH_FAILED",
        message: "Redis authentication failed. Verify Redis credentials in server configuration.",
      };
    }

    // 4. Redis data type mismatch
    if (rawMsg.includes("WRONGTYPE")) {
      return {
        success: false,
        code: "WRONG_TYPE",
        message: "Operation against a key holding the wrong kind of value.",
      };
    }
  }

  return {
    success: false,
    code: "REDIS_ERROR",
    message: "A Redis error occurred while processing your request.",
  };
}
