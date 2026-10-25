/**
 * Utility to parse connection strings and extract safe metadata
 * NEVER expose raw passwords or auth tokens to client.
 */

export interface PostgresSafeMeta {
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
}

export interface RedisSafeMeta {
  host: string;
  port: number;
  dbIndex: number;
  tls: boolean;
}

export function parsePostgresUrl(urlString?: string): PostgresSafeMeta {
  const defaultMeta: PostgresSafeMeta = {
    host: "localhost",
    port: 5432,
    database: "postgres",
    user: "postgres",
    ssl: false,
  };

  const rawUrl = urlString || process.env.DATABASE_URL;
  if (!rawUrl) return defaultMeta;

  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.replace(/^\//, "") || "postgres",
      user: url.username || "postgres",
      ssl: url.searchParams.get("sslmode") === "require" || url.searchParams.get("ssl") === "true",
    };
  } catch {
    return defaultMeta;
  }
}

export function parseRedisUrl(urlString?: string): RedisSafeMeta {
  const defaultMeta: RedisSafeMeta = {
    host: "localhost",
    port: 6379,
    dbIndex: 0,
    tls: false,
  };

  const rawUrl = urlString || process.env.REDIS_URL;
  if (!rawUrl) return defaultMeta;

  try {
    const url = new URL(rawUrl);
    const dbPath = url.pathname.replace(/^\//, "");
    return {
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port, 10) : 6379,
      dbIndex: dbPath ? parseInt(dbPath, 10) || 0 : 0,
      tls: url.protocol === "rediss:",
    };
  } catch {
    return defaultMeta;
  }
}
