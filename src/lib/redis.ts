import Redis, { RedisOptions } from "ioredis";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

function createRedisInstance(): Redis {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const options: RedisOptions = {
    maxRetriesPerRequest: 1,
    connectTimeout: 4000,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => {
      // Don't hammer if disconnected
      if (times > 3) {
        return null;
      }
      return Math.min(times * 200, 1000);
    },
  };

  const client = new Redis(redisUrl, options);

  client.on("error", (err) => {
    logger.error("RedisClient", "Background connection event error", err);
  });

  return client;
}

export const getRedisClient = (): Redis => {
  if (!globalForRedis.redisClient) {
    globalForRedis.redisClient = createRedisInstance();
  }
  return globalForRedis.redisClient;
};

export const redis = getRedisClient();
