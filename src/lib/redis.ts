import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client with credentials from environment variables
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = new Redis({
  url: redisUrl || 'https://endless-boar-175362.upstash.io',
  token: redisToken || 'gQAAAAAAAq0CAAIgcDI2ZmYzYTdjZDExYjg0ODkwODVjYjVlNmZjMGExMDgxYw',
});
