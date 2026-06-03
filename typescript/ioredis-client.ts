// ioredis ESM helper (NodeNext + tsc)
import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

export type RedisClient = Redis;

export function createRedisClient(url: string, options?: RedisOptions): RedisClient {
  return options ? new Redis(url, options) : new Redis(url);
}
