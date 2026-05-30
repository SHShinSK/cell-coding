// ═══════════════════════════════════════════════════════════
//  Cell Coding — Redis Streams signal bus (Phase 4)
//  Cloud runtime 분산 버스 PoC
// ═══════════════════════════════════════════════════════════

import type { BusMessage, SignalBusAdapter, SignalInstance } from './signal-bus.js';
import { InMemorySignalBus, freezeSignal } from './signal-bus.js';
import type { SignalPriority } from './signal-priority.js';
import { priorityRank } from './signal-priority.js';

/** Minimal Redis Streams client · Redis Streams 클라이언트 최소 인터페이스 */
export type StreamEntry = { id: string; fields: Record<string, string> };

export interface RedisStreamsClient {
  xAdd(stream: string, fields: Record<string, string>): Promise<string> | string;
  xRange(stream: string, start?: string, end?: string): Promise<StreamEntry[]>;
  /** @deprecated nervous ingress는 Consumer Group 사용 권장 */
  xReadAfter(stream: string, lastId: string, count?: number): Promise<StreamEntry[]>;
  xGroupCreate(stream: string, group: string, id?: string, mkStream?: boolean): Promise<void>;
  xReadGroup(stream: string, group: string, consumer: string, count?: number): Promise<StreamEntry[]>;
  xAck(stream: string, group: string, ...ids: string[]): Promise<number>;
  xPendingCount?(stream: string, group: string): Promise<number>;
  /** PEL idle 초과 메시지 재claim · stuck consumer 복구 */
  xAutoClaim?(
    stream: string,
    group: string,
    consumer: string,
    minIdleMs: number,
    startId?: string,
    count?: number,
  ): Promise<{ entries: StreamEntry[]; nextStart: string }>;
}

/** In-memory Streams test double · Streams 테스트 더블 */
export class InMemoryRedisStreamsClient implements RedisStreamsClient {
  private streams = new Map<string, StreamEntry[]>();
  private seq = 0;
  private groupStartIndex = new Map<string, number>();
  private groupReadIndex = new Map<string, number>();
  private pending = new Map<string, { entry: StreamEntry; consumer: string; claimedAt: number }>();

  private groupKey(stream: string, group: string): string {
    return `${stream}\0${group}`;
  }

  private pendingKey(stream: string, group: string, id: string): string {
    return `${stream}\0${group}\0${id}`;
  }

  xAdd(stream: string, fields: Record<string, string>): string {
    const list = this.streams.get(stream) ?? [];
    const id = `${Date.now()}-${++this.seq}`;
    list.push({ id, fields });
    this.streams.set(stream, list);
    return id;
  }

  async xRange(stream: string, start = '-', end = '+'): Promise<StreamEntry[]> {
    void start;
    void end;
    return [...(this.streams.get(stream) ?? [])];
  }

  async xReadAfter(stream: string, lastId: string, count = 100): Promise<StreamEntry[]> {
    const list = this.streams.get(stream) ?? [];
    if (!lastId || lastId === '0') return list.slice(0, count);
    const idx = list.findIndex(e => e.id === lastId);
    const startAt = idx < 0 ? 0 : idx + 1;
    return list.slice(startAt, startAt + count);
  }

  async xGroupCreate(stream: string, group: string, id = '0', mkStream = false): Promise<void> {
    if (!this.streams.has(stream) && mkStream) {
      this.streams.set(stream, []);
    }
    const gk = this.groupKey(stream, group);
    if (this.groupStartIndex.has(gk)) return;

    const list = this.streams.get(stream) ?? [];
    const startIndex = id === '$' ? list.length : 0;
    this.groupStartIndex.set(gk, startIndex);
    this.groupReadIndex.set(gk, startIndex);
  }

