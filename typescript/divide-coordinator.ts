// ═══════════════════════════════════════════════════════════
//  Cell Coding — Shared divide coordinator (Phase 4+)
//  멀티 Pod round-robin / least-loaded · Redis 집계 queue depth
// ═══════════════════════════════════════════════════════════

import Redis from 'ioredis';
import type { DividePolicy } from './cell-divide.js';

let sharedMockCoordinator: import('./in-memory-divide-coordinator.js').InMemoryDivideCoordinator | null = null;

/** 테스트 간 coordinator 리셋 */
export function resetSharedMockDivideCoordinator(): void {
  sharedMockCoordinator = null;
}

export interface DivideCoordinator {
  pickReplica(
    organ: string,
    strategy: DividePolicy['strategy'],
    replicaCount: number,
    dryRun?: boolean,
  ): Promise<number>;
  recordDispatch(organ: string, replica: number, weight?: number): Promise<void>;
  setReplicaQueueDepth(organ: string, replica: number, depth: number): Promise<void>;
  aggregateQueueDepth(organ: string, replicaCount: number): Promise<number>;
  fetchReplicaLoads(organ: string, replicaCount: number): Promise<number[]>;
}

function rrKey(organ: string): string {
  return `cell:divide:${organ}:rr`;
}

function loadKey(organ: string): string {
  return `cell:divide:${organ}:load`;
}

function queueKey(organ: string): string {
  return `cell:divide:${organ}:queue`;
}

/** Redis coordinator · 멀티 Pod divide 상태 공유 */
export class RedisDivideCoordinator implements DivideCoordinator {
  private redis: Redis;

  constructor(url: string) {
    this.redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
  }

  async connect(): Promise<void> {
    if (this.redis.status !== 'ready') await this.redis.connect();
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  async pickReplica(
    organ: string,
    strategy: DividePolicy['strategy'],
    replicaCount: number,
    dryRun = false,
  ): Promise<number> {
    if (replicaCount <= 1) return 0;

    if (strategy === 'round-robin') {
      if (dryRun) {
        const v = Number(await this.redis.get(rrKey(organ)) ?? 0);
        return v % replicaCount;
      }
      const n = await this.redis.incr(rrKey(organ));
      return (n - 1) % replicaCount;
    }

    const loads = await this.fetchReplicaLoads(organ, replicaCount);
    if (strategy === 'random') {
      return Math.floor(Math.random() * replicaCount);
    }

    // least-loaded
    let best = 0;
    let minLoad = Infinity;
    for (let i = 0; i < replicaCount; i++) {
      if (loads[i] < minLoad) {
        minLoad = loads[i];
        best = i;
      }
    }
    return best;
  }

  async recordDispatch(organ: string, replica: number, weight = 1): Promise<void> {
    await this.redis.hincrby(loadKey(organ), String(replica), weight);
  }

  async setReplicaQueueDepth(organ: string, replica: number, depth: number): Promise<void> {
    await this.redis.hset(queueKey(organ), String(replica), String(depth));
  }

  async aggregateQueueDepth(organ: string, replicaCount: number): Promise<number> {
    const rows = await this.redis.hgetall(queueKey(organ));
    let sum = 0;
    for (let i = 0; i < replicaCount; i++) {
      sum += Number(rows[String(i)] ?? 0);
    }
    return sum;
  }

  async fetchReplicaLoads(organ: string, replicaCount: number): Promise<number[]> {
    const rows = await this.redis.hgetall(loadKey(organ));
    return Array.from({ length: replicaCount }, (_, i) => Number(rows[String(i)] ?? 0));
  }
}

export async function createDivideCoordinator(
  url?: string,
  mock = false,
): Promise<DivideCoordinator | undefined> {
  if (mock || process.env.CELL_REDIS_MOCK === '1') {
    if (!sharedMockCoordinator) {
      const { InMemoryDivideCoordinator } = await import('./in-memory-divide-coordinator.js');
      sharedMockCoordinator = new InMemoryDivideCoordinator();
    }
    return sharedMockCoordinator;
  }
  if (!url) return undefined;
  const coord = new RedisDivideCoordinator(url);
  await coord.connect();
  return coord;
}
