import { createClient } from "redis";

// before use redisClient.connect()
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});