  async xReadGroup(stream: string, group: string, consumer: string, count = 100): Promise<StreamEntry[]> {
    void consumer;
    const gk = this.groupKey(stream, group);
    if (!this.groupStartIndex.has(gk)) {
      await this.xGroupCreate(stream, group, '0', true);
    }

    const list = this.streams.get(stream) ?? [];
    let idx = this.groupReadIndex.get(gk) ?? 0;
    const delivered: StreamEntry[] = [];

    const now = Date.now();
    while (delivered.length < count && idx < list.length) {
      const entry = list[idx++];
      delivered.push(entry);
      this.pending.set(this.pendingKey(stream, group, entry.id), {
        entry,
        consumer,
        claimedAt: now,
      });
    }
    this.groupReadIndex.set(gk, idx);
    return delivered;
  }

  async xAck(stream: string, group: string, ...ids: string[]): Promise<number> {
    let acked = 0;
    for (const id of ids) {
      if (this.pending.delete(this.pendingKey(stream, group, id))) acked++;
    }
    return acked;
  }

  async xPendingCount(stream: string, group: string): Promise<number> {
    const prefix = `${stream}\0${group}\0`;
    let count = 0;
    for (const key of this.pending.keys()) {
      if (key.startsWith(prefix)) count++;
    }
    return count;
  }

  async xAutoClaim(
    stream: string,
    group: string,
    consumer: string,
    minIdleMs: number,
    startId = '0-0',
    count = 100,
  ): Promise<{ entries: StreamEntry[]; nextStart: string }> {
    const prefix = `${stream}\0${group}\0`;
    const now = Date.now();
    const candidates: { id: string; entry: StreamEntry }[] = [];

    for (const [key, meta] of this.pending) {
      if (!key.startsWith(prefix)) continue;
      const id = key.slice(prefix.length);
      if (startId !== '0-0' && id <= startId) continue;
      if (now - meta.claimedAt < minIdleMs) continue;
      candidates.push({ id, entry: meta.entry });
    }

    candidates.sort((a, b) => a.id.localeCompare(b.id));

    const entries: StreamEntry[] = [];
    let nextStart = '0-0';

    for (const candidate of candidates) {
      if (entries.length >= count) {
        nextStart = candidate.id;
        break;
      }
      this.pending.set(this.pendingKey(stream, group, candidate.id), {
        entry: candidate.entry,
        consumer,
        claimedAt: now,
      });
      entries.push(candidate.entry);
    }

    if (entries.length > 0 && entries.length >= count && nextStart === '0-0') {
      nextStart = entries[entries.length - 1].id;
    }

    return { entries, nextStart };
  }
}

/**
 * Redis Streams backed bus: XADD on enqueue, local priority mirror for sync drain.
 * Redis Streams 버스: enqueue 시 XADD, 동기 drain은 로컬 미러 사용
 */
export class RedisStreamsSignalBus implements SignalBusAdapter {
  private local = new InMemorySignalBus();
  private seq = 0;

  constructor(
    private client: RedisStreamsClient,
    private stream = 'cell:signals',
  ) {}

  enqueue(message: BusMessage): void {
    const item: BusMessage = {
      ...message,
      signal: freezeSignal(message.signal),
      seq: message.seq ?? ++this.seq,
    };
    void Promise.resolve(
      this.client.xAdd(this.stream, {
        payload: JSON.stringify(item),
        priority: item.priority,
        type: item.signal.type,
      }),
    );
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

export function parseBusMessage(raw: string): BusMessage | undefined {
  try {
    return JSON.parse(raw) as BusMessage;
  } catch {
    return undefined;
  }
}

export function priorityFromFields(fields: Record<string, string>): SignalPriority {
  const p = fields.priority as SignalPriority | undefined;
  return p ?? 'normal';
}

export function sortStreamEntries(entries: StreamEntry[]): BusMessage[] {
  const messages: BusMessage[] = [];
  for (const entry of entries) {
    const raw = entry.fields.payload;
    if (!raw) continue;
    const msg = parseBusMessage(raw);
    if (msg) messages.push(msg);
  }
  messages.sort((a, b) => {
    const dr = priorityRank(a.priority) - priorityRank(b.priority);
    return dr !== 0 ? dr : a.seq - b.seq;
  });
  return messages;
}

export type { SignalInstance };
