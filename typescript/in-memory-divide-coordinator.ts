// ═══════════════════════════════════════════════════════════
//  Cell Coding — in-memory divide coordinator (tests)
// ═══════════════════════════════════════════════════════════

import { DivideBalancer } from './cell-divide.js';
import type { DivideCoordinator } from './divide-coordinator.js';
import type { DividePolicy } from './cell-divide.js';

/** in-memory coordinator · 테스트 / CELL_REDIS_MOCK */
export class InMemoryDivideCoordinator implements DivideCoordinator {
  private balancers = new Map<string, DivideBalancer>();
  private queues = new Map<string, Map<number, number>>();

  private balancer(organ: string): DivideBalancer {
    if (!this.balancers.has(organ)) this.balancers.set(organ, new DivideBalancer());
    return this.balancers.get(organ)!;
  }

  async pickReplica(
    organ: string,
    strategy: DividePolicy['strategy'],
    replicaCount: number,
    dryRun = false,
  ): Promise<number> {
    const b = this.balancer(organ);
    b.setReplicaLoads(await this.fetchReplicaLoads(organ, replicaCount));
    return b.pickReplica(strategy, replicaCount, { dryRun });
  }

  async recordDispatch(organ: string, replica: number, weight = 1): Promise<void> {
    this.balancer(organ).recordDispatch(replica, weight);
  }

  async setReplicaQueueDepth(organ: string, replica: number, depth: number): Promise<void> {
    const map = this.queues.get(organ) ?? new Map<number, number>();
    map.set(replica, depth);
    this.queues.set(organ, map);
  }

  async aggregateQueueDepth(organ: string, replicaCount: number): Promise<number> {
    const map = this.queues.get(organ);
    if (!map) return 0;
    let sum = 0;
    for (let i = 0; i < replicaCount; i++) sum += map.get(i) ?? 0;
    return sum;
  }

  async fetchReplicaLoads(organ: string, replicaCount: number): Promise<number[]> {
    const b = this.balancers.get(organ);
    if (!b) return Array.from({ length: replicaCount }, () => 0);
    return Array.from({ length: replicaCount }, (_, i) => b.getReplicaLoad(i));
  }
}
