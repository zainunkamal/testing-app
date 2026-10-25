import { redis } from "@/lib/redis";
import { parseRedisUrl, RedisSafeMeta } from "@/lib/url-sanitizer";
import { handleRedisError } from "@/lib/errors";
import {
  RedisConnectionStatus,
  RedisKeyItem,
  RedisScanResult,
  RedisValueType,
  RedisValueResponse,
  RedisInfo,
} from "@/types/redis";
import { logger } from "@/lib/logger";

export class RedisService {
  /**
   * Safely test Redis connection using PING
   */
  async testConnection(): Promise<RedisConnectionStatus> {
    const meta: RedisSafeMeta = parseRedisUrl();
    const startTime = performance.now();

    try {
      const pong = await redis.ping();
      const latencyMs = Math.round(performance.now() - startTime);

      logger.info("RedisService", "Connection test successful", {
        host: meta.host,
        dbIndex: meta.dbIndex,
        latencyMs,
        response: pong,
      });

      return {
        isConnected: true,
        status: "CONNECTED",
        message: "Redis connection successful.",
        meta,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const safeError = handleRedisError(error, "RedisService.testConnection");
      const latencyMs = Math.round(performance.now() - startTime);

      return {
        isConnected: false,
        status: "DISCONNECTED",
        message: safeError.message,
        meta,
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get safe connection metadata without password
   */
  getSafeMetadata(): RedisSafeMeta {
    return parseRedisUrl();
  }

  /**
   * Safely scan keys using non-blocking SCAN iterator with pipelined metadata retrieval
   */
  async scanKeys(options?: {
    pattern?: string;
    cursor?: string;
    count?: number;
  }): Promise<RedisScanResult> {
    const pattern = options?.pattern && options.pattern.trim() !== "" ? options.pattern.trim() : "*";
    const cursor = options?.cursor || "0";
    const count = Math.min(200, Math.max(1, options?.count || 50));

    try {
      logger.info("RedisService.scanKeys", "Scanning keys", { pattern, cursor, count });

      // Execute non-blocking SCAN
      const [nextCursor, rawKeys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", count);

      if (!rawKeys || rawKeys.length === 0) {
        return {
          keys: [],
          cursor: nextCursor,
          hasMore: nextCursor !== "0",
          totalReturned: 0,
        };
      }

      // Pipeline TYPE and TTL for all returned keys in 1 network roundtrip
      const pipeline = redis.pipeline();
      for (const key of rawKeys) {
        pipeline.type(key);
        pipeline.ttl(key);
      }

      const results = await pipeline.exec();
      const keys: RedisKeyItem[] = [];

      for (let i = 0; i < rawKeys.length; i++) {
        const key = rawKeys[i];
        const typeResult = results ? results[i * 2] : null;
        const ttlResult = results ? results[i * 2 + 1] : null;

        const type = (typeResult && !typeResult[0] && typeof typeResult[1] === "string"
          ? typeResult[1]
          : "none") as RedisValueType;

        const ttl = ttlResult && !ttlResult[0] && typeof ttlResult[1] === "number"
          ? ttlResult[1]
          : -1;

        keys.push({
          key,
          type,
          ttl,
        });
      }

      // Sort keys alphabetically
      keys.sort((a, b) => a.key.localeCompare(b.key));

      return {
        keys,
        cursor: nextCursor,
        hasMore: nextCursor !== "0",
        totalReturned: keys.length,
      };
    } catch (error) {
      logger.error("RedisService.scanKeys", "Failed to scan keys", error);
      throw error;
    }
  }

  /**
   * Get value of a specific key according to its Redis data type
   * Supports: string, JSON detection, hash, list, set, zset
   */
  async getKeyValue(key: string): Promise<RedisValueResponse> {
    if (!key || key.trim() === "") {
      throw new Error("Key name cannot be empty.");
    }

    const cleanKey = key.trim();

    try {
      const type = (await redis.type(cleanKey)) as RedisValueType;

      if (type === "none") {
        throw new Error(`Key "${cleanKey}" does not exist or has expired.`);
      }

      const ttl = await redis.ttl(cleanKey);
      let value: unknown = null;
      let isJson = false;

      switch (type) {
        case "string": {
          const raw = await redis.get(cleanKey);
          value = raw;
          if (raw) {
            try {
              value = JSON.parse(raw);
              isJson = true;
            } catch {
              isJson = false;
            }
          }
          break;
        }
        case "hash": {
          value = await redis.hgetall(cleanKey);
          break;
        }
        case "list": {
          value = await redis.lrange(cleanKey, 0, 99);
          break;
        }
        case "set": {
          value = await redis.smembers(cleanKey);
          break;
        }
        case "zset": {
          value = await redis.zrange(cleanKey, "0", "99");
          break;
        }
        default:
          value = await redis.get(cleanKey);
      }

      return {
        key: cleanKey,
        type,
        ttl,
        value,
        isJson,
      };
    } catch (error) {
      logger.error("RedisService.getKeyValue", `Failed to get value for ${cleanKey}`, error);
      throw error;
    }
  }

  /**
   * Set a key-value pair in Redis with optional TTL (expiration in seconds)
   */
  async setKey(options: {
    key: string;
    value: string;
    ttl?: number | null;
  }): Promise<{ success: boolean; key: string }> {
    const { key, value, ttl } = options;

    if (!key || key.trim() === "") {
      throw new Error("Key name cannot be empty.");
    }

    const cleanKey = key.trim();
    const cleanValue = String(value ?? "");

    try {
      if (ttl !== undefined && ttl !== null && Number(ttl) > 0) {
        await redis.set(cleanKey, cleanValue, "EX", Number(ttl));
      } else {
        await redis.set(cleanKey, cleanValue);
      }

      logger.info("RedisService.setKey", `Key set successfully: ${cleanKey}`, { ttl });
      return { success: true, key: cleanKey };
    } catch (error) {
      logger.error("RedisService.setKey", `Failed to set key ${cleanKey}`, error);
      throw error;
    }
  }

  /**
   * Update an existing key value and optionally update or preserve TTL
   */
  async updateKey(options: {
    key: string;
    value: string;
    ttl?: number | null;
  }): Promise<{ success: boolean; key: string }> {
    const { key, value, ttl } = options;

    if (!key || key.trim() === "") {
      throw new Error("Key name cannot be empty.");
    }

    const cleanKey = key.trim();
    const cleanValue = String(value ?? "");

    try {
      if (ttl !== undefined && ttl !== null && Number(ttl) > 0) {
        await redis.set(cleanKey, cleanValue, "EX", Number(ttl));
      } else if (ttl === null || ttl === -1) {
        // Remove expiration -> make persistent
        await redis.set(cleanKey, cleanValue);
      } else {
        // Preserve existing TTL
        await redis.set(cleanKey, cleanValue, "KEEPTTL");
      }

      logger.info("RedisService.updateKey", `Key updated successfully: ${cleanKey}`, { ttl });
      return { success: true, key: cleanKey };
    } catch (error) {
      logger.error("RedisService.updateKey", `Failed to update key ${cleanKey}`, error);
      throw error;
    }
  }

  /**
   * Delete a key from Redis
   */
  async deleteKey(key: string): Promise<{ success: boolean; key: string; deletedCount: number }> {
    if (!key || key.trim() === "") {
      throw new Error("Key name cannot be empty.");
    }

    const cleanKey = key.trim();

    try {
      const deletedCount = await redis.del(cleanKey);
      logger.info("RedisService.deleteKey", `Key deleted: ${cleanKey}`, { deletedCount });
      return { success: true, key: cleanKey, deletedCount };
    } catch (error) {
      logger.error("RedisService.deleteKey", `Failed to delete key ${cleanKey}`, error);
      throw error;
    }
  }

  /**
   * Get server specifications, memory usage, clients, and telemetry
   */
  async getRedisInfo(): Promise<RedisInfo> {
    const meta = this.getSafeMetadata();
    try {
      const [rawInfo, dbsize] = await Promise.all([
        redis.info(),
        redis.dbsize().catch(() => 0),
      ]);

      const parsed: Record<string, string> = {};
      const keyspace: Record<string, string> = {};

      const lines = rawInfo.split("\r\n");
      for (const line of lines) {
        if (!line || line.startsWith("#")) continue;
        const index = line.indexOf(":");
        if (index > 0) {
          const key = line.substring(0, index).trim();
          const value = line.substring(index + 1).trim();
          parsed[key] = value;
          if (key.startsWith("db")) {
            keyspace[key] = value;
          }
        }
      }

      return {
        redisVersion: parsed["redis_version"] || "Unknown",
        redisMode: parsed["redis_mode"],
        os: parsed["os"],
        connectedClients: parseInt(parsed["connected_clients"] || "0", 10),
        blockedClients: parseInt(parsed["blocked_clients"] || "0", 10),
        usedMemoryHuman: parsed["used_memory_human"] || "0B",
        usedMemoryPeakHuman: parsed["used_memory_peak_human"],
        uptimeInDays: parseInt(parsed["uptime_in_days"] || "0", 10),
        uptimeInSeconds: parseInt(parsed["uptime_in_seconds"] || "0", 10),
        totalKeys: dbsize,
        totalCommandsProcessed: parseInt(parsed["total_commands_processed"] || "0", 10),
        instantaneousOpsPerSec: parseInt(parsed["instantaneous_ops_per_sec"] || "0", 10),
        totalConnectionsReceived: parseInt(parsed["total_connections_received"] || "0", 10),
        keyspace,
        status: "CONNECTED",
        host: meta.host,
        port: meta.port,
        dbIndex: meta.dbIndex,
        rawStats: parsed,
      };
    } catch (error) {
      logger.error("RedisService.getRedisInfo", "Failed to retrieve Redis info", error);
      return {
        redisVersion: "Unavailable",
        connectedClients: 0,
        usedMemoryHuman: "Unavailable",
        uptimeInDays: 0,
        totalKeys: 0,
        status: "DISCONNECTED",
        host: meta.host,
        port: meta.port,
        dbIndex: meta.dbIndex,
      };
    }
  }
}

export const redisService = new RedisService();
