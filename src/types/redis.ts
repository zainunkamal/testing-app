import { RedisSafeMeta } from "@/lib/url-sanitizer";
import { ConnectionState } from "./postgres";

export interface RedisConnectionStatus {
  isConnected: boolean;
  status: ConnectionState;
  message: string;
  meta: RedisSafeMeta;
  latencyMs?: number;
  timestamp: string;
}

export type RedisValueType = "string" | "hash" | "list" | "set" | "zset" | "none";

export interface RedisKeyItem {
  key: string;
  type: RedisValueType;
  ttl: number; // in seconds, -1 if no TTL, -2 if not exists
}

export interface RedisScanResult {
  keys: RedisKeyItem[];
  cursor: string;
  hasMore: boolean;
  totalReturned: number;
}

export interface RedisValueResponse {
  key: string;
  type: RedisValueType;
  ttl: number;
  value: unknown;
  isJson: boolean;
  rawSize?: number;
}

export interface RedisInfo {
  redisVersion: string;
  redisMode?: string;
  os?: string;
  connectedClients: number;
  blockedClients?: number;
  usedMemoryHuman: string;
  usedMemoryPeakHuman?: string;
  uptimeInDays: number;
  uptimeInSeconds?: number;
  totalKeys: number;
  totalCommandsProcessed?: number;
  instantaneousOpsPerSec?: number;
  totalConnectionsReceived?: number;
  keyspace?: Record<string, string>;
  status: ConnectionState;
  host: string;
  port: number;
  dbIndex: number;
  rawStats?: Record<string, string>;
}
