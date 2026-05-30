// ═══════════════════════════════════════════════════════════
//  Cell Coding — Signal bus adapters (Phase 2)
//  인메모리 우선순위 큐 + Redis 호환 어댑터
// ═══════════════════════════════════════════════════════════

import type { SignalPriority } from './signal-priority.js';
import { priorityRank } from './signal-priority.js';

export interface SignalInstance {
  type: string;
  data: Record<string, unknown>;
}

export interface BusMessage {
  signal: SignalInstance;
  from: string;
  priority: SignalPriority;
  /** FIFO tie-breaker within same priority · 동일 우선순위 내 순서 */
  seq: number;
}

/** Immutable signal copy for bus delivery · 버스 전달용 불변 신호 복사 */
export function freezeSignal(signal: SignalInstance): SignalInstance {
  const data = structuredClone(signal.data);
  Object.freeze(data);
  return Object.freeze({ type: signal.type, data }) as SignalInstance;
}

export interface SignalBusAdapter {
  enqueue(message: BusMessage): void;
  dequeue(): BusMessage | undefined;
  peek(): BusMessage | undefined;
  size(): number;
  clear(): void;
}

/** In-memory priority queue (critical → low, FIFO within rank). */
/** 인메모리 우선순위 큐 (critical → low, 동순위 FIFO). */
export class InMemorySignalBus implements SignalBusAdapter {
  private items: BusMessage[] = [];
  private seq = 0;

  enqueue(message: BusMessage): void {
    const item: BusMessage = {
      ...message,
      signal: freezeSignal(message.signal),
      seq: message.seq ?? ++this.seq,
    };
    this.items.push(item);
    this.items.sort((a, b) => {
      const dr = priorityRank(a.priority) - priorityRank(b.priority);
      return dr !== 0 ? dr : a.seq - b.seq;
    });
  }

  dequeue(): BusMessage | undefined {
    return this.items.shift();
  }

  peek(): BusMessage | undefined {
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
    this.seq = 0;
  }
}

/** Minimal Redis LIST client surface · Redis LIST 클라이언트 최소 인터페이스 */
export interface RedisLikeClient {
  rPush(key: string, value: string): Promise<number> | number;
  lPop(key: string): Promise<string | null> | string | null;
}

/**
 * Redis-backed bus: serializes messages to JSON on a LIST key.
 * Production deployments swap InMemorySignalBus for this adapter.
 * Redis 기반 버스: LIST 키에 JSON 메시지를 저장한다.
 */
export class RedisSignalBusAdapter implements SignalBusAdapter {
  private local: InMemorySignalBus;
  private seq = 0;

  constructor(
    private client: RedisLikeClient,
    private channel = 'cell:signals',
  ) {
    this.local = new InMemorySignalBus();
  }

  enqueue(message: BusMessage): void {
    const item: BusMessage = {
      ...message,
      signal: freezeSignal(message.signal),
      seq: message.seq ?? ++this.seq,
    };
    const payload = JSON.stringify(item);
    void Promise.resolve(this.client.rPush(this.channel, payload));
    this.local.enqueue(item);
  }

  dequeue(): BusMessage | undefined {
    return this.local.dequeue();
  }

  peek(): BusMessage | undefined {
    return this.local.peek();
  }

  size(): number {
    return this.local.size();
  }

  clear(): void {
    this.local.clear();
    this.seq = 0;
  }
}

/** Test double implementing Redis LIST in process memory. */
/** 프로세스 메모리 Redis LIST 테스트 더블 */
export class InMemoryRedisLikeClient implements RedisLikeClient {
  private lists = new Map<string, string[]>();

  rPush(key: string, value: string): number {
    const list = this.lists.get(key) ?? [];
    list.push(value);
    this.lists.set(key, list);
    return list.length;
  }

  lPop(key: string): string | null {
    const list = this.lists.get(key);
    if (!list?.length) return null;
    return list.shift() ?? null;
  }
}
